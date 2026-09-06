import { useState } from "react";
import { Sparkles, Clock3, TrendingUp } from "lucide-react";

import StoryCard from "../components/StoryCard";
import { usePersonalizedFeed } from "../hooks/useFeed";

const MODES = [
  {
    id: "personalized",
    label: "For You",
    icon: Sparkles,
  },
  {
    id: "latest",
    label: "Latest",
    icon: Clock3,
  },
  {
    id: "trending",
    label: "Trending",
    icon: TrendingUp,
  },
];

function StorySkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-3xl animate-pulse overflow-hidden rounded-3xl border border-stroke bg-card">
        <div className="h-48 bg-shell sm:h-60" />

        <div className="space-y-4 p-6">
          <div className="h-3 w-32 rounded bg-shell" />
          <div className="h-7 w-4/5 rounded bg-shell" />
          <div className="h-4 w-full rounded bg-shell" />
          <div className="h-4 w-3/4 rounded bg-shell" />

          <div className="h-12 w-full rounded-xl bg-shell" />
        </div>
      </div>
    </div>
  );
}

function FeedError() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md rounded-3xl border border-stroke bg-card p-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-signal/10">
          <Sparkles className="h-5 w-5 text-signal" />
        </div>

        <h2 className="mt-4 text-lg font-bold text-ink">
          Your briefing couldn't load
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          Something went wrong while preparing your stories.
          Please try again in a moment.
        </p>
      </div>
    </div>
  );
}

export default function ForYou() {
  const [mode, setMode] = useState("personalized");

  const {
    data,
    isLoading,
    isError,
  } = usePersonalizedFeed(mode);

  const stories = data?.stories || [];

  return (
    <main className="h-[calc(100vh-81px)] min-h-0 overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-4 sm:px-6">
        {/* Compact page header */}
        <header className="shrink-0 py-5 sm:py-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-signal" />

                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-signal">
                  Your news briefing
                </p>
              </div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Signals worth your attention.
              </h1>

              <p className="mt-1 hidden text-sm text-muted sm:block">
                Understand what happened before you open the original
                coverage.
              </p>
            </div>

            <span className="hidden text-xs font-semibold text-muted lg:block">
              {stories.length > 0
                ? `${stories.length} stories`
                : "Your briefing"}
            </span>
          </div>

          {/* Feed modes */}
          <div className="mt-4 flex gap-2">
            {MODES.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition",
                    active
                      ? "bg-signal text-white shadow-sm"
                      : "border border-stroke bg-card text-ink hover:border-signal/30",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* ONLY THIS AREA SCROLLS */}
        <section
          className="
            min-h-0
            flex-1
            snap-y
            snap-mandatory
            overflow-y-auto
            overscroll-contain
            scroll-smooth
            scrollbar-none
          "
        >
          {isLoading && (
            <div className="h-full snap-start py-2">
              <StorySkeleton />
            </div>
          )}

          {isError && (
            <div className="h-full snap-start py-2">
              <FeedError />
            </div>
          )}

          {!isLoading && !isError && stories.length === 0 && (
            <div className="flex h-full snap-start items-center justify-center">
              <div className="text-center">
                <h2 className="text-lg font-bold text-ink">
                  No stories yet
                </h2>

                <p className="mt-2 text-sm text-muted">
                  Your briefing will appear here as stories become
                  available.
                </p>
              </div>
            </div>
          )}

          {!isLoading &&
            !isError &&
            stories.map((story) => (
              <div
                key={story.id}
                className="
                  flex
                  min-h-full
                  snap-start
                  snap-always
                  items-center
                  justify-center
                  py-3
                  sm:py-4
                "
              >
                <div className="w-full max-w-3xl">
                  <StoryCard story={story} />
                </div>
              </div>
            ))}
        </section>
      </div>
    </main>
  );
}