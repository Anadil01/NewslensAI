import json
import os
from typing import Any
from .provider import AIProvider

class GeminiProvider(AIProvider):
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in backend/.env")

        self.model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

        from openai import OpenAI
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )

    def generate_summary(self, article_text: str, language: str = "en") -> dict[str, Any]:
        lang_map = {
            "en": "English",
            "hi": "Hindi (written in Devanagari script)",
            "hinglish": "Hinglish (conversational Hindi written in Latin/English characters, like texting a friend)"
        }
        target_lang = lang_map.get(language, "English")

        system_instruction = f"""
You are a professional news editor assistant for NewsLensAI.
Analyze the provided news article and output strict JSON matching this exact structure:
{{
    "whatHappened": "Concise, factual summary under 60 words explaining what happened.",
    "keyPoints": [
        "First key takeaway (10-20 words)",
        "Second key takeaway (10-20 words)",
        "Third key takeaway (10-20 words)"
    ],
    "whyItMatters": "1-2 sentences on why this story is significant, or null if self-evident.",
    "readingTimeSeconds": 35,
    "entities": ["Organization", "Person", "Location"],
    "confidence": 0.95
}}

Rules:
1. Stay strictly neutral and factual. No editorial bias or speculation.
2. keyPoints must have between 2 and 4 items.
3. Calculate realistic readingTimeSeconds.
4. Return pure JSON only. No markdown formatting, no code blocks.
5. CRITICAL: The values for whatHappened, keyPoints, and whyItMatters MUST be written in {target_lang}. The JSON keys MUST remain in English.
"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": article_text[:8000]}
            ],
            temperature=0.1,
            # BUMPED TO 2000 to prevent Hindi/Hinglish truncation
            max_tokens=2000,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Gemini returned an empty response")

        return self._parse_json(content)

    @staticmethod
    def _parse_json(content: str) -> dict[str, Any]:
        # Bulletproof JSON extraction: find the first { and last }
        start = content.find("{")
        end = content.rfind("}")
        
        if start != -1 and end != -1 and end >= start:
            clean_json = content[start:end+1]
        else:
            clean_json = content

        try:
            data = json.loads(clean_json)
        except json.JSONDecodeError as e:
            print(f"DEBUG - Raw AI Output:\n{content}")
            raise ValueError(f"Failed to parse JSON: {e}")
        
        summary = data.get("whatHappened") or data.get("summary") or ""
        return {
            "summary": summary.strip(),
            "whatHappened": summary.strip(),
            "keyPoints": [str(k).strip() for k in data.get("keyPoints", []) if k][:4],
            "whyItMatters": data.get("whyItMatters"),
            "readingTimeSeconds": int(data.get("readingTimeSeconds") or 35),
            "entities": [str(e).strip() for e in data.get("entities", []) if e][:8],
            "confidence": float(data.get("confidence", 0.9))
        }