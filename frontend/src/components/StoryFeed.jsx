import { useEffect, useRef } from "react";
import StoryCard from "./StoryCard";

export default function StoryFeed({
  stories = [],
  loading = false,
  emptyMessage = "No stories found.",
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}) {
  const observerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage?.();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (loading) {
    return <StoryFeedSkeleton />;
  }

  if (!stories.length) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-white/10 dark:bg-slate-900/50">
        <div className="max-w-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <span className="text-xl">◌</span>
          </div>

          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            Nothing to show yet
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section aria-label="News stories" className="w-full">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
        {stories.map((story, index) => (
          <div
            key={`${story.id}-${index}`}
            className="animate-[fadeIn_0.35s_ease-out]"
            style={{
              animationDelay: `${Math.min((index % 10) * 45, 250)}ms`,
              animationFillMode: "both",
            }}
          >
            <StoryCard story={story} />
          </div>
        ))}

        {/* Infinite Scroll Trigger & Loader */}
        <div ref={observerRef} className="flex h-16 items-center justify-center pt-4">
          {isFetchingNextPage && (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          )}
          {!hasNextPage && stories.length > 0 && (
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              You're all caught up
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function StoryFeedSkeleton() {
  return (
    <section aria-label="Loading stories">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-slate-900"
          >
            <div className="aspect-[16/10] w-full animate-pulse bg-slate-200 dark:bg-slate-800" />

            <div className="space-y-4 p-5 sm:p-6">
              <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />

              <div className="space-y-2">
                <div className="h-5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800/70">
                <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-11/12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}