import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import LoadingSpinner from "../components/LoadingSpinner";
import StoryActions from "../components/StoryActions";

import {
  useStory,
  useCluster,
  useRelatedStories,
} from "../hooks/useStory";
import { useRecordReading } from "../hooks/useStoryInteractions";

function Story() {
  const { id } = useParams();

  /*
   * Data fetching lives in ../hooks/useStory so the request paths and
   * payload unwrapping stay in one place. This page only renders.
   */

  const {
    data: story,
    isLoading: storyLoading,
    isError: storyError,
    error,
  } = useStory(id);

  const {
    data: cluster,
    isLoading: clusterLoading,
    isError: clusterError,
  } = useCluster(story?.clusterId);

  const {
    data: relatedStories = [],
    isLoading: relatedLoading,
  } = useRelatedStories(id);

  /*
   * Reading activity feeds the recommendation signals. It is measured as
   * time on page and reported once, when the reader leaves the story.
   */
  const recordReading = useRecordReading(id);

  /*
   * The timer effect must not re-run when the mutation object changes, or
   * it would restart the clock mid-read. Keeping the latest `mutate` in a
   * ref (updated in its own effect, never during render) lets the timer
   * depend on `id` alone.
   */
  const recordReadingRef = useRef(recordReading.mutate);

  useEffect(() => {
    recordReadingRef.current = recordReading.mutate;
  }, [recordReading.mutate]);

  useEffect(() => {

    if (!id) {
      return;
    }

    const openedAt = Date.now();

    return () => {
      const durationSeconds = (Date.now() - openedAt) / 1000;

      // Ignore accidental opens; anything shorter is noise, not a read.
      if (durationSeconds < 3) {
        return;
      }

      recordReadingRef.current({
        durationSeconds,
        completed: durationSeconds >= 30,
      });
    };
  }, [id]);


  /*
   * --------------------------------------------------
   * LOADING
   * --------------------------------------------------
   */
  if (storyLoading) {
    return <LoadingSpinner fullScreen />;
  }

  /*
   * --------------------------------------------------
   * ERROR
   * --------------------------------------------------
   */
  if (storyError) {
    return (
      <section className="mx-auto max-w-3xl rounded-[32px] border border-red-200 bg-white/80 p-8 shadow-sm dark:border-red-500/20 dark:bg-slate-900/80">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-600 dark:text-red-400">
          Story unavailable
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          We couldn't load this story.
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {error?.response?.data?.message ||
            error?.message ||
            "The story could not be loaded."}
        </p>

        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
        >
          <ArrowLeftIcon />
          Back to briefing
        </Link>
      </section>
    );
  }

  if (!story) {
    return null;
  }

  const primaryTopic = getPrimaryTopic(story);
  const aiSummary = getLatestSummaryRecord(story);
  const summary = aiSummary?.summary || null;
  const keyPoints = getKeyPoints(aiSummary);
  const whyItMatters = getStructuredText(aiSummary?.whyItMatters);
  const whatNext = getStructuredText(aiSummary?.whatNext);
  const coverageStories = getCoverageStories(
    cluster,
    story.id
  );

  const sourceCount = getSourceCount(cluster);
  const coverageCount = cluster?.stories?.length || 1;
  const readingTime = estimateReadingTime(
    story.content || story.excerpt || summary
  );
  const timeline = buildCoverageTimeline(story, cluster?.stories || []);

  return (
    <div className="mx-auto max-w-[720px] space-y-10">

      {/* --------------------------------------------------
          BACK
      -------------------------------------------------- */}

      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeftIcon />
        Back to briefing
      </Link>

      {/* --------------------------------------------------
          STORY HEADER
      -------------------------------------------------- */}

      <section className="overflow-hidden rounded-[28px] border border-stroke bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">

        <StoryVisual story={story} />

        <div className="p-5 sm:p-7">

        <div className="flex flex-wrap items-center gap-2">

          {primaryTopic && (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {primaryTopic}
            </span>
          )}

          {story.clusterId && (
            <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300">
              Multi-source story
            </span>
          )}

          {story.contentStatus && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-400">
              {formatContentStatus(story.contentStatus)}
            </span>
          )}
        </div>

        <h1 className="mt-6 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white">
          {story.title}
        </h1>

        {story.excerpt && (
          <p className="mt-6 max-w-4xl text-base leading-8 text-slate-600 sm:text-lg dark:text-slate-300">
            {story.excerpt}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-500 dark:text-slate-400">

          {story.source?.name && (
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {story.source.name}
            </span>
          )}

          {story.author && (
            <span>
              By {story.author}
            </span>
          )}

          {story.publishedAt && (
            <span>
              {formatDate(story.publishedAt)}
            </span>
          )}

          {story.points != null && (
            <span>
              {story.points} points
            </span>
          )}
        </div>

          <div className="mt-8 border-t border-stroke pt-6 dark:border-white/10">
            <StoryActions storyId={story.id} />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------
          NEWSLENS INTELLIGENCE
      -------------------------------------------------- */}

      <section>
        <SectionHeading
          eyebrow="NewsLens intelligence"
          title="Understand the story"
          description="Start with the important context before comparing individual coverage."
        />

        <div className="mt-5 rounded-[30px] border border-stroke bg-white/75 p-6 shadow-sm backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-slate-900/70">

          <div className="flex gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
              ✦
            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                AI brief
              </p>

              {summary ? (
                <p className="mt-3 max-w-4xl text-base leading-8 text-slate-700 dark:text-slate-200">
                  {summary}
                </p>
              ) : (
                <p className="mt-3 max-w-4xl text-base leading-8 text-slate-500 dark:text-slate-400">
                  An AI-generated brief is not available for this story yet.
                </p>
              )}

              {keyPoints.length || whyItMatters || whatNext ? (
                <div className="mt-6 space-y-5 border-t border-stroke pt-5 dark:border-white/10">
                  {keyPoints.length ? (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Key points
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        {keyPoints.map((point) => (
                          <li key={point} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 dark:bg-amber-400" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {whyItMatters || whatNext ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {whyItMatters ? (
                        <StructuredInsight
                          label="Why it matters"
                          text={whyItMatters}
                        />
                      ) : null}

                      {whatNext ? (
                        <StructuredInsight
                          label="What to watch next"
                          text={whatNext}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stroke pt-5 text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span>{readingTime} min read</span>
          <span aria-hidden="true">·</span>
          <span>
            {story.clusterId && sourceCount > 1
              ? `${sourceCount} sources`
              : "1 source"}
          </span>
          {story.clusterId ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{coverageCount} reports</span>
            </>
          ) : null}
        </div>
      </section>

      {/* --------------------------------------------------
          MULTI-SOURCE COVERAGE
      -------------------------------------------------- */}

      <section>
        <SectionHeading
          eyebrow="Multi-source coverage"
          title="How different sources cover it"
          description="Compare reporting about the same event without opening every article."
        />

        {clusterLoading ? (
          <LoadingBlock text="Loading coverage..." />
        ) : clusterError ? (
          <EmptyBlock>
            Coverage information could not be loaded.
          </EmptyBlock>
        ) : !story.clusterId ? (
          <EmptyBlock>
            This story has not been connected to a story cluster yet.
          </EmptyBlock>
        ) : coverageStories.length === 0 ? (
          <EmptyBlock>
            No additional coverage is available for this story yet.
          </EmptyBlock>
        ) : (
          <>
            <SourceTabs stories={[story, ...coverageStories]} />

            <div className="mt-5 grid gap-5">
              {coverageStories.map((item) => (
                <CoverageCard key={item.id} story={item} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* --------------------------------------------------
          SOURCE SIGNALS
      -------------------------------------------------- */}

      <section>
        <SectionHeading
          eyebrow="Perspectives"
          title="Source context and signals"
          description="Review the source information and bias signals NewsLens has available for this coverage."
        />

        {clusterLoading ? (
          <LoadingBlock text="Loading source information..." />
        ) : !story.clusterId ? (
          <SourceCard story={story} />
        ) : (
          <SourceOverview stories={cluster?.stories || []} />
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="Story timeline"
          title="Coverage as it developed"
          description="Built from the reporting currently connected to this story."
        />

        <StoryTimeline events={timeline} />
      </section>

      {story.canonicalUrl ? (
        <a
          href={story.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-[24px] border border-stroke bg-white/75 px-5 py-4 text-sm font-bold text-slate-800 transition hover:border-amber-300 hover:text-amber-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:text-amber-400"
        >
          Read original article
          <ExternalLinkIcon />
        </a>
      ) : null}

      {/* --------------------------------------------------
          RELATED STORIES
      -------------------------------------------------- */}

      <section>
        <SectionHeading
          eyebrow="Keep exploring"
          title="Related stories"
          description="Other stories NewsLensAI considers connected to this story."
        />

        {relatedLoading ? (
          <LoadingBlock text="Finding related stories..." />
        ) : relatedStories.length === 0 ? (
          <EmptyBlock>
            There are no additional related stories available yet.
          </EmptyBlock>
        ) : (
          <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-[28px] border border-stroke bg-white/75 dark:divide-white/10 dark:border-white/10 dark:bg-slate-900/70">

            {relatedStories.map((item) => (
              <RelatedStoryRow
                key={item.id}
                story={item}
              />
            ))}

          </div>
        )}
      </section>

    </div>
  );
}

function StoryVisual({ story }) {
  const imageUrl = story?.imageUrl || story?.image_url;
  const sourceName = story?.source?.name || "NewsLensAI";
  const initials = sourceName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={story.title}
          loading="eager"
          className="relative z-10 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.24),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.22),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.15),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_40%)]">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/70 bg-white/75 text-lg font-black text-slate-700 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-950/40 dark:text-white">
          {initials || "NL"}
        </span>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black/35 to-transparent" />
    </div>
  );
}

function StructuredInsight({ label, text }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/[0.06] dark:bg-slate-800/60">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {text}
      </p>
    </div>
  );
}

function SourceTabs({ stories }) {
  const sources = uniqueSources(stories);

  if (!sources.length) {
    return null;
  }

  return (
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Sources covering this story">
      {sources.map((source) => (
        <span
          key={source.id}
          className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300"
        >
          {source.name}
        </span>
      ))}
    </div>
  );
}

function StoryTimeline({ events }) {
  if (!events.length) {
    return (
      <EmptyBlock>
        A coverage timeline will appear as dated reporting becomes available.
      </EmptyBlock>
    );
  }

  return (
    <ol className="mt-5 space-y-0 rounded-[28px] border border-stroke bg-white/75 p-5 dark:border-white/10 dark:bg-slate-900/70">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          <div className="flex w-4 shrink-0 flex-col items-center">
            <span className="mt-1.5 h-3 w-3 rounded-full bg-teal-600 ring-4 ring-teal-100 dark:bg-teal-400 dark:ring-teal-500/10" />
            {index < events.length - 1 ? (
              <span className="mt-2 w-px flex-1 bg-slate-200 dark:bg-white/10" />
            ) : null}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">
              {formatDate(event.date)}
            </p>
            <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              Reported by {event.sourceName}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {event.title}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* =========================================================
   COVERAGE CARD
========================================================= */

function CoverageCard({ story }) {
  const summary = getLatestSummary(story);

  return (
    <article className="rounded-[28px] border border-stroke bg-white/75 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70">

      <div className="flex items-start justify-between gap-4">

        <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
          {story.source?.name || "Unknown source"}
        </span>

        {story.publishedAt && (
          <span className="shrink-0 text-xs font-medium text-slate-400">
            {formatRelativeTime(story.publishedAt)}
          </span>
        )}

      </div>

      <h3 className="mt-5 text-lg font-bold leading-7 text-slate-950 dark:text-white">
        {story.title}
      </h3>

      {summary && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">

          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
            AI brief
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {summary}
          </p>

        </div>
      )}

      {!summary && story.excerpt && (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {story.excerpt}
        </p>
      )}

      {story.canonicalUrl && (
        <a
          href={story.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-amber-600 transition hover:text-amber-700 dark:text-amber-400"
        >
          Read coverage
          <ExternalLinkIcon />
        </a>
      )}

    </article>
  );
}

/* =========================================================
   SOURCE OVERVIEW
========================================================= */

function SourceOverview({ stories }) {
  if (!stories.length) {
    return (
      <EmptyBlock>
        No source information is available yet.
      </EmptyBlock>
    );
  }

  const sources = uniqueSources(stories);

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

      {sources.map((source) => (
        <div
          key={source.id}
          className="rounded-[26px] border border-stroke bg-white/75 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70"
        >

          <p className="text-lg font-black text-slate-950 dark:text-white">
            {source.name}
          </p>

          {source.slug && (
            <p className="mt-1 text-xs text-slate-400">
              {source.slug}
            </p>
          )}

          <div className="mt-5 space-y-3">

            <SourceDetail
              label="Political lean"
              value={formatEnum(source.politicalLean)}
            />

            <SourceDetail
              label="Reliability"
              value={
                source.reliabilityScore != null
                  ? formatScore(source.reliabilityScore)
                  : "Not available"
              }
            />

            <SourceDetail
              label="Articles in cluster"
              value={
                stories.filter(
                  (story) =>
                    story.sourceId === source.id
                ).length
              }
            />

          </div>

        </div>
      ))}

    </div>
  );
}

function SourceCard({ story }) {
  const source = story.source;

  if (!source) {
    return (
      <EmptyBlock>
        Source information is not available.
      </EmptyBlock>
    );
  }

  return (
    <div className="mt-5 max-w-md">
      <div className="rounded-[26px] border border-stroke bg-white/75 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/70">

        <p className="text-lg font-black text-slate-950 dark:text-white">
          {source.name}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {source.slug}
        </p>

        <div className="mt-5 space-y-3">

          <SourceDetail
            label="Political lean"
            value={formatEnum(source.politicalLean)}
          />

          <SourceDetail
            label="Reliability"
            value={
              source.reliabilityScore != null
                ? formatScore(source.reliabilityScore)
                : "Not available"
            }
          />

        </div>
      </div>
    </div>
  );
}

function SourceDetail({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stroke pb-3 last:border-b-0 last:pb-0 dark:border-white/10">

      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>

      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </span>

    </div>
  );
}

/* =========================================================
   RELATED STORY
========================================================= */

function RelatedStoryRow({ story }) {
  return (
    <div className="flex items-start justify-between gap-5 p-5 transition hover:bg-amber-50/50 dark:hover:bg-slate-800/60">

      <div className="min-w-0">

        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          {story.source?.name || "Unknown source"}
        </p>

        <h3 className="mt-2 font-bold leading-6 text-slate-900 dark:text-white">
          {story.title}
        </h3>

        {story.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {story.excerpt}
          </p>
        )}

        {story.publishedAt && (
          <p className="mt-2 text-xs text-slate-400">
            {formatRelativeTime(story.publishedAt)}
          </p>
        )}

      </div>

      {story.canonicalUrl && (
        <a
          href={story.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 shrink-0 text-sm font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
        >
          Read
        </a>
      )}

    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getLatestSummaryRecord(story) {
  if (!Array.isArray(story?.aiSummaries)) {
    return null;
  }

  if (!story.aiSummaries.length) {
    return null;
  }

  /*
   * AISummary has:
   * createdAt
   * summary
   * model
   * version
   */

  const summaries = [...story.aiSummaries].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  return summaries[0] || null;
}

function getLatestSummary(story) {
  return getLatestSummaryRecord(story)?.summary || null;
}

function getKeyPoints(summary) {
  if (!Array.isArray(summary?.keyPoints)) {
    return [];
  }

  return summary.keyPoints
    .filter((point) => typeof point === "string")
    .map((point) => point.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function getStructuredText(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function getPrimaryTopic(story) {
  if (
    Array.isArray(story?.storyTopics) &&
    story.storyTopics.length
  ) {
    return (
      story.storyTopics[0]?.topic?.name ||
      null
    );
  }

  if (story?.topic?.name) {
    return story.topic.name;
  }

  return null;
}

function getCoverageStories(cluster, currentStoryId) {
  if (!Array.isArray(cluster?.stories)) {
    return [];
  }

  return cluster.stories.filter(
    (item) => item.id !== currentStoryId
  );
}

function getSourceCount(cluster) {
  if (!Array.isArray(cluster?.stories)) {
    return 0;
  }

  return new Set(
    cluster.stories
      .map((story) => story.sourceId || story.source?.id)
      .filter(Boolean)
  ).size;
}

function estimateReadingTime(text) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));
}

function buildCoverageTimeline(story, clusterStories) {
  const stories = [
    story,
    ...clusterStories.filter((item) => item.id !== story.id),
  ]
    .map((item) => ({
      id: item.id,
      date: item.publishedAt || item.createdAt,
      title: item.title,
      sourceName: item.source?.name || "Unknown source",
    }))
    .filter((item) => item.date && item.title)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (stories.length <= 3) {
    return stories;
  }

  return [
    stories[0],
    stories[Math.floor(stories.length / 2)],
    stories[stories.length - 1],
  ];
}

function uniqueSources(stories) {
  const sourceMap = new Map();

  for (const story of stories) {
    const source = story.source;

    if (!source?.id) {
      continue;
    }

    if (!sourceMap.has(source.id)) {
      sourceMap.set(source.id, source);
    }
  }

  return Array.from(sourceMap.values());
}

function formatContentStatus(value) {
  if (!value) {
    return "Unknown";
  }

  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function formatEnum(value) {
  if (!value) {
    return "Unknown";
  }

  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function formatScore(value) {
  if (value == null) {
    return "Not available";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "Not available";
  }

  return number <= 1
    ? number.toFixed(2)
    : number.toFixed(1);
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const diff = Date.now() - date.getTime();

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return "Just now";
  }

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

  return formatDate(value);
}

/* =========================================================
   SHARED UI
========================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
}) {
  return (
    <div>

      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">
        {title}
      </h2>

      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}

    </div>
  );
}

function LoadingBlock({ text }) {
  return (
    <div className="mt-5 rounded-[28px] border border-stroke bg-white/60 p-8 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-400">
      {text}
    </div>
  );
}

function EmptyBlock({ children }) {
  return (
    <div className="mt-5 rounded-[28px] border border-dashed border-stroke bg-white/50 px-6 py-10 text-center text-sm leading-6 text-slate-500 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-400">
      {children}
    </div>
  );
}

/* =========================================================
   ICONS
========================================================= */

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M14 5h5v5" />
      <path d="M19 5 10 14" />
      <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export default Story;
