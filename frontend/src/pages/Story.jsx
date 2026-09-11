import { Link } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  Clock3,
  Globe2,
  MoreHorizontal,
  Share2,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../context/useAuth";
import { useBookmarks } from "../hooks/useBookmarks";
import { useToggleBookmark } from "../hooks/useToggleBookmark";
import {
  useStoryFeedback,
  useSetStoryFeedback,
  useStorySkip,
  useToggleStorySkip,
} from "../hooks/useStoryInteractions";
import { useLanguage } from "../context/useLanguage";

function getDate(story) {
  return story?.publishedAt || story?.createdAt || null;
}

function relativeTime(date) {
  if (!date) return "Recently";

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";

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

function formatDate(date) {
  if (!date) return "Recently";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(parsed);
}

function getSourceName(story) {
  return (
    story?.source?.name ||
    story?.source?.title ||
    "News source"
  );
}

function getTopicName(story) {
  return (
    story?.storyTopics?.[0]?.topic?.name ||
    story?.topic?.name ||
    "News"
  );
}

function getSourceCount(story) {
  return story?.coverageCount || 1;
}

function getReadingTime(story, text) {
  if (typeof story?.readingTimeSeconds === "number") {
    return Math.max(1, Math.ceil(story.readingTimeSeconds / 60));
  }

  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

  return Math.max(1, Math.ceil(words / 220));
}

function getLatestSummaryRecord(story, preferredLanguage = "en") {
  if (!Array.isArray(story?.aiSummaries) || !story.aiSummaries.length) {
    return null;
  }
  const sorted = [...story.aiSummaries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const localized = sorted.find((s) => s.version && s.version.endsWith(`:${preferredLanguage}`));
  const english = sorted.find((s) => s.version && s.version.endsWith(`:en`));

  return localized || english || sorted[0] || null;
}

function buildFallbackKeyPoints(story) {
  const text =
    story?.excerpt ||
    story?.content ||
    "";

  if (!text) {
    return [];
  }

  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35);

  return sentences.slice(0, 3);
}

function buildFallbackBrief(story) {
  if (story?.excerpt) {
    return story.excerpt;
  }

  if (story?.content) {
    const clean = story.content
      .replace(/\s+/g, " ")
      .trim();

    if (clean.length > 260) {
      return `${clean.slice(0, 257)}...`;
    }

    return clean;
  }

  return "NewsLensAI is still preparing a concise briefing for this story.";
}

function getRecommendationReason(story) {
  const scoring = story.scoring;
  
  // Only display reasons if the feed mode was explicitly personalized
  if (!scoring || scoring.mode !== "personalized") return null;

  // Gather the positive signals that contributed to this story's rank
  const signals = [
    { type: "topic", value: scoring.topicAffinity || 0 },
    { type: "source", value: scoring.sourceAffinity || 0 },
    { type: "reading", value: scoring.readingInterest || 0 },
    { type: "like", value: scoring.likeSignal || 0 },
    { type: "bookmark", value: scoring.bookmarkSignal || 0 }
  ];

  // Sort to find the dominant reason it was recommended
  signals.sort((a, b) => b.value - a.value);
  const topSignal = signals[0];

  // If the top personalization signal is very weak, it means the story
  // was recommended purely due to its freshness, popularity, or cluster size (cold start).
  if (topSignal.value <= 0.1) {
    return "Top story for you";
  }

  switch (topSignal.type) {
    case "topic": {
      const topicName = getTopicName(story);
      return topicName !== "News" ? `Because you follow ${topicName}` : "Based on your topics";
    }
    case "source": {
      const sourceName = getSourceName(story);
      return sourceName !== "News source" ? `Because you follow ${sourceName}` : "Based on your sources";
    }
    case "reading":
      return "Based on your reading history";
    case "like":
      return "Because you liked similar stories";
    case "bookmark":
      return "Based on your saved stories";
    default:
      return "Recommended for you";
  }
}

function FallbackVisual({ story }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-amber-50 via-slate-100 to-teal-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-amber-500/10" />
      <div className="absolute right-8 top-12 h-44 w-44 rounded-full border border-amber-500/10" />
      <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full border border-teal-500/10" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-800/80">
            <Globe2 className="h-6 w-6 text-signal" />
          </div>

          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-signal">
            {getTopicName(story)}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            NewsLensAI briefing
          </p>
        </div>
      </div>
    </div>
  );
}

function StoryImage({ story }) {
  if (!story?.imageUrl) {
    return <FallbackVisual story={story} />;
  }

  return (
    <img
      src={story.imageUrl}
      alt=""
      loading="lazy"
      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
    />
  );
}

function ActionButton({
  children,
  onClick,
  active = false,
  label,
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick?.();
      }}
      className={[
        "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition",
        active
          ? "bg-signal/10 text-signal"
          : "text-slate-500 hover:bg-shell hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StoryCard({ story }) {
  // Safety check to handle undefined story states without breaking rendering
  if (!story) {
    return null;
  }

  const { user } = useAuth();
  const { language } = useLanguage();
  const isSignedIn = Boolean(user);

  const { data: feedback } = useStoryFeedback(story.id, {
    enabled: isSignedIn,
  });

  const setFeedback = useSetStoryFeedback(story.id);

  const { data: isSkipped } = useStorySkip(story.id, {
    enabled: isSignedIn,
  });

  const toggleSkip = useToggleStorySkip(story.id);

  const { data: bookmarkedStories = [] } = useBookmarks({
    enabled: isSignedIn,
  });

  const toggleBookmark = useToggleBookmark();

  const aiSummary = getLatestSummaryRecord(story, language);

  const isBookmarked = bookmarkedStories.some(
    (bookmark) =>
      bookmark.id === story.id ||
      bookmark.storyId === story.id ||
      bookmark.story?.id === story.id
  );

  const topic = getTopicName(story);
  const source = getSourceName(story);
  const date = getDate(story);

  const sourceCount = getSourceCount(story);
  
  const bias = story?.biasAnalysis;
  const brief = aiSummary?.summary || buildFallbackBrief(story);
  const minutesToRead = getReadingTime(story, story.content || story.excerpt || brief);

  const recommendationReason = getRecommendationReason(story);

  const aiKeyPoints = Array.isArray(aiSummary?.keyPoints)
    ? aiSummary.keyPoints.filter(Boolean).slice(0, 3)
    : [];

  const fallbackKeyPoints = buildFallbackKeyPoints(story);

  const keyPoints =
    aiKeyPoints.length > 0
      ? aiKeyPoints
      : fallbackKeyPoints;

  const handleFeedback = (value) => {
    if (!isSignedIn) return;

    setFeedback.mutate(
      feedback === value ? null : value
    );
  };

  const handleBookmark = () => {
    if (!isSignedIn) return;

    toggleBookmark.mutate({
      storyId: story.id,
      isBookmarked,
    });
  };

  const handleSkip = () => {
    if (!isSignedIn) return;

    toggleSkip.mutate();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/story/${story.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: story.title,
          url,
        });

        return;
      }

      await navigator.clipboard?.writeText(url);
    } catch {
      // User cancelled native sharing.
    }
  };

  return (
    <article
      className="
        group
        overflow-hidden
        rounded-[28px]
        border
        border-stroke
        bg-card
        shadow-[0_14px_45px_rgba(15,23,42,0.08)]
      "
    >

      {/* ─────────────────────────────
         IMAGE
      ───────────────────────────── */}

      <div className="relative h-[30vh] min-h-[220px] max-h-[300px] overflow-hidden sm:h-[32vh]">

        <StoryImage story={story} />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/15" />

        {/* Story type */}
        <div className="absolute left-4 top-4">
          <span className="rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur">
            News
          </span>
        </div>

        {/* Time */}
        <div className="absolute right-4 top-4">
          <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            {date ? relativeTime(date) : "Recently"}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────
         CONTENT
      ───────────────────────────── */}

      <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">

        {/* Recommendation Reason (Personalization) */}
        {recommendationReason && (
          <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
            <Sparkles size={12} />
            <span>{recommendationReason}</span>
          </div>
        )}

        {/* Source / topic / date */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em]">

          <span className="text-signal">
            {topic}
          </span>

          <span className="text-slate-300 dark:text-slate-600">
            •
          </span>

          <span className="text-slate-500 dark:text-slate-400">
            {source}
          </span>

          {date && (
            <>
              <span className="text-slate-300 dark:text-slate-600">
                •
              </span>

              <span className="text-slate-400 dark:text-slate-500">
                {formatDate(date)}
              </span>
            </>
          )}
        </div>

        {/* Headline */}

        <h2 className="mt-3 text-[24px] font-extrabold leading-[1.16] tracking-[-0.03em] text-ink sm:text-[28px] dark:text-white">
          {story.title}
        </h2>

        {/* ─────────────────────────────
            AI BRIEF
        ───────────────────────────── */}

        <section className="mt-5 rounded-2xl bg-shell/80 p-4 sm:p-5 dark:bg-slate-800/50">

          <div className="flex items-center gap-2">

            <Sparkles className="h-4 w-4 text-signal" />

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-signal">
              {aiSummary?.summary
                ? "AI Brief"
                : "Brief"}
            </p>

          </div>

          <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {brief}
          </p>
        </section>

        {/* ─────────────────────────────
            KEY POINTS
        ───────────────────────────── */}

        {keyPoints.length > 0 && (
          <section className="mt-5">

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Key takeaways
            </p>

            <div className="mt-3 space-y-2.5">

              {keyPoints.map((point, index) => (
                <div
                  key={`${story.id}-point-${index}`}
                  className="flex gap-3"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />

                  <p className="line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {point}
                  </p>
                </div>
              ))}

            </div>
          </section>
        )}

        {/* ─────────────────────────────
            WHY IT MATTERS
        ───────────────────────────── */}

        {aiSummary?.whyItMatters && (
          <section className="mt-5">

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Why it matters
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {aiSummary.whyItMatters}
            </p>

          </section>
        )}

        {/* ─────────────────────────────
            METADATA
        ───────────────────────────── */}

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">

          <span>
            {sourceCount}{" "}
            {sourceCount === 1 ? "source" : "sources"}
          </span>

          <span>•</span>

          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            {minutesToRead} min read
          </span>

          {bias?.tone && (
            <>
              <span>•</span>
              <span className="capitalize">{bias.tone} tone</span>
            </>
          )}

        </div>

        {/* ─────────────────────────────
            ACTIONS
        ───────────────────────────── */}

        <div className="mt-4 flex items-center justify-between border-t border-stroke pt-3 dark:border-white/10">

          <div className="flex items-center flex-wrap gap-1">

            {isSignedIn && (
              <>
                <ActionButton
                  label="More like this"
                  active={feedback === "LIKE"}
                  onClick={() => handleFeedback("LIKE")}
                >
                  <span className="text-base">♥</span>
                </ActionButton>

                <ActionButton
                  label="Less like this"
                  active={feedback === "DISLIKE"}
                  onClick={() => handleFeedback("DISLIKE")}
                >
                  <span className="text-base">↓</span>
                </ActionButton>
              </>
            )}

            <ActionButton
              label="Share story"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </ActionButton>

            {isSignedIn && (
              <ActionButton
                label={
                  isBookmarked
                    ? "Remove bookmark"
                    : "Save story"
                }
                active={isBookmarked}
                onClick={handleBookmark}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </ActionButton>
            )}

            {isSignedIn && (
              <ActionButton
                label="Hide story"
                active={Boolean(isSkipped)}
                onClick={handleSkip}
              >
                <MoreHorizontal className="h-4 w-4" />
              </ActionButton>
            )}

          </div>

        </div>

        {/* ─────────────────────────────
            PRIMARY ACTION
        ───────────────────────────── */}

        <Link
          to={`/story/${story.id}`}
          className="
            mt-3
            flex
            h-12
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-signal
            text-sm
            font-bold
            text-white
            transition
            hover:opacity-90
            active:scale-[0.99]
          "
        >
          Understand this story

          <span aria-hidden="true">
            →
          </span>
        </Link>

      </div>
    </article>
  );
}

export default StoryCard;