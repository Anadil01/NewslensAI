import { useMemo, useState } from "react";

import { Link } from "react-router-dom";

import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/useTheme";
import {
  usePreferences,
  useReplacePreferences
} from "../hooks/useTopics";
import { useSourcePreferences } from "../hooks/useSources";

/*
 * Account and personalization settings.
 *
 * The topic weight editor maps to PUT /me/preferences, which replaces the
 * whole preference set in one transaction. That endpoint rejects an empty
 * array, so a user who wants to clear everything has to unfollow topics
 * from the Topics page instead — the form below only re-weights rows that
 * already exist.
 *
 * Weights run -5..5 on the backend. Negative values suppress a topic
 * rather than remove it, which is why the slider spans both directions.
 */

const WEIGHT_MIN = -5;
const WEIGHT_MAX = 5;

const describeWeight = (weight) => {
  if (weight <= -3) return "Much less";
  if (weight < 0) return "Less";
  if (weight === 0) return "Neutral";
  if (weight < 3) return "More";
  return "Much more";
};

function Settings() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const {
    data: preferences = [],
    isLoading: prefLoading,
    isError: isPrefError,
    error: prefError
  } = usePreferences({
    enabled: Boolean(user)
  });

  const {
    data: sourcePreferences = [],
    isLoading: sourceLoading,
    isError: isSourceError,
    error: sourceError
  } = useSourcePreferences({
    enabled: Boolean(user)
  });

  const isLoading = prefLoading || sourceLoading;
  const isError = isPrefError || isSourceError;
  const error = prefError || sourceError;

  const replacePreferences = useReplacePreferences();

  /*
   * `draft` is an overlay, not a copy: it only holds topicIds the user has
   * actually moved. Everything else reads straight from the server data,
   * so a refetch never has to be synced into local state and there is no
   * effect to keep the two in step.
   */
  const [draft, setDraft] = useState({});

  const isDirty = useMemo(() => {
    return preferences.some(
      (preference) =>
        draft[preference.topicId] !== undefined &&
        draft[preference.topicId] !== preference.preference
    );
  }, [preferences, draft]);

  const handleSave = () => {
    const payload = preferences.map((preference) => ({
      topicId: preference.topicId,
      preference:
        draft[preference.topicId] ?? preference.preference
    }));

    // Drop the overlay once the server has the new weights, otherwise it
    // would keep shadowing the refetched values.
    replacePreferences.mutate(payload, {
      onSuccess: () => setDraft({})
    });
  };

  const handleReset = () => {
    setDraft({});
  };


  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[32px] border border-red-200 bg-white/75 p-6 shadow-sm backdrop-blur-xl sm:p-8 lg:p-10 dark:border-red-500/20 dark:bg-slate-900/70">
          <div className="relative max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
              Settings unavailable
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              We couldn't load your preferences.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              {error?.response?.data?.message ||
                error?.message ||
                "Please try again in a moment."}
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* --------------------------------------------------
          HEADER
      -------------------------------------------------- */}

      <section className="relative overflow-hidden rounded-[32px] border border-stroke bg-white/75 p-6 shadow-sm backdrop-blur-xl sm:p-8 lg:p-10 dark:border-white/10 dark:bg-slate-900/70">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
            Account
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            Settings
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Manage your profile, appearance and how strongly each topic
            influences your personalized feed.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------
          PROFILE
      -------------------------------------------------- */}

      <section className="rounded-[32px] border border-stroke bg-white/75 p-6 shadow-sm backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-slate-900/70">
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
          Profile
        </h2>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-stroke dark:bg-slate-950/60 dark:ring-white/10">
            <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Name
            </dt>

            <dd className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
              {user?.name || "—"}
            </dd>
          </div>

          <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-stroke dark:bg-slate-950/60 dark:ring-white/10">
            <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Email
            </dt>

            <dd className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
              {user?.email || "—"}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={logout}
          className="mt-6 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:bg-slate-950 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Sign out
        </button>
      </section>

      {/* --------------------------------------------------
          APPEARANCE
      -------------------------------------------------- */}

      <section className="rounded-[32px] border border-stroke bg-white/75 p-6 shadow-sm backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              Appearance
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Currently using {theme} mode.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === "dark"}
            className="rounded-2xl border border-stroke bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-amber-300 hover:text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:text-white"
          >
            Switch to {theme === "dark" ? "light" : "dark"}
          </button>
        </div>
      </section>

      {/* --------------------------------------------------
          TOPIC WEIGHTS
      -------------------------------------------------- */}

      <section className="rounded-[32px] border border-stroke bg-white/75 p-6 shadow-sm backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              Topic weights
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Nudge a topic up or down. Negative weights push it out of
              your feed without unfollowing it.
            </p>
          </div>

          <span className="rounded-full border border-stroke bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
            {sourcePreferences.length} source signals
          </span>
        </div>

        {preferences.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-stroke bg-white/60 px-6 py-12 text-center dark:border-white/10 dark:bg-slate-900/50">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              No topics followed yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Follow a few topics and they will show up here with
              adjustable weights.
            </p>

            <Link
              to="/topics"
              className="mt-5 inline-block rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Browse topics
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-4">
              {preferences.map((preference) => {
                const weight =
                  draft[preference.topicId] ??
                  preference.preference;

                return (
                  <li
                    key={preference.topicId}
                    className="rounded-2xl bg-white/70 p-4 ring-1 ring-stroke dark:bg-slate-950/60 dark:ring-white/10"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <label
                        htmlFor={`weight-${preference.topicId}`}
                        className="text-sm font-bold text-slate-900 dark:text-white"
                      >
                        {preference.topic?.name || "Topic"}
                      </label>

                      <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
                        {describeWeight(weight)}
                      </span>
                    </div>

                    <input
                      id={`weight-${preference.topicId}`}
                      type="range"
                      min={WEIGHT_MIN}
                      max={WEIGHT_MAX}
                      step={1}
                      value={weight}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [preference.topicId]: Number(
                            event.target.value
                          )
                        }))
                      }
                      className="mt-3 w-full accent-amber-500"
                    />
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || replacePreferences.isPending}
                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {replacePreferences.isPending
                  ? "Saving..."
                  : "Save weights"}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={!isDirty || replacePreferences.isPending}
                className="rounded-2xl border border-stroke bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
              >
                Reset
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default Settings;