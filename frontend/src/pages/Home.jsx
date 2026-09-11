import { Link } from "react-router-dom";
import { ArrowRight, Brain, Clock3, Sparkles, TrendingUp } from "lucide-react";

import StoryFeed from "../components/StoryFeed";
import QuickBriefing from "../components/QuickBriefing";
import { useStories } from "../hooks/useStories";

function Home() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStories({
    limit: 10,
    search: "",
  });

  const stories = data?.pages?.flatMap((page) => page.stories ?? page.items ?? []) ?? [];

  if (isError) {
    return (
      <section className="mx-auto max-w-[720px] rounded-[28px] border border-red-200 bg-white/80 p-6 shadow-sm dark:border-red-500/20 dark:bg-slate-900/80">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
          NewsLensAI
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          Your briefing couldn't load
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {error?.message || "Please try again in a moment."}
        </p>
      </section>
    );
  }

  return (
    <div className="pb-6">
      <header className="mx-auto mb-6 max-w-[720px]">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Sparkles size={15} />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]">
            Your news briefing
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl dark:text-white">
              Signals worth your attention.
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Understand what happened before you open the original coverage.
            </p>
          </div>

          <Link to="/for-you" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 transition hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-400">
            For you <ArrowRight size={14} />
          </Link>
        </div>

        <nav aria-label="Explore feeds" className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <FeedLink to="/for-you" icon={<Brain size={14} />} label="For You" />
          <FeedLink to="/latest" icon={<Clock3 size={14} />} label="Latest" />
          <FeedLink to="/trending" icon={<TrendingUp size={14} />} label="Trending" />
        </nav>
      </header>

      <div className="mx-auto max-w-[720px]">
        {stories.length > 0 && <QuickBriefing stories={stories} />}
      </div>

      <StoryFeed
        stories={stories}
        loading={isLoading}
        emptyMessage="New stories will appear here as they are ingested and understood."
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </div>
  );
}

function FeedLink({ to, icon, label }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-amber-300 hover:text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
      {icon}
      {label}
    </Link>
  );
}

export default Home;