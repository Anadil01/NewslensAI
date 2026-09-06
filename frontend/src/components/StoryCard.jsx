import { Link } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  Clock3,
  Globe2,
  Share2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useBookmarks } from "../hooks/useBookmarks";
import {
  useSetStoryFeedback,
  useStoryFeedback,
} from "../hooks/useStoryInteractions";
import { useToggleBookmark } from "../hooks/useToggleBookmark";

function formatRelativeTime(date) {
  if (!date) return "Recently";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently";
  }

  const diff = Date.now() - parsedDate.getTime();

  if (diff < 0) return "Just now";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function estimateReadingTime(text) {
  if (!text) return 1;

  const words = String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));
}

function getTopicName(story) {
  return (
    story?.topic?.name ||
    story?.topicName ||
    story?.storyTopics?.[0]?.topic?.name ||
    "News"
  );
}

function getSourceName(story) {
  return story?.source?.name || story?.sourceName || "Unknown source";
}

function getDescription(story) {
  return (
    story?.aiSummaries?.[0]?.summary ||
    story?.aiSummary?.summary ||
    story?.excerpt ||
    story?.summary ||
    story?.description ||
    "Open this story to understand what happened."
  );
}

function getSourceCount(story) {
  if (Array.isArray(story?.cluster?.stories)) {
    return story.cluster.stories.length;
  }

  if (Array.isArray(story?.cluster?.sources)) {
    return story.cluster.sources.length;
  }

  if (typeof story?.sourceCount === "number") {
    return story.sourceCount;
  }

  return null;
}

function getImageUrl(story) {
  return (
    story?.imageUrl ||
    story?.image ||
    story?.thumbnail ||
    story?.thumbnailUrl ||
    story?.image_url ||
    null
  );
}

function getSourceInitials(source) {
  if (!source) return "NL";

  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

async function shareStory(story) {
  const url = `${window.location.origin}/story/${story.id}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: story.title,
        text: getDescription(story),
        url,
      });
    } catch {
      // User cancelled the native share dialog.
    }

    return;
  }

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Clipboard may be unavailable in some browsers.
  }
}

export default function StoryCard({ story }) {
  const { user } = useAuth();

  const isSignedIn = Boolean(user);

  const { data: bookmarkedStories = [] } = useBookmarks();

  const toggleBookmark = useToggleBookmark();
  const { data: feedback } = useStoryFeedback(story.id, {
    enabled: isSignedIn,
  });
  const setFeedback = useSetStoryFeedback(story.id);

  const isBookmarked = bookmarkedStories.some(
    (bookmarkedStory) => bookmarkedStory.id === story.id
  );

  const topic = getTopicName(story);
  const source = getSourceName(story);
  const description = getDescription(story);
  const imageUrl = getImageUrl(story);
  const sourceCount = getSourceCount(story);

  const readingTime = estimateReadingTime(
    story?.content || story?.excerpt || description
  );

  const storyUrl = `/story/${story.id}`;

  const handleBookmark = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isSignedIn) return;

    toggleBookmark.mutate(story.id);
  };

  const handleShare = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    await shareStory(story);
  };

  const handleFeedback = (event, value) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isSignedIn) return;

    setFeedback.mutate(feedback === value ? null : value);
  };

  return (
    <article
      className="
        group
        overflow-hidden
        rounded-[26px]
        border
        border-slate-200/80
        bg-white
        shadow-[0_8px_30px_rgba(15,23,42,0.05)]
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)]
        dark:border-white/[0.08]
        dark:bg-slate-900
      "
    >
      {/* =========================================================
          VISUAL
      ========================================================= */}

      <Link
        to={storyUrl}
        className="
          relative
          block
          aspect-[16/10]
          w-full
          overflow-hidden
          bg-slate-100
          dark:bg-slate-800
        "
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="
              h-full
              w-full
              object-cover
              transition-transform
              duration-700
              ease-out
              group-hover:scale-[1.04]
            "
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget.nextElementSibling?.classList.remove(
                "hidden"
              );
            }}
          />
        ) : null}

        {/* Image fallback */}
        <div
          className={[
            "absolute inset-0 flex items-center justify-center overflow-hidden",
            imageUrl ? "hidden" : "",
          ].join(" ")}
        >
          <div
            className="
              absolute
              inset-0
              bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.20),transparent_40%)]
              dark:bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_40%)]
            "
          />

          <div
            className="
              relative
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-3xl
              border
              border-white/70
              bg-white/75
              text-lg
              font-black
              text-slate-700
              shadow-lg
              backdrop-blur
              dark:border-white/10
              dark:bg-white/10
              dark:text-white
            "
          >
            {getSourceInitials(source)}
          </div>

          <div
            className="
              absolute
              bottom-5
              flex
              items-center
              gap-1.5
              rounded-full
              border
              border-white/60
              bg-white/70
              px-3
              py-1.5
              text-[10px]
              font-bold
              tracking-wide
              text-slate-700
              shadow-sm
              backdrop-blur
              dark:border-white/10
              dark:bg-slate-950/60
              dark:text-slate-200
            "
          >
            <Sparkles size={12} />
            NewsLensAI
          </div>
        </div>

        {/* Image readability gradient */}
        <div
          className="
            pointer-events-none
            absolute
            inset-x-0
            bottom-0
            h-24
            bg-gradient-to-t
            from-black/45
            to-transparent
          "
        />

        {/* Topic */}
        <div className="absolute left-4 top-4">
          <span
            className="
              inline-flex
              items-center
              rounded-full
              border
              border-white/50
              bg-white/90
              px-3
              py-1.5
              text-[10px]
              font-extrabold
              uppercase
              tracking-[0.14em]
              text-slate-800
              shadow-sm
              backdrop-blur
              dark:border-white/10
              dark:bg-slate-950/80
              dark:text-white
            "
          >
            {topic}
          </span>
        </div>

        {/* Freshness */}
        <div className="absolute right-4 top-4">
          <span
            className="
              inline-flex
              items-center
              rounded-full
              bg-black/65
              px-3
              py-1.5
              text-[10px]
              font-bold
              text-white
              backdrop-blur
            "
          >
            {formatRelativeTime(story?.publishedAt)}
          </span>
        </div>

        {/* Multi-source coverage */}
        {sourceCount && sourceCount > 1 ? (
          <div className="absolute bottom-4 right-4">
            <span
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-full
                bg-black/70
                px-3
                py-1.5
                text-[10px]
                font-bold
                text-white
                backdrop-blur
              "
            >
              <Globe2 size={12} />
              {sourceCount} sources
            </span>
          </div>
        ) : null}
      </Link>

      {/* =========================================================
          CONTENT
      ========================================================= */}

      <div className="p-5 sm:p-6">
        {/* Source */}
        <div
          className="
            flex
            items-center
            gap-2
            text-xs
            font-semibold
            text-slate-500
            dark:text-slate-400
          "
        >
          <span
            className="
              max-w-[70%]
              truncate
              uppercase
              tracking-[0.08em]
              text-slate-700
              dark:text-slate-200
            "
          >
            {source}
          </span>

          <span
            className="
              h-1
              w-1
              shrink-0
              rounded-full
              bg-slate-300
              dark:bg-slate-600
            "
          />

          <span className="shrink-0">
            {formatRelativeTime(story?.publishedAt)}
          </span>
        </div>

        {/* Headline */}
        <Link to={storyUrl} className="block">
          <h2
            className="
              mt-3
              line-clamp-2
              text-xl
              font-extrabold
              leading-[1.2]
              tracking-[-0.025em]
              text-slate-950
              transition-colors
              group-hover:text-amber-700
              dark:text-white
              dark:group-hover:text-amber-400
              sm:text-[22px]
            "
          >
            {story.title}
          </h2>
        </Link>

        {/* AI Brief */}
        <div
          className="
            mt-4
            rounded-2xl
            border
            border-slate-200/70
            bg-slate-50
            p-4
            dark:border-white/[0.06]
            dark:bg-slate-800/60
          "
        >
          <div
            className="
              mb-2
              flex
              items-center
              gap-2
              text-[10px]
              font-extrabold
              uppercase
              tracking-[0.16em]
              text-teal-700
              dark:text-teal-300
            "
          >
            <Sparkles size={13} />

            AI Brief
          </div>

          <p
            className="
              line-clamp-3
              text-sm
              leading-6
              text-slate-600
              dark:text-slate-300
            "
          >
            {description}
          </p>
        </div>

        {/* Metadata */}
        <div
          className="
            mt-4
            flex
            flex-wrap
            items-center
            gap-x-4
            gap-y-2
            text-xs
            font-medium
            text-slate-500
            dark:text-slate-400
          "
        >
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={13} />
            {readingTime} min read
          </span>

          {sourceCount && sourceCount > 1 ? (
            <span className="inline-flex items-center gap-1.5">
              <Globe2 size={13} />
              {sourceCount} sources
            </span>
          ) : null}
        </div>

        {/* =======================================================
            ACTIONS
        ======================================================== */}

        <div
          className="
            mt-5
            flex
            items-center
            justify-between
            gap-3
            border-t
            border-slate-200/80
            pt-4
            dark:border-white/[0.08]
          "
        >
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Save */}
            {isSignedIn ? (
              <IconButton
                label={isBookmarked ? "Remove from saved stories" : "Save story"}
                active={isBookmarked}
                disabled={toggleBookmark.isPending}
                onClick={handleBookmark}
              >
                {isBookmarked ? (
                  <BookmarkCheck size={18} />
                ) : (
                  <Bookmark size={18} />
                )}
              </IconButton>
            ) : null}

            {/* Share */}
            <IconButton label="Share story" onClick={handleShare}>
              <Share2 size={18} />
            </IconButton>

            {/* Feed feedback */}
            {isSignedIn ? (
              <>
                <IconButton
                  label="More stories like this"
                  active={feedback === "LIKE"}
                  disabled={setFeedback.isPending}
                  onClick={(event) => handleFeedback(event, "LIKE")}
                >
                  <ThumbsUp size={17} />
                </IconButton>

                <IconButton
                  label="Fewer stories like this"
                  active={feedback === "DISLIKE"}
                  disabled={setFeedback.isPending}
                  onClick={(event) => handleFeedback(event, "DISLIKE")}
                >
                  <ThumbsDown size={17} />
                </IconButton>
              </>
            ) : null}
          </div>

          {/* Primary action */}
          <Link
            to={storyUrl}
            className="
              inline-flex
              shrink-0
              items-center
              gap-2
              rounded-full
              bg-slate-950
              px-3
              py-2
              text-xs
              font-bold
              text-white
              shadow-sm
              transition-all
              hover:-translate-y-0.5
              hover:bg-slate-800
              hover:shadow-md
              dark:bg-white
              dark:text-slate-950
              dark:hover:bg-slate-100
              sm:px-4
              sm:py-2.5
            "
          >
            Understand
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function IconButton({
  children,
  label,
  active = false,
  disabled = false,
  onClick,
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        `
          inline-flex
          h-9
          w-9
          items-center
          justify-center
          rounded-full
          border
          transition-all
          disabled:cursor-not-allowed
          disabled:opacity-50
          sm:h-10
          sm:w-10
        `,
        active
          ? `
            border-amber-300
            bg-amber-50
            text-amber-700
            dark:border-amber-500/30
            dark:bg-amber-500/10
            dark:text-amber-300
          `
          : `
            border-slate-200
            bg-white
            text-slate-500
            hover:border-slate-300
            hover:bg-slate-50
            hover:text-slate-800
            dark:border-white/[0.08]
            dark:bg-slate-900
            dark:text-slate-400
            dark:hover:bg-slate-800
            dark:hover:text-white
          `,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
