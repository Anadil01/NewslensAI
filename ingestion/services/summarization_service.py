import os
import re
import time

from ai.router import get_ai_provider
from ai.summarizer import ExtractiveSummarizer
from persistence.database import get_connection
from persistence.story_repository import update_story_reading_time
from persistence.summary_repository import (
    save_summary,
    get_summary_for_story,
)

MAX_ARTICLE_CHARS = 8000
MAX_RETRIES = 2
INITIAL_RETRY_DELAY = 1
MAX_RETRY_DELAY = 8

AI_REQUEST_DELAY = float(os.getenv("AI_REQUEST_DELAY", "5.0"))
AI_MODEL = os.getenv("AI_MODEL", "gemini-3.6-flash")
AI_VERSION = "v2"

SUPPORTED_LANGUAGES = ["en", "hi", "hinglish"]

def get_stories_needing_summary(limit=10, model=None, version=None):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT s.id, s.title, s.content
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
            (model, version, limit),
        )
        return [{"id": str(row[0]), "title": row[1], "content": row[2]} for row in cursor.fetchall()]
    finally:
        connection.close()

def get_stories_by_ids(story_ids):
    if not story_ids:
        return []
    connection = get_connection()
    try:
        cursor = connection.cursor()
        placeholders = ", ".join(["%s"] * len(story_ids))
        cursor.execute(
            f"""
            SELECT s.id, s.title, s.content
            FROM stories s
            WHERE s.id IN ({placeholders})
              AND s.content IS NOT NULL
              AND s.content != ''
            ORDER BY s.created_at ASC
            """,
            tuple(story_ids),
        )
        return [{"id": str(row[0]), "title": row[1], "content": row[2]} for row in cursor.fetchall()]
    finally:
        connection.close()

def clean_article_text(text):
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def build_article_text(title, content):
    content = clean_article_text(content)[:MAX_ARTICLE_CHARS]
    return f"Title:\n{title or ''}\n\nArticle:\n{content}".strip()

def validate_ai_result(result):
    if not isinstance(result, dict):
        raise ValueError("AI response must be a dictionary")

    summary = result.get("whatHappened") or result.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        raise ValueError("AI summary cannot be empty")

    key_points = result.get("keyPoints", [])
    if not isinstance(key_points, list):
        raise ValueError("keyPoints must be a list")

    entities = result.get("entities", [])
    if not isinstance(entities, list):
        raise ValueError("entities must be a list")

    confidence = result.get("confidence")
    if confidence is not None:
        try:
            confidence = float(confidence)
            if not 0 <= confidence <= 1:
                raise ValueError()
        except (TypeError, ValueError):
            raise ValueError("confidence must be a number between 0 and 1")

    try:
        reading_time = int(result.get("readingTimeSeconds", 35))
    except (TypeError, ValueError):
        reading_time = 35

    key_points = [str(p).strip() for p in key_points if str(p).strip()][:3]
    entities = [str(e).strip() for e in entities if str(e).strip()][:8]

    why_it_matters = result.get("whyItMatters")
    what_next = result.get("whatNext")

    for name, val in (("whyItMatters", why_it_matters), ("whatNext", what_next)):
        if val is not None and not isinstance(val, str):
            raise ValueError(f"{name} must be a string or null")

    return {
        "summary": summary.strip(),
        "keyPoints": key_points,
        "whyItMatters": why_it_matters.strip() if why_it_matters else None,
        "whatNext": what_next.strip() if what_next else None,
        "entities": entities,
        "confidence": confidence,
        "readingTimeSeconds": reading_time,
    }

def generate_with_retry(provider, article_text, language="en"):
    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            result = provider.generate_summary(article_text, language)
            return validate_ai_result(result)
        except Exception as error:
            last_error = error
            if attempt >= MAX_RETRIES:
                break
            delay = min(INITIAL_RETRY_DELAY * (2 ** attempt), MAX_RETRY_DELAY)
            print(f"Retrying AI request in {delay}s...")
            time.sleep(delay)
    raise last_error

def generate_fallback_summary(title, content):
    fallback = ExtractiveSummarizer()
    text = clean_article_text(content)
    summary = fallback.summarize(text)
    if not summary:
        summary = title or "No summary available."
    return {
        "summary": summary,
        "keyPoints": [],
        "whyItMatters": None,
        "whatNext": None,
        "entities": [],
        "confidence": 0.4,
        "readingTimeSeconds": max(10, len(text) // 15),
    }

def summarize_stories(limit=10, story_ids=None, summarizer=None, model=None, version=None):
    if model is None: model = AI_MODEL
    if version is None: version = AI_VERSION
    if summarizer is None: summarizer = get_ai_provider()

    # The English version acts as the base completion marker to prevent
    # re-summarizing incomplete batches continuously.
    base_version = f"{version}:en"

    if story_ids:
        stories = get_stories_by_ids(story_ids)
    else:
        stories = get_stories_needing_summary(limit=limit, model=model, version=base_version)

    results = []
    processed_story_ids = set()

    for story in stories:
        if story["id"] in processed_story_ids:
            continue
        processed_story_ids.add(story["id"])

        story_id = story["id"]
        title = story["title"]
        content = story["content"]
        article_text = build_article_text(title, content)

        # Iterate over all supported languages for each story
        for lang in SUPPORTED_LANGUAGES:
            lang_version = f"{version}:{lang}"
            existing_summary = get_summary_for_story(story_id, model, lang_version)

            if existing_summary:
                print(f"[{lang.upper()}] Using cached summary: {title}")
                results.append({"story_id": story_id, "success": True, "cached": True})
                continue

            print(f"[{lang.upper()}] Summarizing: {title}")
            used_fallback = False

            try:
                time.sleep(AI_REQUEST_DELAY)
                ai_result = generate_with_retry(summarizer, article_text, language=lang)
            except Exception as error:
                print(f"[{lang.upper()}] AI failed: {error}")
                # Fallbacks are English only, so avoid saving gibberish over a requested Hindi slot if possible,
                # but ensure something saves to satisfy the pipeline block.
                try:
                    ai_result = generate_fallback_summary(title, content)
                    used_fallback = True
                    model_used = "extractive-fallback"
                except Exception as fallback_error:
                    results.append({"story_id": story_id, "success": False, "error": str(fallback_error)})
                    continue

            if not used_fallback:
                model_used = model

            try:
                save_summary(
                    story_id=story_id,
                    summary=ai_result["summary"],
                    model=model_used,
                    version=lang_version,
                    entities=ai_result["entities"],
                    key_points=ai_result["keyPoints"],
                    why_it_matters=ai_result["whyItMatters"],
                    what_next=ai_result["whatNext"],
                )
                
                # Only update reading time once per story (e.g. during English pass) to avoid DB lock contention
                if lang == "en":
                    update_story_reading_time(story_id, ai_result["readingTimeSeconds"])

                results.append({"story_id": story_id, "success": True, "language": lang})
            except Exception as error:
                results.append({"story_id": story_id, "success": False, "error": str(error)})
                print(f"Database save failed: {error}")

    return results