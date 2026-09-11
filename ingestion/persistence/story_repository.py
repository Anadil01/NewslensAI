from datetime import datetime, timezone
import uuid

from persistence.database import get_connection
from clients.newsapi_client import NewsAPIClient


def get_or_create_source(
    name,
    slug,
    source_type,
    website_url=None,
    political_lean="UNKNOWN",
    reliability_score=None,
):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        # Check whether source already exists
        cursor.execute(
            """
            SELECT id
            FROM sources
            WHERE slug = %s
            """,
            (slug,)
        )

        existing = cursor.fetchone()

        if existing:
            # Existing source
            source_id = existing[0]

            cursor.execute(
                """
                UPDATE sources
                SET name = %s,
                    website_url = %s,
                    type = %s,
                    political_lean = %s,
                    reliability_score = %s,
                    is_active = TRUE,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (
                    name,
                    website_url,
                    source_type,
                    political_lean,
                    reliability_score,
                    source_id,
                )
            )

        else:
            # New source
            source_id = str(uuid.uuid4())

            cursor.execute(
                """
                INSERT INTO sources (
                    id,
                    name,
                    slug,
                    website_url,
                    type,
                    political_lean,
                    reliability_score,
                    is_active,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, TRUE, NOW(), NOW()
                )
                """,
                (
                    source_id,
                    name,
                    slug,
                    website_url,
                    source_type,
                    political_lean,
                    reliability_score,
                )
            )

        connection.commit()

        return str(source_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def save_story(source_id, story):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        # Check whether story already exists
        cursor.execute(
            """
            SELECT id
            FROM stories
            WHERE source_id = %s
              AND external_id = %s
            """,
            (
                source_id,
                story["external_id"]
            )
        )

        existing = cursor.fetchone()

        if existing:
            # Existing story
            story_id = existing[0]

            now = datetime.now(timezone.utc)

            cursor.execute(
                """
                UPDATE stories
                SET canonical_url = %s,
                    title = %s,
                    author = %s,
                    points = %s,
                    content = %s,
                    excerpt = %s,
                    image_url = %s,
                    published_at = %s,
                    updated_at = %s
                WHERE id = %s
                """,
                (
                    story.get("canonical_url"),
                    story.get("title"),
                    story.get("author"),
                    story.get("points"),
                    story.get("content"),
                    story.get("excerpt"),
                    story.get("image_url"),
                    story.get("published_at"),
                    now,
                    story_id,
                )
            )

            action = "updated"

        else:
            # New story
            story_id = str(uuid.uuid4())

            now = datetime.now(timezone.utc)

            cursor.execute(
                """
                INSERT INTO stories (
                    id,
                    source_id,
                    external_id,
                    canonical_url,
                    title,
                    author,
                    points,
                    content,
                    excerpt,
                    image_url,
                    content_status,
                    published_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s
                )
                """,
                (
                    story_id,
                    source_id,
                    story["external_id"],
                    story.get("canonical_url"),
                    story.get("title"),
                    story.get("author"),
                    story.get("points"),
                    story.get("content"),
                    story.get("excerpt"),
                    story.get("image_url"),
                    "EXTERNAL_ONLY",
                    story.get("published_at"),
                    now,
                    now,
                )
            )

            action = "inserted"

        connection.commit()

        return {
            "action": action,
            "story_id": str(story_id),
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def get_stories_needing_content(limit=10):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                canonical_url,
                title
            FROM stories
            WHERE canonical_url IS NOT NULL
              AND (
                  content IS NULL
                  OR content = ''
              )
            ORDER BY created_at ASC
            LIMIT %s
            """,
            (limit,)
        )

        rows = cursor.fetchall()

        stories = []

        for row in rows:
            stories.append(
                {
                    "id": str(row[0]),
                    "canonical_url": row[1],
                    "title": row[2],
                }
            )

        return stories

    finally:
        connection.close()


# ---------------------------------------------------------
# NewsAPI
# ---------------------------------------------------------

def scrape_newsapi():
    client = NewsAPIClient()

    return client.get_top_headlines(
        country="us",
        category="technology",
        page_size=10,
    )


newsapi_source = {
    "slug": "newsapi",
    "name": "NewsAPI",
    "website_url": "https://newsapi.org",
    "type": "API",
    "enabled": True,
    "scraper": scrape_newsapi,
}


# ---------------------------------------------------------
# Content Update
# ---------------------------------------------------------

def update_story_content(story_id, content, image_url=None):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE stories
            SET content = %s,
                content_status = %s,
                image_url = COALESCE(image_url, %s),
                updated_at = %s
            WHERE id = %s
            """,
            (
                content,
                "FULL",
                image_url,
                datetime.now(timezone.utc),
                story_id,
            )
        )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def update_story_reading_time(story_id, reading_time_seconds):
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            UPDATE stories
            SET reading_time_seconds = %s
            WHERE id = %s
            """,
            (reading_time_seconds, story_id)
        )
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()