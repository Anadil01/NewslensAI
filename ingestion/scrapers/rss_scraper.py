from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree

import requests

from normalizers.rss_normalizer import normalize_rss_article


USER_AGENT = "NewsLensAI Bot/1.0 (+https://newslens.ai)"

MEDIA_NAMESPACES = {
    "media": "http://search.yahoo.com/mrss/",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
}


def _text(element, *names):
    for name in names:
        child = element.find(name)

        if child is not None and child.text:
            return child.text.strip()

    return None


def _parse_date(value):
    if not value:
        return None

    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc)
    except (TypeError, ValueError):
        try:
            return datetime.fromisoformat(
                value.replace("Z", "+00:00")
            ).astimezone(timezone.utc)
        except ValueError:
            return None


def _extract_image_url(entry):
    """
    Extract the best available image URL from an RSS/Atom entry.

    Different publishers expose images differently, so we check the
    most common RSS, Media RSS, Atom and enclosure patterns.
    """

    # ---------------------------------------------------------
    # 1. Media RSS
    # ---------------------------------------------------------

    media_content = entry.find(
        "media:content",
        MEDIA_NAMESPACES,
    )

    if media_content is not None:
        url = media_content.get("url")

        if url:
            return url.strip()

    media_thumbnail = entry.find(
        "media:thumbnail",
        MEDIA_NAMESPACES,
    )

    if media_thumbnail is not None:
        url = media_thumbnail.get("url")

        if url:
            return url.strip()

    # ---------------------------------------------------------
    # 2. RSS enclosure
    # ---------------------------------------------------------

    enclosure = entry.find("enclosure")

    if enclosure is not None:
        enclosure_url = enclosure.get("url")
        enclosure_type = enclosure.get("type", "")

        if enclosure_url and enclosure_type.startswith("image/"):
            return enclosure_url.strip()

        # Some feeds don't provide a MIME type.
        # If the URL clearly looks like an image, accept it.
        if enclosure_url:
            lowered = enclosure_url.lower()

            if lowered.endswith(
                (
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".webp",
                    ".gif",
                )
            ):
                return enclosure_url.strip()

    # ---------------------------------------------------------
    # 3. Atom link rel="enclosure"
    # ---------------------------------------------------------

    atom_enclosure = entry.find(
        "{http://www.w3.org/2005/Atom}link[@rel='enclosure']"
    )

    if atom_enclosure is not None:
        enclosure_url = atom_enclosure.get("href")
        enclosure_type = atom_enclosure.get("type", "")

        if enclosure_url and (
            enclosure_type.startswith("image/")
            or not enclosure_type
        ):
            return enclosure_url.strip()

    # ---------------------------------------------------------
    # 4. Dublin Core / custom image fields
    # ---------------------------------------------------------

    for name in (
        "image",
        "imageUrl",
        "image_url",
        "thumbnail",
        "thumbnailUrl",
        "thumbnail_url",
    ):
        value = _text(entry, name)

        if value:
            return value

    # ---------------------------------------------------------
    # 5. Image URL attributes used by some feeds
    # ---------------------------------------------------------

    for child_name in (
        "image",
        "thumbnail",
    ):
        child = entry.find(child_name)

        if child is not None:
            for attribute in ("url", "href", "src"):
                value = child.get(attribute)

                if value:
                    return value.strip()

    # ---------------------------------------------------------
    # 6. Media RSS description/content nodes
    # ---------------------------------------------------------

    for namespace in (
        MEDIA_NAMESPACES["media"],
        MEDIA_NAMESPACES["content"],
    ):
        for tag in ("content", "thumbnail", "image"):
            child = entry.find(f"{{{namespace}}}{tag}")

            if child is not None:
                url = (
                    child.get("url")
                    or child.get("href")
                    or child.get("src")
                )

                if url:
                    return url.strip()

    return None


def scrape_rss_feed(feed_url, source_name, limit=20):
    response = requests.get(
        feed_url,
        timeout=15,
        headers={"User-Agent": USER_AGENT},
    )

    response.raise_for_status()

    root = ElementTree.fromstring(response.content)

    entries = (
        root.findall(".//item")
        or root.findall(
            ".//{http://www.w3.org/2005/Atom}entry"
        )
    )

    articles = []

    for entry in entries[:limit]:

        atom_link = entry.find(
            "{http://www.w3.org/2005/Atom}link[@href]"
        )

        url = _text(
            entry,
            "link",
        ) or (
            atom_link.get("href")
            if atom_link is not None
            else None
        )

        image_url = _extract_image_url(entry)

        article = normalize_rss_article(
            {
                "title": _text(
                    entry,
                    "title",
                    "{http://www.w3.org/2005/Atom}title",
                ),
                "url": url,
                "author": _text(
                    entry,
                    "author",
                    "{http://purl.org/dc/elements/1.1/}creator",
                ),
                "excerpt": _text(
                    entry,
                    "description",
                    "{http://www.w3.org/2005/Atom}summary",
                ),
                "published_at": _parse_date(
                    _text(
                        entry,
                        "pubDate",
                        "{http://www.w3.org/2005/Atom}published",
                        "{http://www.w3.org/2005/Atom}updated",
                    )
                ),
                "image_url": image_url,
            },
            source_name,
        )

        articles.append(article)

    return articles
