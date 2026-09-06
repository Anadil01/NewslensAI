import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  Clock3,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import StoryFeed from "../components/StoryFeed";
import LoadingSpinner from "../components/LoadingSpinner";
import PaginationControls from "../components/PaginationControls";
import { useFeed } from "../hooks/useFeed";

const MODE_COPY = {
  personalized: {
    eyebrow: "For you",
    title: "Your briefing",
    description:
      "Stories selected from the topics, sources, and reading signals that matter to you.",
    icon: Brain,
  },

  latest: {
    eyebrow: "Latest",
    title: "What's happening now",
    description:
      "The newest stories arriving across the NewsLensAI network.",
    icon: Clock3,
  },

  trending: {
    eyebrow: "Trending",
    title: "What people are following",
    description:
      "Stories gaining attention across multiple sources and topics.",
    icon: TrendingUp,
  },
};

const FEED_MODES = [
  {
    mode: "personalized",
    label: "For You",
  },
  {
    mode: "latest",
    label: "Latest",
  },
  {
    mode: "trending",
    label: "Trending",
  },
];

function Feed({ mode = "personalized" }) {
  const [copyMode] = [mode];

  const copy = MODE_COPY[copyMode] || MODE_COPY.personalized;
  const Icon = copy.icon;

  return (
    <FeedContent
      mode={mode}
      copy={copy}
      Icon={Icon}
    />
  );
}

function FeedContent({ mode, copy, Icon }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useFeed({
    mode,
    page,
    limit: 10,
  });

  const stories = data?.stories ?? [];
  const pagination = data?.pagination;
  const personalization = data?.personalization;

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (isError) {
    return (
      <section
        className="
          rounded-[32px]
          border
          border-red-200
          bg-white/80
          p-8
          dark:border-red-500/20
          dark:bg-slate-900/80
        "
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
          Feed unavailable
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          We couldn't load this feed.
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {error?.response?.data?.message ||
            error?.message ||
            "Please try again in a moment."}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      {/* =========================================================
          FEED HEADER
      ========================================================== */}

      <header
        className="
          sticky
          top-[72px]
          z-20
          -mx-4
          border-b
          border-slate-200/80
          bg-[#f8fafc]/90
          px-4
          py-4
          backdrop-blur-xl
          sm:-mx-6
          sm:px-6
          lg:-mx-8
          lg:px-8
          dark:border-white/[0.08]
          dark:bg-slate-950/90
        "
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className="
                  mt-0.5
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-amber-50
                  text-amber-600
                  dark:bg-amber-500/10
                  dark:text-amber-300
                "
              >
                <Icon size={17} />
              </div>

              <div className="min-w-0">
                <p
                  className="
                    text-[10px]
                    font-extrabold
                    uppercase
                    tracking-[0.18em]
                    text-amber-600
                    dark:text-amber-400
                  "
                >
                  {copy.eyebrow}
                </p>

                <h1
                  className="
                    mt-0.5
                    truncate
                    text-xl
                    font-black
                    tracking-tight
                    text-slate-950
                    dark:text-white
                  "
                >
                  {copy.title}
                </h1>
              </div>
            </div>

            {isFetching && !isLoading ? (
              <div
                className="
                  flex
                  shrink-0
                  items-center
                  gap-1.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-400
                "
              >
                <RefreshCw size={12} className="animate-spin" />
                Updating
              </div>
            ) : null}
          </div>

          {/* Mode navigation */}
          <nav
            aria-label="Feed views"
            className="
              mt-4
              flex
              gap-1
              overflow-x-auto
              pb-0.5
              scrollbar-none
            "
          >
            {FEED_MODES.map((item) => {
              const active = item.mode === mode;

              return (
                <Link
                  key={item.mode}
                  to={
                    item.mode === "personalized"
                      ? "/for-you"
                      : `/${item.mode}`
                  }
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

          {/* Personalized signal */}
          {mode === "personalized" && personalization ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <SignalPill>
                <Sparkles size={11} />
                {personalization.topicPreferenceCount ?? 0} topic signals
              </SignalPill>

              <SignalPill>
                {personalization.sourcePreferenceCount ?? 0} source signals
              </SignalPill>
            </div>
          ) : (
            <p className="mt-3 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
              {copy.description}
            </p>
          )}
        </div>
      </header>

      {/* =========================================================
          STORIES
      ========================================================== */}

      <main>
        {stories.length === 0 ? (
          <EmptyFeed mode={mode} />
        ) : (
          <StoryFeed stories={stories} />
        )}
      </main>

      {/* =========================================================
          PAGINATION
      ========================================================== */}

      {pagination && pagination.totalPages > 1 ? (
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

function SignalPill({ children }) {
  return (
    <span
      className="
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        border-slate-200
        bg-white
        px-3
        py-1.5
        text-[10px]
        font-bold
        text-slate-500
        dark:border-white/10
        dark:bg-slate-900
        dark:text-slate-400
      "
    >
      {children}
    </span>
  );
}

function EmptyFeed({ mode }) {
  const personalized = mode === "personalized";

  return (
    <div
      className="
        mx-auto
        max-w-3xl
        rounded-[28px]
        border
        border-dashed
        border-slate-300
        bg-white/60
        px-6
        py-20
        text-center
        dark:border-white/10
        dark:bg-slate-900/50
      "
    >
      <div
        className="
          mx-auto
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-2xl
          bg-slate-100
          text-slate-400
          dark:bg-slate-800
        "
      >
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
