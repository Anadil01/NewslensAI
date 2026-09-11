import time
from extractors.article_extractor import (
    extract_article_content
)

from nlp.text_preprocessor import (
    preprocess_text
)

from persistence.story_repository import (
    get_stories_needing_content,
    update_story_content
)


def get_fallback_image(title):
    """Searches the web for a relevant image if the article doesn't provide one."""
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            # Search for the article title and grab the top image result
            results = list(ddgs.images(title, max_results=1))
            if results and len(results) > 0:
                return results[0].get("image")
    except Exception as e:
        print(f"    -> Fallback image search failed: {e}")
    return None


def extract_content_for_stories(limit=10):

    stories = get_stories_needing_content(
        limit
    )

    results = []

    for story in stories:

        story_id = story["id"]

        url = story["canonical_url"]

        title = story["title"]

        print(
            f"Extracting: {title}"
        )

        try:

            # Unpack both the raw text and the extracted image URL
            raw_content, image_url = extract_article_content(
                url
            )
            
            # If the website didn't have an image, search the web for one!
            if not image_url:
                print(f"    -> No image found on site. Searching web...")
                image_url = get_fallback_image(title)
                time.sleep(1) # Be polite to the search engine so we don't get blocked
            
            content = preprocess_text(
              raw_content
            )
            
            # Pass the image_url to the repository
            update_story_content(
                story_id,
                content,
                image_url
            )

            results.append({
                "story_id": story_id,
                "success": True,
                "characters": len(content)
            })

            print(
                f"    -> Success: {len(content)} characters. Image secured: {bool(image_url)}"
            )

        except Exception as error:

            results.append({
                "story_id": story_id,
                "success": False,
                "characters": 0,
                "error": str(error)
            })

            print(
                f"    -> Failed: {error}"
            )

    return results