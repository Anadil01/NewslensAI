import os
import re
import time

from ai.router import get_ai_provider
from ai.summarizer import ExtractiveSummarizer
from persistence.database import get_connection
from persistence.summary_repository import (
    save_summary,
    get_summary_for_story,
)


MAX_ARTICLE_CHARS = 8000

MAX_RETRIES = 2
INITIAL_RETRY_DELAY = 1
MAX_RETRY_DELAY = 8

AI_REQUEST_DELAY = float(
    os.getenv(
        "AI_REQUEST_DELAY",
        "1.0",
    )
)

AI_MODEL = os.getenv(
    "AI_MODEL",
    "nvidia/nemotron-3-super-120b-a12b:free",
)

AI_VERSION = "v2"


def get_stories_needing_summary(
    limit=10,
    model=None,
    version=None,
):
    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                s.id,
                s.title,
                s.content
            FROM stories s
            WHERE s.content IS NOT NULL
              AND s.content != ''
              AND NOT EXISTS (
                  SELECT 1
                  FROM ai_summaries a
                  WHERE a.story_id = s.id
                    AND a.model = %s
                    AND a.version = %s
              )
            ORDER BY s.created_at ASC
            LIMIT %s
            """,
            (
                model,
                version,
                limit,
            ),
        )

        rows = cursor.fetchall()

        return [
            {
                "id": str(row[0]),
                "title": row[1],
                "content": row[2],
            }
            for row in rows
        ]

    finally:

        connection.close()


def get_stories_by_ids(story_ids):

    if not story_ids:
        return []

    connection = get_connection()

    try:

        cursor = connection.cursor()

        placeholders = ", ".join(
            ["%s"] * len(story_ids)
        )

        cursor.execute(
            f"""
            SELECT
                s.id,
                s.title,
                s.content
            FROM stories s
            WHERE s.id IN ({placeholders})
              AND s.content IS NOT NULL
              AND s.content != ''
            ORDER BY s.created_at ASC
            """,
            tuple(story_ids),
        )

        rows = cursor.fetchall()

        return [
            {
                "id": str(row[0]),
                "title": row[1],
                "content": row[2],
            }
            for row in rows
        ]

    finally:

        connection.close()


def clean_article_text(text):

    if not text:
        return ""

    # Remove HTML.
    text = re.sub(
        r"<[^>]+>",
        " ",
        text,
    )

    # Normalize whitespace.
    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


def build_article_text(
    title,
    content,
):

    content = clean_article_text(
        content
    )

    # Keep AI input bounded.
    content = content[
        :MAX_ARTICLE_CHARS
    ]

    return f"""
Title:
{title or ""}

Article:
{content}
""".strip()


def validate_ai_result(result):

    if not isinstance(
        result,
        dict,
    ):

        raise ValueError(
            "AI response must be a dictionary"
        )

    summary = result.get(
        "summary"
    )

    if not isinstance(
        summary,
        str,
    ):

        raise ValueError(
            "AI summary must be a string"
        )

    summary = summary.strip()

    if not summary:

        raise ValueError(
            "AI summary cannot be empty"
        )

    key_points = result.get(
        "keyPoints",
        [],
    )

    if not isinstance(
        key_points,
        list,
    ):

        raise ValueError(
            "keyPoints must be a list"
        )

    entities = result.get(
        "entities",
        [],
    )

    if not isinstance(
        entities,
        list,
    ):

        raise ValueError(
            "entities must be a list"
        )

    confidence = result.get(
        "confidence"
    )

    if confidence is not None:

        try:

            confidence = float(
                confidence
            )

        except (
            TypeError,
            ValueError,
        ):

            raise ValueError(
                "confidence must be a number"
            )

        if not 0 <= confidence <= 1:

            raise ValueError(
                "confidence must be between 0 and 1"
            )

    # Enforce our application contract.
    key_points = [
        str(point).strip()
        for point in key_points
        if str(point).strip()
    ][:3]

    entities = [
        str(entity).strip()
        for entity in entities
        if str(entity).strip()
    ][:8]

    why_it_matters = result.get("whyItMatters")
    what_next = result.get("whatNext")

    for field_name, value in (
        ("whyItMatters", why_it_matters),
        ("whatNext", what_next),
    ):
        if value is not None and not isinstance(value, str):
            raise ValueError(f"{field_name} must be a string or null")

    why_it_matters = why_it_matters.strip() if why_it_matters else None
    what_next = what_next.strip() if what_next else None

    return {
        "summary": summary,
        "keyPoints": key_points,
        "whyItMatters": why_it_matters,
        "whatNext": what_next,
        "entities": entities,
        "confidence": confidence,
    }


def generate_with_retry(
    provider,
    article_text,
):
    last_error = None

    for attempt in range(
        MAX_RETRIES + 1
    ):

        try:

            result = provider.generate_summary(
                article_text
            )

            return validate_ai_result(
                result
            )

        except Exception as error:

            last_error = error

            attempt_number = attempt + 1

            print(
                f"AI attempt "
                f"{attempt_number}/"
                f"{MAX_RETRIES + 1} failed: "
                f"{error}"
            )

            # No more retries.
            if attempt >= MAX_RETRIES:
                break

            # Exponential backoff:
            # 1s → 2s → 4s ...
            delay = min(
                INITIAL_RETRY_DELAY
                * (2 ** attempt),
                MAX_RETRY_DELAY,
            )

            print(
                f"Retrying AI request "
                f"in {delay}s..."
            )

            time.sleep(
                delay
            )

    raise last_error


def generate_fallback_summary(
    title,
    content,
):
    """
    Local fallback.

    This does not call an external AI API.
    """

    fallback = ExtractiveSummarizer()

    text = clean_article_text(
        content
    )

    summary = fallback.summarize(
        text
    )

    if not summary:

        summary = (
            title
            or "No summary available."
        )

    return {
        "summary": summary,
        "keyPoints": [],
        "whyItMatters": None,
        "whatNext": None,
        "entities": [],
        "confidence": 0.4,
    }


def summarize_stories(
    limit=10,
    story_ids=None,
    summarizer=None,
    model=None,
    version=None,
):
    """
    Generate and persist summaries.

    Primary:
        OpenRouter / Nemotron

    Fallback:
        Local ExtractiveSummarizer

    Cache:
        PostgreSQL ai_summaries
    """

    if model is None:
        model = AI_MODEL

    if version is None:
        version = AI_VERSION

    # ---------------------------------------------
    # AI provider
    # ---------------------------------------------

    if summarizer is None:
        summarizer = get_ai_provider()

    # ---------------------------------------------
    # Fetch stories
    # ---------------------------------------------

    if story_ids:

        stories = get_stories_by_ids(
            story_ids
        )

    else:

        stories = get_stories_needing_summary(
            limit=limit,
            model=model,
            version=version,
        )

    results = []

    # ---------------------------------------------
    # In-memory batch cache
    # ---------------------------------------------

    processed_story_ids = set()

    # ---------------------------------------------
    # Process stories
    # ---------------------------------------------

    for story in stories:

        if story["id"] in processed_story_ids:

            print(
                f"Skipping duplicate story: "
                f"{story['id']}"
            )

            continue

        processed_story_ids.add(
            story["id"]
        )

        story_id = story["id"]
        title = story["title"]
        content = story["content"]

        # -----------------------------------------
        # Check PostgreSQL cache
        # -----------------------------------------

        existing_summary = get_summary_for_story(
            story_id,
            model,
            version,
        )

        if existing_summary:

            print(
                f"Using cached summary: {title}"
            )

            results.append(
                {
                    "story_id": story_id,
                    "success": True,
                    "cached": True,
                    "characters": len(
                        existing_summary["summary"]
                    ),
                    "summary_id": (
                        existing_summary[
                            "summary_id"
                        ]
                    ),
                    "model": (
                        existing_summary[
                            "model"
                        ]
                    ),
                    "version": (
                        existing_summary[
                            "version"
                        ]
                    ),
                    "summary": (
                        existing_summary[
                            "summary"
                        ]
                    ),
                    "entities": (
                        existing_summary.get(
                            "entities",
                            [],
                        )
                    ),
                    "key_points": (
                        existing_summary.get("key_points", [])
                    ),
                    "why_it_matters": (
                        existing_summary.get("why_it_matters")
                    ),
                    "what_next": (
                        existing_summary.get("what_next")
                    ),
                }
            )

            continue

        print(
            f"Summarizing: {title}"
        )

        article_text = build_article_text(
            title,
            content,
        )

        used_fallback = False

        # -----------------------------------------
        # Primary AI
        # -----------------------------------------

        try:

            # Small throttle before AI request.
            time.sleep(
                AI_REQUEST_DELAY
            )

            ai_result = generate_with_retry(
                summarizer,
                article_text,
            )

        except Exception as error:

            print(
                f"AI failed after retries: "
                f"{error}"
            )

            print(
                "Using local extractive "
                "fallback."
            )

            # -------------------------------------
            # Local fallback
            # -------------------------------------

            try:

                ai_result = (
                    generate_fallback_summary(
                        title,
                        content,
                    )
                )

                used_fallback = True

                model_used = (
                    "extractive-fallback"
                )

            except Exception as fallback_error:

                print(
                    f"Fallback failed: "
                    f"{fallback_error}"
                )

                results.append(
                    {
                        "story_id": story_id,
                        "success": False,
                        "cached": False,
                        "characters": 0,
                        "error": str(
                            fallback_error
                        ),
                    }
                )

                continue

        if not used_fallback:

            model_used = model

        # -----------------------------------------
        # Persist
        # -----------------------------------------

        try:

            saved = save_summary(
                story_id=story_id,
                summary=ai_result["summary"],
                model=model_used,
                version=version,
                entities=ai_result["entities"],
                key_points=ai_result["keyPoints"],
                why_it_matters=ai_result["whyItMatters"],
                what_next=ai_result["whatNext"],
            )

            results.append(
                {
                    "story_id": story_id,
                    "success": True,
                    "cached": False,
                    "characters": len(
                        ai_result["summary"]
                    ),
                    "action": (
                        saved["action"]
                    ),
                    "summary_id": (
                        saved["summary_id"]
                    ),
                    "model": model_used,
                    "version": version,
                    "key_points": (
                        ai_result["keyPoints"]
                    ),
                    "why_it_matters": (
                        ai_result["whyItMatters"]
                    ),
                    "what_next": (
                        ai_result["whatNext"]
                    ),
                    "entities": (
                        ai_result["entities"]
                    ),
                    "confidence": (
                        ai_result["confidence"]
                    ),
                    "fallback": used_fallback,
                    "summary": (
                        ai_result["summary"]
                    ),
                }
            )

            print(
                f"Success: "
                f"{len(ai_result['summary'])} "
                f"characters"
            )

            if used_fallback:

                print(
                    "Source: local fallback"
                )

        except Exception as error:

            results.append(
                {
                    "story_id": story_id,
                    "success": False,
                    "cached": False,
                    "characters": 0,
                    "error": str(error),
                }
            )

            print(
                f"Database save failed: "
                f"{error}"
            )

    return results
