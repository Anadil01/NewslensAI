import { Link } from "react-router-dom";

import LoadingSpinner from "../components/LoadingSpinner";
import StoryCard from "../components/StoryCard";
import { useAuth } from "../context/useAuth";
import { useBookmarks } from "../hooks/useBookmarks";

const Bookmarks = () => {
  const { user } = useAuth();

  // Disabled while signed out, so isPending stays true without a request;
  // the !user branch below renders first in that case.
  const { data: stories = [], isPending, isError, error } = useBookmarks();

  return (
    <section className="space-y-8">
      <div className="rounded-[32px] border border-stroke bg-[linear-gradient(135deg,rgba(240,253,250,0.92),rgba(255,255,255,0.9))] p-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)] sm:p-10 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(13,148,136,0.18),rgba(15,23,42,0.9))]">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-mint">
          Your reading shelf
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              Saved stories
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Keep the links that deserve a second look and come back when you
              have time to go deeper.
            </p>
          </div>

          <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-stroke dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10">
            {stories.length} bookmarks
          </div>
        </div>
      </div>

      {!user ? (
        <div className="rounded-[28px] border border-dashed border-stroke bg-white/70 p-10 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Sign in to view bookmarks
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
            Your saved stories live behind your account so you can access them
            from anywhere.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Go to login
          </Link>
        </div>
      ) : isPending ? (
        <LoadingSpinner label="Loading bookmarks..." />
      ) : isError ? (
        <div className="rounded-[28px] border border-red-200 bg-white/80 p-10 text-center shadow-sm dark:border-red-500/20 dark:bg-slate-900/80">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Bookmarks unavailable
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
            {error?.response?.data?.message ||
              error?.message ||
              "We couldn't load your reading shelf. Please try again in a moment."}
          </p>
        </div>
      ) : stories.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-stroke bg-white/70 p-10 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            No bookmarks yet
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
            Save a story from the home feed and it will show up here.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full border border-stroke bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-signal-deep"
          >
            Explore stories
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Bookmarks;