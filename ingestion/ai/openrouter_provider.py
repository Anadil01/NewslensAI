import json
import os

from config.settings import OPENROUTER_API_KEY
from typing import Any

from .provider import AIProvider


class OpenRouterProvider(AIProvider):

    def __init__(self):

        self.api_key = OPENROUTER_API_KEY

        if not self.api_key:
            raise ValueError(
                "OPENROUTER_API_KEY is not configured"
            )

        self.base_url = os.getenv(
            "OPENROUTER_BASE_URL",
            "https://openrouter.ai/api/v1",
        )

        self.model = os.getenv(
            "AI_MODEL",
            "nvidia/nemotron-3-super-120b-a12b:free",
        )

        # Import only when the AI provider is instantiated. This keeps other
        # ingestion stages usable in environments that do not need OpenAI.
        from openai import OpenAI

        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

    def generate_summary(
        self,
        article_text: str,
    ) -> dict[str, Any]:

        response = self.client.chat.completions.create(
            model=self.model,

            messages=[
                {
                    "role": "system",
                    "content": """
You are a professional news summarization assistant.

Analyze the provided news article.

Return ONLY valid JSON.

Required structure:

{
    "summary": "Concise factual summary under 100 words.",
    "keyPoints": [
        "Important point 1",
        "Important point 2",
        "Important point 3"
    ],
    "whyItMatters": "Why this development matters, or null when the article does not support one.",
    "whatNext": "What to watch next, or null when the article does not support one.",
    "entities": [
        "Important person, organization, place or event"
    ],
    "confidence": 0.0
}

Rules:

1. Do not invent facts.
2. Use only information present in the article.
3. Keep the summary neutral and factual.
4. keyPoints must contain up to three distinct, factual points from the article.
5. whyItMatters and whatNext must be null when the article does not support them.
6. Do not include markdown.
7. confidence must be between 0 and 1.
8. Return valid JSON only.
9. Do not return explanations outside the JSON.
10. Do not return <think> tags.
11. Do not wrap the JSON in markdown code fences.
12. Make sure all JSON strings are properly escaped.
13. Always close every JSON object and array.
14. Do not truncate the response.
""",
                },
                {
                    "role": "user",
                    "content": article_text,
                },
            ],

            temperature=0.1,

            max_tokens=800,

            response_format={
                "type": "json_object"
            },
        )

        content = response.choices[0].message.content

        if not content:
            raise ValueError(
                "OpenRouter returned an empty response"
            )

        return self._parse_response(content)

    @staticmethod
    def _parse_response(
        content: str,
    ) -> dict[str, Any]:

        if not content:
            raise ValueError(
                "OpenRouter returned an empty response"
            )

        content = content.strip()

        # -----------------------------------------
        # Remove possible <think>...</think>
        # -----------------------------------------

        if "<think>" in content:

            think_end = content.find("</think>")

            if think_end != -1:

                content = content[
                    think_end + len("</think>"):
                ].strip()

        # -----------------------------------------
        # Remove markdown code fences
        # -----------------------------------------

        if content.startswith("```"):

            lines = content.splitlines()

            if lines:
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            content = "\n".join(lines).strip()

        # -----------------------------------------
        # Parse JSON
        # -----------------------------------------

        try:

            result = json.loads(content)

        except json.JSONDecodeError:

            # -------------------------------------
            # Try to find JSON inside response
            # -------------------------------------

            start = content.find("{")
            end = content.rfind("}")

            if (
                start == -1
                or end == -1
                or end <= start
            ):
                raise ValueError(
                    "OpenRouter returned invalid JSON"
                )

            json_content = content[
                start:end + 1
            ]

            try:

                result = json.loads(
                    json_content
                )

            except json.JSONDecodeError as exc:

                raise ValueError(
                    "OpenRouter returned invalid JSON"
                ) from exc

        # -----------------------------------------
        # Make sure result is a JSON object
        # -----------------------------------------

        if not isinstance(result, dict):

            raise ValueError(
                "OpenRouter JSON response must "
                "be an object"
            )

        # -----------------------------------------
        # Validate summary
        # -----------------------------------------

        summary = result.get(
            "summary",
            ""
        )

        if not isinstance(summary, str):

            summary = str(summary)

        summary = summary.strip()

        if not summary:

            raise ValueError(
                "AI response does not contain "
                "a valid summary"
            )

        # -----------------------------------------
        # Validate key points
        # -----------------------------------------

        key_points = result.get(
            "keyPoints",
            []
        )

        if not isinstance(
            key_points,
            list
        ):
            key_points = []

        key_points = [
            str(point).strip()
            for point in key_points
            if point is not None
        ]

        def optional_text(field_name):
            value = result.get(field_name)

            if value is None:
                return None

            if not isinstance(value, str):
                raise ValueError(
                    f"AI response field {field_name} must be a string or null"
                )

            return value.strip() or None

        why_it_matters = optional_text("whyItMatters")
        what_next = optional_text("whatNext")

        # -----------------------------------------
        # Validate entities
        # -----------------------------------------

        entities = result.get(
            "entities",
            []
        )

        if not isinstance(
            entities,
            list
        ):
            entities = []

        entities = [
            str(entity).strip()
            for entity in entities
            if entity is not None
        ]

        # -----------------------------------------
        # Validate confidence
        # -----------------------------------------

        confidence = result.get(
            "confidence"
        )

        if confidence is not None:

            try:

                confidence = float(
                    confidence
                )

                confidence = max(
                    0.0,
                    min(1.0, confidence)
                )

            except (
                TypeError,
                ValueError
            ):

                confidence = None

        # -----------------------------------------
        # Return normalized response
        # -----------------------------------------

        return {
            "summary": summary,
            "keyPoints": key_points,
            "whyItMatters": why_it_matters,
            "whatNext": what_next,
            "entities": entities,
            "confidence": confidence,
        }
