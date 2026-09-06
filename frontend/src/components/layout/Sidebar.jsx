import { NavLink } from "react-router-dom";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Globe2,
  Home,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "../../context/useAuth";

const mainNavigation = [
  {
    label: "Home",
    to: "/",
    icon: Home,
  },
  {
    label: "For You",
    to: "/for-you",
    icon: Sparkles,
  },
  {
    label: "Latest",
    to: "/latest",
    icon: Clock3,
  },
  {
    label: "Trending",
    to: "/trending",
    icon: TrendingUp,
  },
];

const exploreNavigation = [
  {
    label: "Topics",
    to: "/topics",
    icon: Compass,
  },
  {
    label: "Sources",
    to: "/sources",
    icon: Globe2,
  },
];

const libraryNavigation = [
  {
    label: "Saved",
    to: "/bookmarks",
    icon: Bookmark,
  },
];

function SidebarItem({
  label,
  to,
  icon: Icon,
  collapsed,
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          "group flex h-11 items-center rounded-xl text-sm font-semibold transition-all duration-200",

          collapsed
            ? "justify-center px-2"
            : "gap-3 px-3",

          isActive
            ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
            : [
                "text-slate-600",
                "hover:bg-white",
                "hover:text-slate-950",
                "dark:text-slate-300",
                "dark:hover:bg-slate-900",
                "dark:hover:text-white",
              ].join(" "),
        ].join(" ")
      }
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200",
          "group-hover:scale-105",
        ].join(" ")}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
      </span>

      {!collapsed && (
        <span className="truncate">
          {label}
        </span>
      )}
    </NavLink>
  );
}

function NavigationGroup({
  title,
  links,
  collapsed,
}) {
  return (
    <section className="mt-7">
      {!collapsed && (
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          {title}
        </p>
      )}

      <nav className="space-y-1">
        {links.map((link) => (
          <SidebarItem
            key={link.to}
            {...link}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </section>
  );
}

function Sidebar({
  collapsed,
  onToggle,
}) {
  const { user } = useAuth();

  return (
    <aside
      className={[
        "sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-stroke bg-white/65 backdrop-blur-xl transition-[width] duration-300 lg:block",
        "dark:border-white/10 dark:bg-slate-950/60",
        collapsed ? "w-20" : "w-64",
      ].join(" ")}
    >
      <div className="flex h-full flex-col">

        {/* ─────────────────────────
            BRAND
        ───────────────────────── */}

        <div
          className={[
            "shrink-0 px-4 pt-6",
            collapsed
              ? "flex justify-center"
              : "",
          ].join(" ")}
        >
          <NavLink
            to="/"
            title={collapsed ? "NewsLens AI" : undefined}
            className={[
              "group flex items-center",
              collapsed
                ? "justify-center"
                : "gap-3 px-2",
            ].join(" ")}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-teal-700 text-lg font-black text-white shadow-lg shadow-amber-900/20 transition duration-300 group-hover:-rotate-2 group-hover:scale-105">
              NL
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold tracking-tight text-slate-950 dark:text-white">
                  NewsLens AI
                </p>

                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Signals over noise
                </p>
              </div>
            )}
          </NavLink>
        </div>

        {/* ─────────────────────────
            SIDEBAR TOGGLE
        ───────────────────────── */}

        <div
          className={[
            "shrink-0 px-4",
            collapsed
              ? "flex justify-center"
              : "",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={onToggle}
            title={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
            aria-label={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
            className={[
              "mt-6 flex h-9 w-9 items-center justify-center rounded-xl border border-stroke bg-white text-slate-500 transition-all",
              "hover:border-amber-300 hover:bg-amber-50 hover:text-slate-950",
              "dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* ─────────────────────────
            NAVIGATION
        ───────────────────────── */}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <NavigationGroup
            title="Home"
            links={mainNavigation}
            collapsed={collapsed}
          />

          <NavigationGroup
            title="Explore"
            links={exploreNavigation}
            collapsed={collapsed}
          />

          <NavigationGroup
            title="Your library"
            links={libraryNavigation}
            collapsed={collapsed}
          />
        </div>

        {/* ─────────────────────────
            BOTTOM
        ───────────────────────── */}

        <div className="shrink-0 border-t border-stroke px-4 py-4 dark:border-white/10">

          {!collapsed && user && (
            <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-stroke dark:bg-slate-900/70 dark:ring-white/10">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Signed in
              </p>

              <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                {user.name}
              </p>
            </div>
          )}

          {!collapsed && !user && (
            <div className="rounded-2xl bg-amber-50/80 p-3 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20">
              <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                Sign in to personalize your news experience.
              </p>
            </div>
          )}

          <NavLink
            to="/settings"
            title={collapsed ? "Settings" : undefined}
            className={({ isActive }) =>
              [
                "mt-3 flex h-11 items-center rounded-xl text-sm font-semibold transition-all",

                collapsed
                  ? "justify-center px-2"
                  : "gap-3 px-3",

                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
              ].join(" ")
            }
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <Settings
                className="h-[17px] w-[17px]"
                strokeWidth={1.8}
              />
            </span>

            {!collapsed && (
              <span>Settings</span>
            )}
          </NavLink>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;