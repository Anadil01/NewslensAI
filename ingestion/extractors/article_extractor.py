import requests
from urllib.parse import urljoin

from bs4 import BeautifulSoup


MIN_CONTENT_LENGTH = 1000


def extract_image_from_soup(soup, base_url=""):
    """Extract primary editorial image from OpenGraph, Twitter card, or schema tags."""
    # 1. OpenGraph image
    og_img = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
    if og_img and og_img.get("content"):
        url = og_img["content"].strip()
        if url.startswith("http"):
            return url

    # 2. Twitter Card image
    tw_img = soup.find("meta", property="twitter:image") or soup.find("meta", attrs={"name": "twitter:image"})
    if tw_img and tw_img.get("content"):
        url = tw_img["content"].strip()
        if url.startswith("http"):
            return url

    # 3. Main article figure image
    article_tag = soup.find("article")
    if article_tag:
        img = article_tag.find("img", src=True)
        if img and img.get("src") and img["src"].startswith("http"):
            return img["src"]

    return None


def extract_article_content(url):
    if not url:
        raise ValueError(
            "Article URL cannot be empty"
        )

    # --------------------------------
    # Normalize URL
    # --------------------------------
    # Hacker News sometimes provides
    # relative URLs such as:
    #
    # item?id=49330632
    #
    # Convert them into absolute URLs.
    # --------------------------------

    if not url.startswith(("http://", "https://")):

        url = urljoin(
            "https://news.ycombinator.com/",
            url
        )

    # --------------------------------
    # Fetch webpage
    # --------------------------------

    response = requests.get(
        url,
        timeout=10,
        headers={
            "User-Agent": "NewsLensAI Bot/1.0"
        }
    )

    response.raise_for_status()

    # --------------------------------
    # Parse HTML
    # --------------------------------

    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )

    # (Optional) We can extract the image here if we need to return it
    # image_url = extract_image_from_soup(soup, url)

    # --------------------------------
    # Remove obvious non-content
    # --------------------------------

    for element in soup(
        [
            "script",
            "style",
            "nav",
            "footer",
            "header",
            "aside",
            "form",
            "noscript",
            "iframe"
        ]
    ):
        element.decompose()

    # --------------------------------
    # Strategy 1: <article>
    # --------------------------------

    article = soup.find("article")

    if article:

        text = article.get_text(
            separator=" ",
            strip=True
        )

    else:

        text = ""

    # --------------------------------
    # Strategy 2:
    # Common article containers
    # --------------------------------

    if len(text) < MIN_CONTENT_LENGTH:

        selectors = [

            "[class*='article-body']",

            "[class*='article-content']",

            "[class*='article__body']",

            "[class*='post-content']",

            "[class*='entry-content']",

            "[class*='story-body']",

            "[class*='story-content']",

            "[itemprop='articleBody']"

        ]

        candidates = []

        for selector in selectors:

            elements = soup.select(
                selector
            )

            for element in elements:

                candidate = element.get_text(
                    separator=" ",
                    strip=True
                )

                if candidate:

                    candidates.append(
                        candidate
                    )

        if candidates:

            best_candidate = max(
                candidates,
                key=len
            )

            if len(best_candidate) > len(text):

                text = best_candidate

    # --------------------------------
    # Strategy 3:
    # Full page fallback
    # --------------------------------

    if len(text) < MIN_CONTENT_LENGTH:

        text = soup.get_text(
            separator=" ",
            strip=True
        )

    # --------------------------------
    # Normalize whitespace
    # --------------------------------

    text = " ".join(
        text.split()
    )

    # --------------------------------
    # Quality validation
    # --------------------------------

    if not text:

        raise ValueError(
            "Could not extract article content"
        )

    if len(text) < MIN_CONTENT_LENGTH:

        raise ValueError(
            f"Extracted content is too short "
            f"({len(text)} characters)"
        )

    return text