import { useAuth } from "../context/useAuth";
import { useBookmarks } from "../hooks/useBookmarks";
import { useToggleBookmark } from "../hooks/useToggleBookmark";
import {
  useStoryFeedback,
  useSetStoryFeedback,
  useStorySkip,
  useToggleStorySkip,
} from "../hooks/useStoryInteractions";

/*
 * Personalization controls for one story.
 *
 * Normal mode:
 *   Used in story/detail surfaces.
 *
 * Compact mode:
 *   Used inside the StoryCard "More" menu.
 */
function StoryActions({ storyId, compact = false, onAction }) {
  const { user } = useAuth();

  const isSignedIn = Boolean(user);

  const { data: feedback } = useStoryFeedback(storyId, {
    enabled: isSignedIn,
  });

  const setFeedback = useSetStoryFeedback(storyId);

  const { data: isSkipped } = useStorySkip(storyId, {
    enabled: isSignedIn,
  });

  const toggleSkip = useToggleStorySkip(storyId);

  const { data: bookmarkedStories = [] } = useBookmarks({
    enabled: isSignedIn,
  });

  const toggleBookmark = useToggleBookmark();

  const isBookmarked = bookmarkedStories.some(
    (bookmarkedStory) =>
      bookmarkedStory.id === storyId ||
      bookmarkedStory.storyId === storyId ||
      bookmarkedStory.story?.id === storyId
  );

  if (!isSignedIn) {
    return null;
  }

  const applyFeedback = (value) => {
    setFeedback.mutate(
      feedback === value ? null : value,
      {
        onSuccess: () => {
          onAction?.();
        },
      }
    );
  };

  const handleBookmark = () => {
    toggleBookmark.mutate(storyId, {
      onSuccess: () => {
        onAction?.();
      },
    });
  };

  const handleSkip = () => {
    toggleSkip.mutate(!isSkipped, {
      onSuccess: () => {
        onAction?.();
      },
    });
  };

  if (compact) {
    return (
      <div className="space-y-1">
        <MenuButton
          onClick={() => applyFeedback("LIKE")}
          disabled={setFeedback.isPending}
          active={feedback === "LIKE"}
        >
          <ThumbUpIcon />
          <span>More like this</span>
        </MenuButton>

        <MenuButton
          onClick={() => applyFeedback("DISLIKE")}
          disabled={setFeedback.isPending}
          active={feedback === "DISLIKE"}
        >
          <ThumbDownIcon />
          <span>Less like this</span>
        </MenuButton>

        <div className="my-2 border-t border-stroke" />

        <MenuButton
          onClick={handleBookmark}
          disabled={toggleBookmark.isPending}
          active={isBookmarked}
        >
          <BookmarkIcon filled={isBookmarked} />
          <span>{isBookmarked ? "Remove from saved" : "Save story"}</span>
        </MenuButton>

        <MenuButton
          onClick={handleSkip}
          disabled={toggleSkip.isPending}
          active={Boolean(isSkipped)}
        >
          <SkipIcon />
          <span>
            {isSkipped ? "Show in feed again" : "Hide from feed"}
          </span>
        </MenuButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="mr-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        Tune your feed
      </p>

      <ActionButton
        onClick={() => applyFeedback("LIKE")}
        disabled={setFeedback.isPending}
        active={feedback === "LIKE"}
        aria-pressed={feedback === "LIKE"}
      >
        <ThumbUpIcon />
        More like this
      </ActionButton>

      <ActionButton
        onClick={() => applyFeedback("DISLIKE")}
        disabled={setFeedback.isPending}
        active={feedback === "DISLIKE"}
        aria-pressed={feedback === "DISLIKE"}
      >
        <ThumbDownIcon />
        Less like this
      </ActionButton>

      <ActionButton
        onClick={handleBookmark}
        disabled={toggleBookmark.isPending}
        active={isBookmarked}
        aria-pressed={isBookmarked}
      >
        <BookmarkIcon filled={isBookmarked} />
        {isBookmarked ? "Saved" : "Save"}
      </ActionButton>

      <ActionButton
        onClick={handleSkip}
        disabled={toggleSkip.isPending}
        active={Boolean(isSkipped)}
        aria-pressed={Boolean(isSkipped)}
      >
        <SkipIcon />
        {isSkipped ? "Hidden from feed" : "Hide from feed"}
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  active,
  ...props
}) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-signal/30 bg-signal/10 text-signal"
          : "border-stroke bg-card text-muted hover:border-signal/30 hover:bg-shell hover:text-ink",
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function MenuButton({
  children,
  active,
  ...props
}) {
  return (
    <button
      type="button"
      className={[
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "bg-signal/10 text-signal"
          : "text-ink hover:bg-shell",
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

/* =========================================================
   ICONS
========================================================= */

function ThumbUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Z" />
      <path d="M7 11l4-7a2 2 0 0 1 3.7 1.2L14 9h4.5a2 2 0 0 1 2 2.4l-1.3 6A2 2 0 0 1 17.2 19H7" />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M7 13V4H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3Z" />
      <path d="M7 13l4 7a2 2 0 0 0 3.7-1.2L14 15h4.5a2 2 0 0 0 2-2.4l-1.3-6A2 2 0 0 0 17.2 5H7" />
    </svg>
  );
}

function BookmarkIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M6 4h12v16l-6-4-6 4V4Z" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default StoryActions;