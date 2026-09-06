const prisma = require("../utils/prisma");
const AppError = require("../utils/AppError");

const {
  buildUserProfile
} = require("../recommendation/signals");

const {
  rankStories
} = require("../recommendation/score");

const MAX_CANDIDATES = 250;

// Behavioural signal history is decayed by the engine, so an
// unbounded scan buys very little ranking quality while making
// the per-request cost grow forever with account age.
const MAX_SIGNAL_ROWS = 500;

// ============================================================
// BEHAVIORAL SIGNAL WEIGHTS

// ============================================================

const BEHAVIOR_SIGNAL_WEIGHTS = {
  LIKE: 1,
  COMPLETED_READ: 2,
  LONG_READ: 1,
  DISLIKE: -1,
  SKIP: -1
};

const LONG_READ_SECONDS = 30;

// ============================================================
// PREFERENCES
// ============================================================

const getPreferences = async (userId) => {
  return prisma.userPreference.findMany({
    where: { userId },
    include: { topic: true },
    orderBy: {
      topic: {
        name: "asc"
      }
    }
  });
};

const getTopics = async () => {
  return prisma.topic.findMany({
    orderBy: {
      name: "asc"
    },
    include: {
      _count: {
        select: {
          storyTopics: true
        }
      }
    }
  });
};

const replacePreferences = async (userId, preferences) => {
  const topicIds = preferences.map(({ topicId }) => topicId);

  const uniqueTopicIds = [...new Set(topicIds)];

  if (uniqueTopicIds.length !== topicIds.length) {
    throw new AppError(
      "Duplicate topics are not allowed",
      400
    );
  }

  const topicCount = await prisma.topic.count({
    where: {
      id: {
        in: topicIds
      }
    }
  });

  if (topicCount !== topicIds.length) {
    throw new AppError(
      "One or more topics do not exist",
      400
    );
  }

  await prisma.$transaction([
    prisma.userPreference.deleteMany({
      where: {
        userId
      }
    }),

    prisma.userPreference.createMany({
      data: preferences.map(
        ({ topicId, preference }) => ({
          userId,
          topicId,
          preference
        })
      )
    })
  ]);

  return getPreferences(userId);
};

// ============================================================
// SIGNAL QUERY SHAPE
//
// The recommendation engine generalizes an interaction from the
// story it happened on, so every behavioural query has to carry
// the story's cluster, source and topics with it.
// ============================================================

const INTERACTION_STORY_SELECT = {
  select: {
    id: true,
    clusterId: true,
    sourceId: true,

    storyTopics: {
      select: {
        topicId: true
      }
    }
  }
};

// ============================================================
// CLUSTER-AWARE DIVERSIFICATION

// ============================================================

const diversifyByCluster = (stories) => {
  if (!stories.length) {
    return [];
  }

  const clusters = new Map();

  for (const story of stories) {
    const clusterId =
      story.clusterId || `story:${story.id}`;

    if (!clusters.has(clusterId)) {
      clusters.set(clusterId, []);
    }

    clusters.get(clusterId).push(story);
  }

  const diversified = [];

  const clusterGroups = Array.from(
    clusters.values()
  );

  const maxClusterSize = Math.max(
    ...clusterGroups.map(
      (clusterStories) =>
        clusterStories.length
    )
  );

  for (
    let position = 0;
    position < maxClusterSize;
    position++
  ) {
    for (const clusterStories of clusterGroups) {
      if (position >= clusterStories.length) {
        continue;
      }

      const story = clusterStories[position];

      diversified.push({
        ...story,

        clusterInfo: story.cluster
          ? {
              id: story.cluster.id,
              title: story.cluster.title,
              description:
                story.cluster.description
            }
          : null,

        isClusterRepresentative:
          Boolean(story.clusterId) &&
          position === 0
      });
    }
  }

  return diversified;
};

// ============================================================

// PERSONALIZED FEED
// ============================================================

const getPersonalizedFeed = async ({
  userId,
  page = 1,
  limit = 10,
  mode = "personalized"
}) => {
  // ============================================================
  // VALIDATION
  // ============================================================

  const safePage = Math.max(
    Number(page) || 1,
    1
  );

  const safeLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    50
  );

  const validModes = [
    "personalized",
    "latest",
    "trending"
  ];

  if (!validModes.includes(mode)) {
    throw new AppError(
      "Invalid feed mode",
      400
    );
  }

  // ============================================================
  // 1. GET USER TOPIC PREFERENCES
  // ============================================================

  const preferences =
    await getPreferences(userId);

  // ============================================================
  // 2. GET USER SOURCE PREFERENCES
  // ============================================================


  const sourcePreferences =
    mode === "personalized"
      ? await prisma.userSourcePreference.findMany(
          {
            where: {
              userId
            },

            select: {
              sourceId: true,
              preference: true
            }
          }
        )
      : [];

  // ============================================================
  // 3. GET USER READING HISTORY

  //
  // Each row carries its story so the engine can generalize the
  // interaction onto that story's topics, source and cluster.
  // ============================================================

  const readingHistory =
    mode === "personalized"
      ? await prisma.readingHistory.findMany({
          where: {
            userId
          },

          select: {
            storyId: true,
            openedAt: true,
            durationSeconds: true,
            completed: true,
            story: INTERACTION_STORY_SELECT
          },

          orderBy: {
            openedAt: "desc"
          },

          take: MAX_SIGNAL_ROWS
        })
      : [];

  // ============================================================
  // 4. GET USER STORY FEEDBACK
  // ============================================================

  const feedback =
    mode === "personalized"
      ? await prisma.storyFeedback.findMany({
          where: {
            userId
          },

          select: {
            storyId: true,
            feedback: true,
            createdAt: true,
            story: INTERACTION_STORY_SELECT
          },

          take: MAX_SIGNAL_ROWS
        })
      : [];

  // ============================================================
  // 4b. GET USER BOOKMARKS
  //
  // A bookmark is the strongest implicit positive signal we have:
  // the user chose to come back to this story later.
  // ============================================================

  const bookmarks =
    mode === "personalized"
      ? await prisma.bookmark.findMany({
          where: {
            userId
          },

          select: {
            storyId: true,
            createdAt: true,
            story: INTERACTION_STORY_SELECT
          },

          take: MAX_SIGNAL_ROWS
        })
      : [];

  // ============================================================
  // 5. GET SKIPPED STORIES
  //
  // Skips do double duty: they are hard-filtered out of the
  // candidate set AND fed to the engine as a negative signal.
  // ============================================================

  const skippedStories =
    await prisma.storySkip.findMany({
      where: {
        userId
      },

      select: {
        storyId: true,
        createdAt: true,
        story: INTERACTION_STORY_SELECT
      }
    });


  const skippedStoryIds = new Set(
    skippedStories.map(
      ({ storyId }) => storyId
    )
  );

  // ============================================================
  // 6. FETCH RECENT CANDIDATES
  // ============================================================

  const candidates =
    await prisma.story.findMany({
      include: {
        source: {
          select: {
            id: true,
            name: true,
            slug: true,
            websiteUrl: true,
            politicalLean: true,
            reliabilityScore: true
          }
        },

        cluster: {
          select: {
            id: true,
            title: true,
            description: true
          }
        },

        storyTopics: {
          include: {
            topic: true
          }
        },

        // Feed cards surface the most recent NewsLens brief. Keeping this
        // bounded prevents the recommendation query from loading summary
        // history for every candidate story.
        aiSummaries: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1,
          select: {
            summary: true,
            model: true,
            version: true,
            createdAt: true
          }
        }
      },

      orderBy: [
        {
          publishedAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ],

      take: MAX_CANDIDATES
    });

  // ============================================================
  // 7. REMOVE SKIPPED STORIES
  // ============================================================

  const eligibleStories =
    candidates.filter(
      (story) =>
        !skippedStoryIds.has(story.id)
    );

  // ============================================================
  // LATEST MODE
  // ============================================================

  if (mode === "latest") {
    const latestStories =
      eligibleStories.map((story) => ({
        ...story,

        relevanceScore: null,

        scoring: {
          mode: "latest"
        }
      }));

    const chronologicalStories =
      latestStories.sort((a, b) => {
        return (
          new Date(
            b.publishedAt || b.createdAt
          ) -
          new Date(
            a.publishedAt || a.createdAt
          )
        );
      });

    const total =
      chronologicalStories.length;

    const stories =
      chronologicalStories.slice(
        (safePage - 1) * safeLimit,
        safePage * safeLimit
      );

    return {
      stories,

      personalization: {
        topicPreferenceCount:
          preferences.length,

        sourcePreferenceCount: 0,

        mode: "latest"
      },

      pagination: {
        total,
        page: safePage,
        limit: safeLimit,

        totalPages: Math.max(
          Math.ceil(
            total / safeLimit
          ),
          1
        ),

        hasNextPage:
          safePage * safeLimit < total,

        hasPreviousPage:
          safePage > 1
      }
    };
  }

  // ============================================================
  // TRENDING MODE
  // ============================================================

  if (mode === "trending") {
    const now = Date.now();

    const trendingStories =
      eligibleStories
        .map((story) => {
          const publishedTime =
            new Date(
              story.publishedAt ||
                story.createdAt
            ).getTime();

          const ageHours =
            Math.max(
              (now - publishedTime) /
                (1000 * 60 * 60),
              0
            );

          const recencyMultiplier =
            1 /
            (1 + ageHours / 24);

          const popularityScore =
            Math.min(
              Math.max(
                story.points || 0,
                0
              ),
              1000
            );

          const trendingScore =
            popularityScore *
            recencyMultiplier;

          return {
            ...story,

            relevanceScore: Number(
              trendingScore.toFixed(3)
            ),

            scoring: {
              mode: "trending",

              popularityScore,

              ageHours: Number(
                ageHours.toFixed(2)
              ),

              recencyMultiplier:
                Number(
                  recencyMultiplier.toFixed(3)
                )
            }
          };
        })

        .sort((a, b) => {
          if (
            b.relevanceScore !==
            a.relevanceScore
          ) {
            return (
              b.relevanceScore -
              a.relevanceScore
            );
          }

          return (
            new Date(
              b.publishedAt ||
                b.createdAt
            ) -
            new Date(
              a.publishedAt ||
                a.createdAt
            )
          );
        });

    // ============================================================
    // CLUSTER DIVERSIFICATION
    // ============================================================

    const diversifiedTrending =
      diversifyByCluster(
        trendingStories
      );

    const total =
      diversifiedTrending.length;

    const stories =
      diversifiedTrending.slice(
        (safePage - 1) * safeLimit,
        safePage * safeLimit
      );

    return {
      stories,

      personalization: {
        topicPreferenceCount:
          preferences.length,

        sourcePreferenceCount: 0,

        mode: "trending"
      },

      pagination: {
        total,
        page: safePage,
        limit: safeLimit,

        totalPages: Math.max(
          Math.ceil(
            total / safeLimit
          ),
          1
        ),

        hasNextPage:
          safePage * safeLimit < total,

        hasPreviousPage:
          safePage > 1
      }
    };
  }

  // ============================================================
  // PERSONALIZED MODE
  // ============================================================

  // Explicit preferences arrive from `getPreferences`, which joins
  // the topic row; the engine only needs the id and weight.
  const profile = buildUserProfile({
    nowMs: Date.now(),

    topicPreferences: preferences.map(
      ({ topicId, preference }) => ({
        topicId,
        preference
      })
    ),

    sourcePreferences,
    readingHistory,
    feedback,
    skips: skippedStories,
    bookmarks
  });

  // ============================================================
  // RANK
  //
  // Diversification is greedy and position-dependent, so a page
  // cannot be produced in isolation: ranking has to fill every
  // slot up to the end of the requested page and then slice.
  // ============================================================

  const requestedThrough =
    safePage * safeLimit;

  const ranked = rankStories(
    profile,
    eligibleStories,
    {
      limit: requestedThrough
    }
  );

  const rankedStories =
    ranked.items.map(
      ({
        story,
        score,
        breakdown,
        position,
        diversity
      }) => ({
        ...story,

        relevanceScore:
          Number(score.toFixed(3)),

        scoring: {
          mode: "personalized",
          position,
          ...breakdown,
          diversity
        },

        clusterInfo: story.cluster
          ? {
              id: story.cluster.id,
              title: story.cluster.title,
              description:
                story.cluster.description
            }
          : null,

        isClusterRepresentative:
          Boolean(story.clusterId) &&
          diversity.clusterPlaced === 0
      })
    );

  // ============================================================
  // PAGINATION
  //
  // `total` counts everything eligible rather than everything
  // ranked, so the client sees a stable total while paging.
  // ============================================================

  const total = ranked.meta.candidateCount;

  const stories = rankedStories.slice(
    (safePage - 1) * safeLimit,
    requestedThrough
  );

  // ============================================================
  // RESPONSE
  // ============================================================

  return {
    stories,

    personalization: {
      topicPreferenceCount:
        preferences.length,

      sourcePreferenceCount:
        sourcePreferences.length,

      mode: "personalized",

      // Ranking diagnostics: lets the client explain a
      // still-warming-up feed instead of silently showing a
      // near-generic ordering.
      personalized:
        ranked.meta.personalized,

      coldStart: ranked.meta.coldStart,

      signalCount:
        ranked.meta.signalCount,

      signalStrength:
        ranked.meta.signalStrength,

      clusterCount:
        ranked.meta.clusterCount
    },

    pagination: {
      total,
      page: safePage,
      limit: safeLimit,

      totalPages: Math.max(
        Math.ceil(
          total / safeLimit
        ),
        1
      ),

      hasNextPage:
        requestedThrough <
        rankedStories.length +
          (ranked.meta.candidateCount -
            ranked.meta.returnedCount),

      hasPreviousPage:
        safePage > 1
    }
  };
};


// ============================================================
// READING HISTORY
// ============================================================

const recordReading = async ({
  userId,
  storyId,
  durationSeconds,
  completed
}) => {
  const story =
    await prisma.story.findUnique({
      where: {
        id: storyId
      },

      include: {
        storyTopics: {
          select: {
            topicId: true
          }
        }
      }
    });

  if (!story) {
    throw new AppError(
      "Story not found",
      404
    );
  }

  const safeDurationSeconds =
    Math.max(
      Number(durationSeconds) || 0,
      0
    );

  const affinityDelta =
    completed
      ? BEHAVIOR_SIGNAL_WEIGHTS.COMPLETED_READ
      : safeDurationSeconds >=
        LONG_READ_SECONDS
        ? BEHAVIOR_SIGNAL_WEIGHTS.LONG_READ
        : 0;

  await prisma.$transaction(
    async (transaction) => {
      await transaction.readingHistory.create({
        data: {
          userId,
          storyId,
          durationSeconds:
            safeDurationSeconds,
          completed: Boolean(completed)
        }
      });

      if (!affinityDelta) {
        return;
      }

      for (const { topicId } of story.storyTopics) {
        const current =
          await transaction.userPreference.findUnique({
            where: {
              userId_topicId: {
                userId,
                topicId
              }
            }
          });

        const preference =
          Math.min(
            5,
            (current?.preference || 0) +
              affinityDelta
          );

        await transaction.userPreference.upsert({
          where: {
            userId_topicId: {
              userId,
              topicId
            }
          },

          create: {
            userId,
            topicId,
            preference
          },

          update: {
            preference
          }
        });
      }
    }
  );

  return {
    recorded: true,
    affinityDelta,
    topicCount:
      story.storyTopics.length
  };
};

// ============================================================
// TOPIC FOLLOW
// ============================================================

const followTopic = async ({
  userId,
  topicId
}) => {
  const topic =
    await prisma.topic.findUnique({
      where: {
        id: topicId
      }
    });

  if (!topic) {
    throw new AppError(
      "Topic not found",
      404
    );
  }

  const preference =
    await prisma.userPreference.upsert({
      where: {
        userId_topicId: {
          userId,
          topicId
        }
      },

      create: {
        userId,
        topicId,
        preference: 5
      },

      update: {
        preference: 5
      },

      include: {
        topic: true
      }
    });

  return preference;
};

const unfollowTopic = async ({
  userId,
  topicId
}) => {
  const topic =
    await prisma.topic.findUnique({
      where: {
        id: topicId
      }
    });

  if (!topic) {
    throw new AppError(
      "Topic not found",
      404
    );
  }

  await prisma.userPreference.deleteMany({
    where: {
      userId,
      topicId
    }
  });

  return {
    unfollowed: true,
    topicId
  };
};

// ============================================================
// SOURCE PREFERENCES
// ============================================================

// The Sources page needs the catalogue itself, not just the rows a
// user has an opinion about, so this is exposed separately from
// getSourcePreferences and stays public.
const getSources = async () => {
  return prisma.sources.findMany({
    where: {
      isActive: true
    },

    orderBy: {
      name: "asc"
    },

    select: {
      id: true,
      name: true,
      slug: true,
      websiteUrl: true,
      type: true,
      politicalLean: true,
      reliabilityScore: true,

      _count: {
        select: {
          stories: true
        }
      }
    }
  });
};

const getSourcePreferences = async (
  userId
) => {

  return prisma.userSourcePreference.findMany({
    where: {
      userId
    },

    include: {
      source: true
    },

    orderBy: {
      source: {
        name: "asc"
      }
    }
  });
};

const followSource = async ({
  userId,
  sourceId
}) => {
  const source =
    await prisma.sources.findUnique({
      where: {
        id: sourceId
      }
    });

  if (!source) {
    throw new AppError(
      "Source not found",
      404
    );
  }

  const preference =
    await prisma.userSourcePreference.upsert({
      where: {
        userId_sourceId: {
          userId,
          sourceId
        }
      },

      create: {
        userId,
        sourceId,
        preference: 5
      },

      update: {
        preference: 5
      },

      include: {
        source: true
      }
    });

  return preference;
};

const unfollowSource = async ({
  userId,
  sourceId
}) => {
  const source =
    await prisma.sources.findUnique({
      where: {
        id: sourceId
      }
    });

  if (!source) {
    throw new AppError(
      "Source not found",
      404
    );
  }

  await prisma.userSourcePreference.deleteMany({
    where: {
      userId,
      sourceId
    }
  });

  return {
    unfollowed: true,
    sourceId
  };
};

// ============================================================
// STORY FEEDBACK
// ============================================================

const setStoryFeedback = async ({
  userId,
  storyId,
  feedback
}) => {
  if (
    feedback !== "LIKE" &&
    feedback !== "DISLIKE"
  ) {
    throw new AppError(
      "Feedback must be LIKE or DISLIKE",
      400
    );
  }

  const story =
    await prisma.story.findUnique({
      where: {
        id: storyId
      },

      include: {
        storyTopics: {
          select: {
            topicId: true
          }
        }
      }
    });

  if (!story) {
    throw new AppError(
      "Story not found",
      404
    );
  }

  const existingFeedback =
    await prisma.storyFeedback.findUnique({
      where: {
        userId_storyId: {
          userId,
          storyId
        }
      }
    });

  const signal =
    feedback === "LIKE"
      ? BEHAVIOR_SIGNAL_WEIGHTS.LIKE
      : -1;

  const previousSignal =
    existingFeedback
      ? existingFeedback.feedback ===
        "LIKE"
        ? BEHAVIOR_SIGNAL_WEIGHTS.LIKE
        : BEHAVIOR_SIGNAL_WEIGHTS.DISLIKE
      : 0;

  const preferenceDelta =
    signal - previousSignal;

  await prisma.$transaction(
    async (transaction) => {
      await transaction.storyFeedback.upsert({
        where: {
          userId_storyId: {
            userId,
            storyId
          }
        },

        create: {
          userId,
          storyId,
          feedback
        },

        update: {
          feedback
        }
      });

      if (preferenceDelta === 0) {
        return;
      }

      for (const { topicId } of story.storyTopics) {
        const current =
          await transaction.userPreference.findUnique({
            where: {
              userId_topicId: {
                userId,
                topicId
              }
            }
          });

        const currentPreference =
          current?.preference || 0;

        const preference =
          Math.max(
            -5,
            Math.min(
              5,
              currentPreference +
                preferenceDelta
            )
          );

        await transaction.userPreference.upsert({
          where: {
            userId_topicId: {
              userId,
              topicId
            }
          },

          create: {
            userId,
            topicId,
            preference
          },

          update: {
            preference
          }
        });
      }
    }
  );

  return {
    storyId,
    feedback,

    previousFeedback:
      existingFeedback?.feedback ||
      null,

    preferenceDelta,

    topicCount:
      story.storyTopics.length
  };
};

const getStoryFeedback = async ({
  userId,
  storyId
}) => {
  const story =
    await prisma.story.findUnique({
      where: {
        id: storyId
      },

      select: {
        id: true
      }
    });

  if (!story) {
    throw new AppError(
      "Story not found",
      404
    );
  }

  const feedback =
    await prisma.storyFeedback.findUnique({
      where: {
        userId_storyId: {
          userId,
          storyId
        }
      }
    });

  return feedback;
};

const removeStoryFeedback = async ({
  userId,
  storyId
}) => {
  const existingFeedback =
    await prisma.storyFeedback.findUnique({
      where: {
        userId_storyId: {
          userId,
          storyId
        }
      }
    });

  if (!existingFeedback) {
    return {
      removed: false,
      storyId,
      preferenceDelta: 0
    };
  }

  const story =
    await prisma.story.findUnique({
      where: {
        id: storyId
      },

      include: {
        storyTopics: {
          select: {
            topicId: true
          }
        }
      }
    });

  if (!story) {
    throw new AppError(
      "Story not found",
      404
    );
  }

  const preferenceDelta =
    existingFeedback.feedback ===
    "LIKE"
      ? -1
      : 1;

  await prisma.$transaction(
    async (transaction) => {
      await transaction.storyFeedback.delete({
        where: {
          userId_storyId: {
            userId,
            storyId
          }
        }
      });

      for (const { topicId } of story.storyTopics) {
        const current =
          await transaction.userPreference.findUnique({
            where: {
              userId_topicId: {
                userId,
                topicId
              }
            }
          });

        if (!current) {
          continue;
        }

        const preference =
          Math.max(
            -5,
            Math.min(
              5,
              current.preference +
                preferenceDelta
            )
          );

        await transaction.userPreference.update({
          where: {
            userId_topicId: {
              userId,
              topicId
            }
          },

          data: {
            preference
          }
        });
      }
    }
  );

  return {
    removed: true,
    storyId,

    previousFeedback:
      existingFeedback.feedback,

    preferenceDelta,

    topicCount:
      story.storyTopics.length
  };
};

// ============================================================
// STORY SKIP
// ============================================================

const skipStory = async ({
  userId,
  storyId
}) => {
  const story =
    await prisma.story.findUnique({
      where: {
        id: storyId
      },

      include: {
        storyTopics: {
          select: {
            topicId: true
          }
        }
      }
    });

  if (!story) {
    throw new AppError(
      "Story not found",
      404
    );
  }

  const existingSkip =
    await prisma.storySkip.findUnique({
      where: {
        userId_storyId: {
          userId,
          storyId
        }
      }
    });

  if (existingSkip) {
    return {
      skipped: true,
      storyId,
      alreadySkipped: true,
      preferenceDelta: 0,
      topicCount:
        story.storyTopics.length
    };
  }

  const preferenceDelta =
    BEHAVIOR_SIGNAL_WEIGHTS.SKIP;

  await prisma.$transaction(
    async (transaction) => {
      await transaction.storySkip.create({
        data: {
          userId,
          storyId
        }
      });

      for (const { topicId } of story.storyTopics) {
        const current =
          await transaction.userPreference.findUnique({
            where: {
              userId_topicId: {
                userId,
                topicId
              }
            }
          });

        const preference =
          Math.max(
            -5,
            (current?.preference || 0) +
              preferenceDelta
          );

        await transaction.userPreference.upsert({
          where: {
            userId_topicId: {
              userId,
              topicId
            }
          },

          create: {
            userId,
            topicId,
            preference
          },

          update: {
            preference
          }
        });
      }
    }
  );

  return {
    skipped: true,
    storyId,
    alreadySkipped: false,
    preferenceDelta,

    topicCount:
      story.storyTopics.length
  };
};

const getStorySkip = async ({
  userId,
  storyId
}) => {
  const story =
    await prisma.story.findUnique({
      where: {
        id: storyId
      },

      select: {
        id: true
      }
    });

  if (!story) {
    throw new AppError(
      "Story not found",
      404
    );
  }

  const skip =
    await prisma.storySkip.findUnique({
      where: {
        userId_storyId: {
          userId,
          storyId
        }
      }
    });

  return skip;
};

const removeStorySkip = async ({
  userId,
  storyId
}) => {
  const existingSkip =
    await prisma.storySkip.findUnique({
      where: {
        userId_storyId: {
          userId,
          storyId
        }
      }
    });

  if (!existingSkip) {
    return {
      removed: false,
      storyId,
      preferenceDelta: 0
    };
  }

  const story =
    await prisma.story.findUnique({
      where: {
        id: storyId
      },

      include: {
        storyTopics: {
          select: {
            topicId: true
          }
        }
      }
    });

  if (!story) {
    throw new AppError(
      "Story not found",
      404
    );
  }

  const preferenceDelta = 1;

  await prisma.$transaction(
    async (transaction) => {
      await transaction.storySkip.delete({
        where: {
          userId_storyId: {
            userId,
            storyId
          }
        }
      });

      for (const { topicId } of story.storyTopics) {
        const current =
          await transaction.userPreference.findUnique({
            where: {
              userId_topicId: {
                userId,
                topicId
              }
            }
          });

        if (!current) {
          continue;
        }

        const preference =
          Math.min(
            5,
            current.preference +
              preferenceDelta
          );

        await transaction.userPreference.update({
          where: {
            userId_topicId: {
              userId,
              topicId
            }
          },

          data: {
            preference
          }
        });
      }
    }
  );

  return {
    removed: true,
    storyId,
    preferenceDelta,

    topicCount:
      story.storyTopics.length
  };
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getTopics,
  getPreferences,
  replacePreferences,

  getPersonalizedFeed,
  recordReading,

  followTopic,

  unfollowTopic,

  getSources,
  getSourcePreferences,
  followSource,
  unfollowSource,


  setStoryFeedback,
  getStoryFeedback,
  removeStoryFeedback,

  skipStory,
  getStorySkip,
  removeStorySkip,

  // Still used by the trending feed, which is not personalized
  // and therefore does not go through the recommendation engine.
  diversifyByCluster
};
