import StoryCard from "./StoryCard";

export default function StoryFeed({
  stories = [],
  loading = false,
  emptyMessage = "No stories found.",
}) {
  if (loading) {
    return <StoryFeedSkeleton />;
  }

  if (!stories.length) {
    return (
      <div
        className="
          flex
          min-h-[360px]
          items-center
          justify-center
          rounded-[28px]
          border
          border-dashed
          border-slate-300
          bg-white/60
          px-6
          py-16
          text-center
          dark:border-white/10
          dark:bg-slate-900/50
        "
      >
        <div className="max-w-sm">
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
              dark:text-slate-500
            "
          >
            <span className="text-xl">◌</span>
          </div>

          <h3
            className="
              mt-4
              text-base
              font-bold
              text-slate-900
              dark:text-white
            "
          >
            Nothing to show yet
          </h3>

          <p
            className="
              mt-2
              text-sm
              leading-6
              text-slate-500
              dark:text-slate-400
            "
          >
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="News stories"
      className="w-full"
    >
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
          {stories.map((story, index) => (
            <div
              key={story.id}
              className="
                animate-[fadeIn_0.35s_ease-out]
              "
              style={{
                animationDelay: `${Math.min(index * 45, 250)}ms`,
                animationFillMode: "both",
              }}
            >
              <StoryCard story={story} />
            </div>
          ))}
      </div>
    </section>
  );
}

function StoryFeedSkeleton() {
  return (
    <section aria-label="Loading stories">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="
              overflow-hidden
              rounded-[26px]
              border
              border-slate-200/80
              bg-white
              dark:border-white/[0.08]
              dark:bg-slate-900
            "
          >
            {/* Image */}
            <div
              className="
                aspect-[16/10]
                w-full
                animate-pulse
                bg-slate-200
                dark:bg-slate-800
              "
            />

            <div className="space-y-4 p-5 sm:p-6">
              {/* Source */}
              <div
                className="
                  h-3
                  w-32
                  animate-pulse
                  rounded-full
                  bg-slate-200
                  dark:bg-slate-800
                "
              />

              {/* Headline */}
              <div className="space-y-2">
                <div
                  className="
                    h-5
                    w-full
                    animate-pulse
                    rounded
                    bg-slate-200
                    dark:bg-slate-800
                  "
                />

                <div
                  className="
                    h-5
                    w-4/5
                    animate-pulse
                    rounded
                    bg-slate-200
                    dark:bg-slate-800
                  "
                />
              </div>

              {/* AI Brief */}
              <div
                className="
                  rounded-2xl
                  bg-slate-100
                  p-4
                  dark:bg-slate-800/70
                "
              >
                <div
                  className="
                    h-3
                    w-20
                    animate-pulse
                    rounded-full
                    bg-slate-200
                    dark:bg-slate-700
                  "
                />

                <div className="mt-3 space-y-2">
                  <div
                    className="
                      h-3
                      w-full
                      animate-pulse
                      rounded
                      bg-slate-200
                      dark:bg-slate-700
                    "
                  />

                  <div
                    className="
                      h-3
                      w-11/12
                      animate-pulse
                      rounded
                      bg-slate-200
                      dark:bg-slate-700
                    "
                  />

                  <div
                    className="
                      h-3
                      w-3/4
                      animate-pulse
                      rounded
                      bg-slate-200
                      dark:bg-slate-700
                    "
                  />
                </div>
              </div>

              {/* Metadata */}
              <div
                className="
                  h-3
                  w-28
                  animate-pulse
                  rounded-full
                  bg-slate-200
                  dark:bg-slate-800
                "
              />

              {/* Actions */}
              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-t
                  border-slate-200
                  pt-4
                  dark:border-white/[0.08]
                "
              >
                <div className="flex gap-2">
                  <div
                    className="
                      h-10
                      w-10
                      animate-pulse
                      rounded-full
                      bg-slate-200
                      dark:bg-slate-800
                    "
                  />

                  <div
                    className="
                      h-10
                      w-10
                      animate-pulse
                      rounded-full
                      bg-slate-200
                      dark:bg-slate-800
                    "
                  />
                </div>

                <div
                  className="
                    h-10
                    w-28
                    animate-pulse
                    rounded-full
                    bg-slate-200
                    dark:bg-slate-800
                  "
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
