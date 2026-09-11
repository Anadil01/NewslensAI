import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Clock3,
  ArrowRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useLanguage } from "../context/useLanguage";

export default function QuickBriefing({ stories = [] }) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);

  // Take the top stories that actually have an AI summary
  const briefingStories = stories
    .filter((story) => getLatestSummaryRecord(story, language)?.summary)
    .slice(0, 5);

  const activeStory = briefingStories[currentIndex];
  const activeSummary = activeStory ? getLatestSummaryRecord(activeStory, language) : null;

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const SLIDE_DURATION_MS = 12000;
  const TICK_INTERVAL_MS = 100;

  // --------------------------------------------------------------------------
  // Audio Speech (Web Speech API)
  // --------------------------------------------------------------------------
  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakActiveStory = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    if (!isAudioEnabled || !activeSummary?.summary) return;

    const utterance = new SpeechSynthesisUtterance(activeSummary.summary);
    utterance.rate = 1.0;
    utterance.lang = language === "hi" ? "hi-IN" : "en-US";

    window.speechSynthesis.speak(utterance);
  }, [isAudioEnabled, activeSummary, language]);

  // --------------------------------------------------------------------------
  // Navigation Handlers
  // --------------------------------------------------------------------------
  const goToNext = useCallback(() => {
    setProgress(0);
    stopSpeech();
    if (currentIndex < briefingStories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsOpen(false);
    }
  }, [currentIndex, briefingStories.length, stopSpeech]);

  const goToPrev = useCallback(() => {
    setProgress(0);
    stopSpeech();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, stopSpeech]);

  // Trigger speech when slide index changes or audio is toggled
  useEffect(() => {
    if (isOpen && isAudioEnabled) {
      speakActiveStory();
    } else {
      stopSpeech();
    }
  }, [isOpen, currentIndex, isAudioEnabled, speakActiveStory, stopSpeech]);

  // Auto-advancing Timer
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (TICK_INTERVAL_MS / SLIDE_DURATION_MS) * 100;
        if (next >= 100) {
          goToNext();
          return 0;
        }
        return next;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, goToNext]);

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        stopSpeech();
        setIsOpen(false);
      }
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === " ") {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goToNext, goToPrev, stopSpeech]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) goToNext();
    else if (diff < -50) goToPrev();
  };

  // ──────────────────────────────────────────────────────────
  // CONDITIONAL RETURN MUST BE *AFTER* ALL HOOKS ABOVE
  // ──────────────────────────────────────────────────────────
  if (briefingStories.length < 3) {
    return null;
  }

  const totalMinutes = Math.max(
    1,
    Math.ceil(
      briefingStories.reduce((acc, s) => {
        const text = getLatestSummaryRecord(s, language)?.summary || s.excerpt;
        return acc + estimateReadingTime(s, text) * 60;
      }, 0) / 60
    )
  );

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-[32px] border border-stroke bg-white/75 p-6 shadow-sm backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-slate-900/70">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">
              <Sparkles size={14} />
              <span>Today&apos;s Quick Briefing</span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              {briefingStories.length} stories <span className="text-slate-300 dark:text-slate-600">·</span> {totalMinutes} min
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setProgress(0);
              setIsOpen(true);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Play size={16} fill="currentColor" />
            Start briefing
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-5">
          {briefingStories.map((story, idx) => {
            const summary = getLatestSummaryRecord(story, language);
            const text = summary?.summary || story.excerpt;
            const readTimeSec = estimateReadingTime(story, text) * 60;

            return (
              <div
                key={story.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setProgress(0);
                  setIsOpen(true);
                }}
                className="group flex cursor-pointer items-center gap-4 rounded-2xl p-2 transition hover:bg-slate-50 sm:flex-col sm:items-start sm:gap-2 dark:hover:bg-slate-800/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500 transition group-hover:bg-amber-500 group-hover:text-slate-950 dark:bg-slate-800 dark:text-slate-400">
                  0{idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-900 group-hover:text-amber-600 sm:text-xs dark:text-white dark:group-hover:text-amber-400">
                    {story.title}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    <Clock3 size={10} />
                    {readTimeSec}s
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Full-Screen Player Overlay */}
      {isOpen && activeStory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-2xl sm:p-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 sm:p-6">
            <div className="flex flex-1 max-w-lg items-center gap-1.5">
              {briefingStories.map((_, idx) => (
                <div key={idx} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full bg-amber-400 transition-all duration-100 ease-linear"
                    style={{
                      width:
                        idx === currentIndex
                          ? `${progress}%`
                          : idx < currentIndex
                          ? "100%"
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="ml-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label={isPaused ? "Play" : "Pause"}
              >
                {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
              </button>

              <button
                type="button"
                onClick={() => setIsAudioEnabled((a) => !a)}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full transition",
                  isAudioEnabled ? "bg-amber-500 text-slate-950 font-bold" : "bg-white/10 text-white hover:bg-white/20",
                ].join(" ")}
                aria-label="Toggle Audio Reader"
              >
                {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  setIsOpen(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close Player"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="relative z-10 w-full max-w-2xl rounded-[36px] border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-10"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <span>{activeStory.storyTopics?.[0]?.topic?.name || activeStory.topic?.name || "News"}</span>
              <span>·</span>
              <span className="text-slate-400">{activeStory.source?.name || "News Source"}</span>
            </div>

            <h2 className="mt-4 text-2xl font-black leading-tight text-white sm:text-3xl">
              {activeStory.title}
            </h2>

            <div className="mt-6 rounded-2xl bg-white/5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400/80">
                What happened
              </p>
              <p className="mt-2 text-base leading-relaxed text-slate-200">
                {activeSummary?.summary || activeStory.excerpt}
              </p>
            </div>

            {getKeyPoints(activeSummary).length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                  Key takeaways
                </p>
                <ul className="mt-3 space-y-2.5">
                  {getKeyPoints(activeSummary).map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Link
                to={`/story/${activeStory.id}`}
                onClick={() => {
                  stopSpeech();
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 transition hover:text-amber-300"
              >
                Read deep dive <ArrowRight size={16} />
              </Link>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Previous story"
                >
                  <ChevronLeft size={20} />
                </button>

                <button
                  type="button"
                  onClick={goToNext}
                  className="flex h-12 items-center justify-center gap-2 rounded-full bg-amber-500 px-6 font-bold text-slate-950 transition hover:bg-amber-400"
                >
                  {currentIndex === briefingStories.length - 1 ? "Finish" : "Next"}
                  {currentIndex !== briefingStories.length - 1 && <ChevronRight size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helpers
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

function getKeyPoints(summary) {
  if (!Array.isArray(summary?.keyPoints)) return [];
  return summary.keyPoints
    .filter((p) => typeof p === "string")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function estimateReadingTime(story, text) {
  if (typeof story?.readingTimeSeconds === "number") {
    return Math.max(1, Math.ceil(story.readingTimeSeconds / 60));
  }
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}