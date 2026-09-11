import { Link } from "react-router-dom";
import { Brain, RefreshCw, Sparkles } from "lucide-react";

import StoryFeed from "../components/StoryFeed";
import { useFeed } from "../hooks/useFeed";

const FEED_MODES = [
  { mode: "personalized", label: "For You" },
  { mode: "latest", label: "Latest" },
  { mode: "trending", label: "Trending" },
];

function Feed({ mode = "personalized" }) {
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed({
    mode,
    limit: 10,
  });

  const stories = data?.pages?.flatMap((page) => page.stories ?? page.items ?? []) ?? [];

  if (isError) {
    return (
      <section className="rounded-[32px] border border-red-200 bg-white/80 p-8 dark:border-red-500/20 dark:bg-slate-900/80">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
          Feed unavailable
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          We couldn't load this feed.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {error?.response?.data?.message || error?.message || "Please try again in a moment."}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <header className="-mx-4 border-b border-slate-200/80 px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:border-white/[0.08]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <nav aria-label="Feed views" className="flex gap-1 overflow-x-auto scrollbar-none">
            {FEED_MODES.map((item) => {
              const active = item.mode === mode;
              return (
                <Link
                  key={item.mode}
                  to={item.mode === "personalized" ? "/for-you" : `/${item.mode}`}
                  className={[
                    "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition",
                    active
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {isFetching && !isLoading && !isFetchingNextPage ? (
            <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <RefreshCw size={12} className="animate-spin" />
              <span className="hidden sm:inline">Updating</span>
            </div>
          ) : null}
        </div>
      </header>

      <main>
        {!isLoading && stories.length === 0 ? (
          <EmptyFeed mode={mode} />
        ) : (
          <StoryFeed
            stories={stories}
            loading={isLoading}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        )}
      </main>
    </div>
  );
}

function EmptyFeed({ mode }) {
  const personalized = mode === "personalized";

  return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-dashed border-slate-300 bg-white/60 px-6 py-20 text-center dark:border-white/10 dark:bg-slate-900/50">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        {personalized ? <Brain size={20} /> : <Sparkles size={20} />}
      </div>
      
      <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
        {personalized ? "Your feed is still learning" : "Nothing here yet"}
      </h2>
      
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        {personalized
          ? "Follow a few topics, read some stories, and NewsLensAI will start tuning your briefing."
          : "New stories will appear here as they are ingested and processed."}
      </p>
    </div>
  );
}

export default Feed;