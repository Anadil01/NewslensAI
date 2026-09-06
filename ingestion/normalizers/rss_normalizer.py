import hashlib


def normalize_rss_article(article, source_name):
    """Normalize RSS and Atom entries to the ingestion article contract."""

    url = article.get("url")

    return {
        "external_id": (
            hashlib.sha256(url.encode()).hexdigest()
            if url
            else None
        ),
        "source": source_name,
        "title": article.get("title"),
        "author": article.get("author"),
        "canonical_url": url,
        "content": None,
        "excerpt": article.get("excerpt"),
        "image_url": article.get("image_url"),
        "points": None,
        "published_at": article.get("published_at"),
    }
