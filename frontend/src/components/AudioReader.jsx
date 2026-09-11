import { useState, useEffect } from "react";
import { Volume2, Square } from "lucide-react";
import { useLanguage } from "../context/useLanguage";

export default function AudioReader({ text, compact = false }) {
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);

  // Clean up audio if the component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeech = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Auto-switch voice based on the selected language context
    utterance.lang = language === "hi" || language === "hinglish" ? "hi-IN" : "en-US";
    utterance.rate = 0.95; // Slightly slower for better comprehension

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleSpeech}
        aria-label={isPlaying ? "Stop listening" : "Listen to brief"}
        className={[
          "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition",
          isPlaying
            ? "bg-amber-500 text-slate-950 animate-pulse"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        ].join(" ")}
      >
        {isPlaying ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
        <span className="hidden sm:inline">{isPlaying ? "Stop" : "Listen"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleSpeech}
      className={[
        "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition",
        isPlaying 
          ? "bg-amber-500 text-slate-950 shadow-md" 
          : "border border-stroke bg-white text-slate-700 hover:border-amber-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      ].join(" ")}
    >
      {isPlaying ? <Square size={16} fill="currentColor" /> : <Volume2 size={16} />}
      {isPlaying ? "Stop listening" : "Listen to brief"}
    </button>
  );
}