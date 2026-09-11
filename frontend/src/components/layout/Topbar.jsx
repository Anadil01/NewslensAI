import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useTheme } from "../../context/useTheme";
import { useSearch } from "../../hooks/useStories";
import { useLanguage } from "../../context/useLanguage";

const Topbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  // Search state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  // Debounce the user input to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchResults, isFetching } = useSearch(debouncedQuery);

  // Close the search dropdown if the user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-stroke bg-[#fbfaf6]/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
      <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 lg:px-8">

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xl lg:max-w-2xl" ref={searchRef}>
          <div className="relative flex w-full items-center">
            <span className="absolute left-4 text-lg leading-none text-slate-500">
              ⌕
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search stories, topics, sources..."
              className="w-full rounded-2xl border border-stroke bg-white/70 py-2.5 pl-11 pr-10 text-sm text-slate-900 transition hover:border-amber-300 focus:border-amber-400 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-900/70 dark:text-white dark:hover:bg-slate-900 dark:focus:bg-slate-900"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setIsOpen(false);
                }}
                className="absolute right-4 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {isOpen && debouncedQuery.trim().length > 1 && (
            <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-stroke bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
              {isFetching ? (
                <div className="p-5 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                  Searching...
                </div>
              ) : searchResults?.length > 0 ? (
                <ul className="max-h-[60vh] overflow-y-auto p-2 scrollbar-none">
                  {searchResults.map((story) => (
                    <li key={story.id}>
                      <Link
                        to={`/story/${story.id}`}
                        onClick={() => {
                          setIsOpen(false);
                          setQuery("");
                        }}
                        className="block rounded-xl p-3 transition hover:bg-amber-50 dark:hover:bg-slate-800/60"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          {story.storyTopics?.[0]?.topic?.name || story.topic?.name || "News"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                          {story.title}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-5 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                  No results found for "{debouncedQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="cursor-pointer appearance-none rounded-full border border-stroke bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Select language"
          >
            <option value="en">🇬🇧 EN</option>
            <option value="hi">🇮🇳 HI</option>
            <option value="hinglish">🇮🇳 Hinglish</option>
          </select>

          {/* Theme */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-full border border-stroke bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? "☀ Light" : "☾ Dark"}
          </button>

          {user ? (
            <>
              {/* User */}
              <div className="hidden rounded-full border border-stroke bg-white/70 px-3 py-2 text-xs text-slate-600 sm:block dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {user.name}
                </span>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={logout}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 sm:block dark:text-slate-300 dark:bg-slate-900 dark:hover:text-white"
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => navigate("/register")}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;