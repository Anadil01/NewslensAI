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
import { useAuth } from "../context/useAuth";
import { useBookmarks } from "../hooks/useBookmarks";
import { useToggleBookmark } from "../hooks/useToggleBookmark";

function getStoryDate(story) {
  return story?.publishedAt || story?.createdAt || null;
}

function formatDate(date) {
  if (!date) return "Recently";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function relativeTime(date) {
  if (!date) return "Recently";

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) return "Recently";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000)
  );

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

function getReadingTime(story) {
  const text =
    story?.content ||
    story?.excerpt ||
    story?.title ||
    "";

  const words = text.trim().split(/\s+/).filter(Boolean).length;

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
    story?.storyTopics?.[0]?.topic?.name ||
    story?.topic?.name ||
    story?.topic?.title ||
    "News"
  );
}

function getImageUrl(story) {
  return story?.imageUrl || story?.image_url || null;
}

function getSourceCount(story) {
  return story?.coverageCount || 1;
}

function StoryVisual({ story }) {
  const imageUrl = getImageUrl(story);
  const topic = getTopicName(story);

  if (!imageUrl) {
    return (
      <div className="relative flex h-48 overflow-hidden bg-gradient-to-br from-signal/15 via-mint/10 to-transparent sm:h-60">
        <div className="absolute inset-0">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-signal/10" />
          <div className="absolute -right-4 top-12 h-40 w-40 rounded-full border border-signal/10" />
          <div className="absolute bottom-[-80px] left-[-40px] h-52 w-52 rounded-full border border-mint/10" />
        </div>

        <div className="relative z-10 flex w-full items-end justify-between p-6 sm:p-8">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-stroke bg-card/80 shadow-sm">
              <Globe2 className="h-5 w-5 text-signal" />
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-signal">
              {topic}
            </p>

            <p className="mt-1 text-sm font-semibold text-ink">
              NewsLensAI briefing
            </p>
          </div>

          <span className="hidden rounded-full border border-stroke bg-card/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted backdrop-blur sm:inline-flex">
            Story intelligence
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-52 overflow-hidden sm:h-72 lg:h-80">
      <img
        src={imageUrl}
        alt=""
        loading="eager"
        className="h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
        <span className="rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
          {topic}
        </span>

        <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          {relativeTime(getStoryDate(story))}
        </span>
      </div>
    </div>
  );
}

function SectionLabel({ children, icon = false }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {icon && <Sparkles className="h-3.5 w-3.5 text-signal" />}

      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-signal">
        {children}
      </p>
    </div>
  );
}

function AIUnderstanding({ story }) {
  const ai = story?.aiSummaries?.[0];

  const summary =
    ai?.summary ||
    story?.excerpt ||
    "";

  const keyPoints = Array.isArray(ai?.keyPoints)
    ? ai.keyPoints.filter(Boolean).slice(0, 5)
    : [];

  const whyItMatters = ai?.whyItMatters;
  const whatNext = ai?.whatNext;

  const hasAnyAIContent =
    summary ||
    keyPoints.length > 0 ||
    whyItMatters ||
    whatNext;

  return (
    <section>
      <div className="overflow-hidden rounded-3xl border border-signal/15 bg-signal/[0.045]">
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal/10">
              <Sparkles className="h-5 w-5 text-signal" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-signal">
                NewsLens Brief
              </p>

              <p className="mt-1 text-xs text-muted">
                Understand the story in seconds
              </p>
            </div>
          </div>

          {summary && (
            <div className="mt-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                What happened?
              </p>

              <p className="text-[15px] leading-7 text-ink sm:text-base sm:leading-8">
                {summary}
              </p>
            </div>
          )}

          {keyPoints.length > 0 && (
            <div className="mt-8 border-t border-signal/10 pt-7">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Key points
              </p>

              <div className="space-y-3">
                {keyPoints.map((point, index) => (
                  <div
                    key={`${story.id}-detail-point-${index}`}
                    className="flex gap-3"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />

                    <p className="text-sm leading-6 text-ink">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {whyItMatters && (
            <div className="mt-8 border-t border-signal/10 pt-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Why it matters
              </p>

              <p className="text-sm leading-7 text-ink sm:text-[15px]">
                {whyItMatters}
              </p>
            </div>
          )}

          {whatNext && (
            <div className="mt-8 border-t border-signal/10 pt-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                What happens next
              </p>

              <p className="text-sm leading-7 text-ink sm:text-[15px]">
                {whatNext}
              </p>
            </div>
          )}

          {!hasAnyAIContent && (
            <div className="mt-7 rounded-2xl border border-stroke bg-card p-5">
              <p className="text-sm leading-6 text-muted">
                NewsLensAI is still preparing an intelligence brief
                for this story.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SourceCoverage({ story }) {
  const relatedStories = story?.cluster?.stories || [];

  const allStories = [story, ...relatedStories];

  const uniqueSources = [];

  for (const item of allStories) {
    const source = item?.source;

    if (!source) continue;

    if (
      !uniqueSources.some(
        (existing) => existing.id === source.id
      )
    ) {
      uniqueSources.push(source);
    }
  }

  const sourceCount = story?.coverageCount || uniqueSources.length || 1;

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <SectionLabel>Coverage</SectionLabel>

          <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {sourceCount > 1
              ? "Same story. Different sources."
              : "Source coverage"}
          </h2>
        </div>

        <span className="shrink-0 rounded-full bg-signal/10 px-3 py-1.5 text-xs font-bold text-signal">
          {sourceCount} {sourceCount === 1 ? "source" : "sources"}
        </span>
      </div>

      {uniqueSources.length <= 1 ? (
        <div className="mt-5 rounded-2xl border border-stroke bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-shell text-xs font-bold text-signal">
              {getSourceName(story)
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div>
              <p className="text-sm font-semibold text-ink">
                {getSourceName(story)}
              </p>

              <p className="mt-1 text-sm leading-6 text-muted">
                This story currently has coverage from one source.
                More perspectives will appear as related coverage is
                connected.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {allStories.map((item) => {
            if (!item?.source) return null;

            const ai = item?.aiSummaries?.[0];

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-stroke bg-card p-5 transition hover:border-signal/20"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-shell text-xs font-bold text-signal">
                    {item.source.name
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {item.source.name}
                      </p>

                      {item.id === story.id && (
                        <span className="rounded-full bg-signal/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-signal">
                          Current
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-sm font-semibold leading-6 text-ink">
                      {item.title}
                    </h3>

                    {ai?.summary && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                        {ai.summary}
                      </p>
                    )}

                    {item.canonicalUrl && (
                      <a
                        href={item.canonicalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-signal hover:underline"
                      >
                        Read source
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PerspectiveSection({ story }) {
  const bias = story?.biasAnalysis;

  if (!bias) {
    return null;
  }

  return (
    <section>
      <SectionLabel>Perspective</SectionLabel>

      <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        How this story is framed
      </h2>

      <div className="mt-5 rounded-2xl border border-stroke bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-shell p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Bias signal
            </p>

            <p className="mt-2 text-xl font-bold text-ink">
              {bias.biasScore ?? "—"}
            </p>
          </div>

          <div className="rounded-xl bg-shell p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Tone
            </p>

            <p className="mt-2 text-sm font-semibold capitalize text-ink">
              {bias.tone || "Unknown"}
            </p>
          </div>

          <div className="rounded-xl bg-shell p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Confidence
            </p>

            <p className="mt-2 text-xl font-bold text-ink">
              {bias.confidence != null
                ? `${Math.round(bias.confidence * 100)}%`
                : "—"}
            </p>
          </div>
        </div>

        {Array.isArray(bias.signals) &&
          bias.signals.length > 0 && (
            <div className="mt-5 border-t border-stroke pt-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Signals
              </p>

              <div className="flex flex-wrap gap-2">
                {bias.signals.map((signal, index) => (
                  <span
                    key={`${index}-${signal}`}
                    className="rounded-full border border-stroke bg-shell px-3 py-1.5 text-xs font-medium text-muted"
                  >
                    {typeof signal === "string"
                      ? signal
                      : JSON.stringify(signal)}
                  </span>
                ))}
              </div>
            </div>
          )}

        <p className="mt-5 text-xs leading-5 text-muted">
          Perspective signals are indicators, not a verdict on
          whether a source is truthful or untruthful.
        </p>
      </div>
    </section>
  );
}

function TimelineSection({ story }) {
  const date = getStoryDate(story);

  return (
    <section>
      <SectionLabel>Timeline</SectionLabel>

      <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
        Story timeline
      </h2>

      <div className="mt-5 rounded-2xl border border-stroke bg-card p-5">
        <div className="relative pl-7">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-stroke" />

          <div className="relative pb-8">
            <span className="absolute left-[-28px] top-1 h-3 w-3 rounded-full border-2 border-signal bg-card" />

            <p className="text-[10px] font-bold uppercase tracking-wide text-signal">
              First published
            </p>

            <p className="mt-1 text-sm font-medium text-ink">
              {formatDate(date)}
            </p>
          </div>

          <div className="relative">
            <span className="absolute left-[-28px] top-1 h-3 w-3 rounded-full border-2 border-stroke bg-card" />

            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Latest coverage
            </p>

            <p className="mt-1 text-sm leading-6 text-muted">
              NewsLensAI will add new timeline events as related
              coverage and story developments are connected.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-6 sm:py-9">
      <div className="animate-pulse space-y-6">
        <div className="h-5 w-28 rounded-lg bg-card" />

        <div className="h-48 rounded-3xl bg-card sm:h-64" />

        <div className="space-y-4">
          <div className="h-3 w-48 rounded bg-card" />
          <div className="h-10 w-full rounded bg-card" />
          <div className="h-10 w-4/5 rounded bg-card" />
          <div className="h-5 w-40 rounded bg-card" />
        </div>

        <div className="h-80 rounded-3xl bg-card" />
      </div>
    </main>
  );
}

function DetailError() {
  return (
    <main className="mx-auto flex min-h-[65vh] w-full max-w-4xl items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-stroke bg-card">
          <Globe2 className="h-5 w-5 text-signal" />
        </div>

        <h1 className="mt-5 text-xl font-bold text-ink">
          Story not available
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted">
          We couldn't load this story right now. It may have been
          removed or temporarily unavailable.
        </p>

        <Link
          to="/for-you"
          className="mt-5 inline-flex rounded-xl bg-signal px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
        >
          Back to briefing
        </Link>
      </div>
    </main>
  );
}

export default function StoryDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const {
    data: story,
    isLoading,
    isError,
  } = useStory(id);

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
    return <DetailSkeleton />;
  }

  if (isError || !story) {
    return <DetailError />;
  }

  const sourceName = getSourceName(story);
  const topicName = getTopicName(story);
  const storyDate = getStoryDate(story);
  const readingTime = getReadingTime(story);
  const sourceCount = getSourceCount(story);

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-9">
        {/* Back */}
        <Link
          to="/for-you"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to briefing
        </Link>

        <article>
          {/* Story header */}
          <div className="overflow-hidden rounded-3xl border border-stroke bg-card shadow-sm">
            <StoryVisual story={story} />

            <div className="p-6 sm:p-8">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[10px] font-bold uppercase tracking-[0.14em]">
                <span className="text-signal">
                  {sourceName}
                </span>

                <span className="text-muted">•</span>

                <span className="text-muted">
                  {topicName}
                </span>

                <span className="text-muted">•</span>

                <span className="text-muted">
                  {relativeTime(storyDate)}
                </span>
              </div>

              {/* Headline */}
              <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-[1.12] tracking-[-0.03em] text-ink sm:text-4xl lg:text-[46px]">
                {story.title}
              </h1>

              {/* Story metadata */}
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {readingTime} min read
                </span>

                <span>•</span>

                <span>
                  {sourceCount}{" "}
                  {sourceCount === 1 ? "source" : "sources"}
                </span>

                {storyDate && (
                  <>
                    <span>•</span>

                    <span>{formatDate(storyDate)}</span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-2">
                {user && (
                  <button
                    type="button"
                    onClick={handleBookmark}
                    disabled={toggleBookmark.isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-shell px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-signal/30 disabled:opacity-50"
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

          {/* Intelligence */}
          <div className="mx-auto mt-8 max-w-3xl space-y-10">
            <AIUnderstanding story={story} />

            <SourceCoverage story={story} />

            <PerspectiveSection story={story} />

            <TimelineSection story={story} />

            {/* Original source */}
            {story.canonicalUrl && (
              <section className="border-t border-stroke pt-8">
                <a
                  href={story.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between gap-5 rounded-2xl border border-stroke bg-card p-5 transition hover:border-signal/30"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      Continue reading the original
                    </p>

                    <p className="mt-1 text-sm text-muted">
                      Read the full article from {sourceName}.
                    </p>
                  </div>

                  <ExternalLink className="h-5 w-5 shrink-0 text-muted transition group-hover:text-signal" />
                </a>
              </section>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}