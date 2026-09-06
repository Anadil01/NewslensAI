import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Clock3,
  ExternalLink,
  Globe2,
  Sparkles,
} from "lucide-react";

import { useStory } from "../hooks/useStories";
import { useAuth } from "../context/AuthContext";
import { useBookmarks, useToggleBookmark } from "../hooks/useBookmarks";

function formatDate(date) {
  if (!date) return "Recently";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getReadingTime(story) {
  const text = story?.content || story?.excerpt || story?.title || "";
  const words = text.trim().split(/\s+/).length;

  return Math.max(1, Math.ceil(words / 220));
}

function getSourceName(story) {
  return (
    story?.source?.name ||
    story?.source?.title ||
    story?.source?.displayName ||
    "News source"
  );
}

function getTopicName(story) {
  return (
    story?.topic?.name ||
    story?.topic?.title ||
    story?.topic ||
    "News"
  );
}

function getImageUrl(story) {
  return story?.imageUrl || story?.image_url || null;
}

function StoryImage({ story }) {
  const imageUrl = getImageUrl(story);

  if (!imageUrl) {
    return (
      <div className="flex aspect-[16/8] items-center justify-center bg-gradient-to-br from-signal/15 via-mint/10 to-transparent">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-stroke bg-card/80 shadow-sm">
            <Globe2 className="h-7 w-7 text-signal" />
          </div>

          <p className="text-sm font-semibold text-ink">
            NewsLensAI
          </p>

          <p className="mt-1 text-xs text-muted">
            Story intelligence
          </p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=""
      className="aspect-[16/8] w-full object-cover"
      loading="eager"
    />
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div>
      {eyebrow && (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-signal">
          {eyebrow}
        </p>
      )}

      <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        {title}
      </h2>
    </div>
  );
}

function AISummary({ story }) {
  const summary =
    story?.aiSummaries?.[0]?.summary ||
    story?.summary ||
    story?.excerpt ||
    "NewsLensAI does not have an AI brief for this story yet.";

  return (
    <section className="rounded-3xl border border-signal/15 bg-signal/[0.045] p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal/10">
          <Sparkles className="h-5 w-5 text-signal" />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">
            NewsLens brief
          </p>

          <p className="mt-0.5 text-xs text-muted">
            A faster way to understand the story
          </p>
        </div>
      </div>

      <p className="text-[15px] leading-7 text-ink sm:text-base sm:leading-8">
        {summary}
      </p>
    </section>
  );
}

function SourceCoverage({ story }) {
  const source = getSourceName(story);

  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Coverage"
        title="How this story is being covered"
      />

      <div className="rounded-2xl border border-stroke bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-signal/10">
            <Globe2 className="h-5 w-5 text-signal" />
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-ink">
              {source}
            </p>

            <p className="mt-1 text-sm leading-6 text-muted">
              This is one of the sources currently associated with this
              story. More source-level comparison will appear as coverage
              data becomes available.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PerspectiveSection({ story }) {
  const bias = story?.biasAnalysis;

  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Perspective"
        title="Understand the framing"
      />

      <div className="rounded-2xl border border-stroke bg-card p-5">
        {bias ? (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-muted">
              NewsLensAI detected perspective signals for this story.
            </p>

            <div className="rounded-xl bg-shell p-4">
              <p className="text-sm font-semibold text-ink">
                Bias analysis available
              </p>

              <p className="mt-1 text-xs leading-5 text-muted">
                Detailed perspective visualization will be added in the
                next phase.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm leading-6 text-muted">
              Perspective analysis is not available for this story yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function TimelineSection({ story }) {
  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="Timeline"
        title="What happened"
      />

      <div className="rounded-2xl border border-stroke bg-card p-5">
        <div className="relative pl-7">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-stroke" />

          <div className="relative pb-7">
            <span className="absolute left-[-28px] top-1 h-3 w-3 rounded-full border-2 border-signal bg-card" />

            <p className="text-xs font-semibold uppercase tracking-wide text-signal">
              Story published
            </p>

            <p className="mt-1 text-sm font-medium text-ink">
              {formatDate(story?.publishedAt)}
            </p>
          </div>

          <div className="relative">
            <span className="absolute left-[-28px] top-1 h-3 w-3 rounded-full border-2 border-stroke bg-card" />

            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Latest coverage
            </p>

            <p className="mt-1 text-sm text-muted">
              More timeline events will appear as related coverage is
              connected.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StoryDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: story, isLoading, isError } = useStory(id);

  const { data: bookmarks = [] } = useBookmarks({
    enabled: Boolean(user),
  });

  const toggleBookmark = useToggleBookmark();

  const isSaved = bookmarks.some(
    (bookmark) =>
      bookmark.storyId === id ||
      bookmark.story?.id === id
  );

  const handleBookmark = () => {
    if (!user || !story) return;

    toggleBookmark.mutate({
      storyId: story.id,
      isBookmarked: isSaved,
    });
  };

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-5 w-32 rounded bg-card" />

          <div className="aspect-[16/8] rounded-3xl bg-card" />

          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-card" />
            <div className="h-10 w-full rounded bg-card" />
            <div className="h-10 w-4/5 rounded bg-card" />
          </div>

          <div className="h-48 rounded-3xl bg-card" />
        </div>
      </main>
    );
  }

  if (isError || !story) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-ink">
            Story not found
          </h1>

          <p className="mt-2 text-sm text-muted">
            This story may have been removed or is temporarily unavailable.
          </p>

          <Link
            to="/"
            className="mt-5 inline-flex rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to NewsLensAI
          </Link>
        </div>
      </main>
    );
  }

  const sourceName = getSourceName(story);
  const topicName = getTopicName(story);
  const readingTime = getReadingTime(story);

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          to="/for-you"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <article>
          <div className="overflow-hidden rounded-3xl border border-stroke bg-card shadow-sm">
            <StoryImage story={story} />

            <div className="p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <span className="text-signal">
                  {sourceName}
                </span>

                <span>•</span>

                <span>{topicName}</span>

                <span>•</span>

                <span>{formatDate(story.publishedAt)}</span>
              </div>

              <h1 className="mt-5 max-w-4xl text-3xl font-bold leading-tight tracking-[-0.025em] text-ink sm:text-4xl lg:text-5xl">
                {story.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {readingTime} min read
                </span>

                <span>•</span>

                <span>
                  {story.clusterId ? "Multi-source story" : "Single-source story"}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {user && (
                  <button
                    type="button"
                    onClick={handleBookmark}
                    disabled={toggleBookmark.isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-shell px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-signal/30"
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="h-4 w-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4" />
                        Save story
                      </>
                    )}
                  </button>
                )}

                {story.canonicalUrl && (
                  <a
                    href={story.canonicalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-signal px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Read original
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-3xl space-y-10">
            <AISummary story={story} />

            <SourceCoverage story={story} />

            <PerspectiveSection story={story} />

            <TimelineSection story={story} />

            {story.canonicalUrl && (
              <div className="border-t border-stroke pt-8">
                <a
                  href={story.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-stroke bg-card p-5 transition hover:border-signal/30"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      Continue reading the original
                    </p>

                    <p className="mt-1 text-sm text-muted">
                      Open the article from {sourceName}.
                    </p>
                  </div>

                  <ExternalLink className="h-5 w-5 shrink-0 text-muted" />
                </a>
              </div>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}