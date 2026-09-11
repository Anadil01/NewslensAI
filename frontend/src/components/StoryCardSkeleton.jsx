export default function StoryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-stroke bg-white shadow-[0_14px_45px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-slate-900">
      {/* Image Skeleton */}
      <div className="h-[30vh] min-h-[220px] w-full animate-pulse bg-slate-200 dark:bg-slate-800" />
      
      <div className="p-5 sm:p-6">
        {/* Meta Skeleton */}
        <div className="flex gap-3">
          <div className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        
        {/* Title Skeleton */}
        <div className="mt-5 space-y-3">
          <div className="h-8 w-11/12 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-4/5 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* AI Brief Skeleton */}
        <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50">
          <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Bottom Actions Skeleton */}
        <div className="mt-6 flex items-center justify-between border-t border-stroke pt-4 dark:border-white/10">
          <div className="flex gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}