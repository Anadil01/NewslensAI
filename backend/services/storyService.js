const prisma = require("../utils/prisma");
const AppError = require("../utils/AppError");

const {
  getCache,
  setCache,
  deleteCache
} = require("../utils/cache");

// Shared shape for list endpoints: enough to render a card without the
// client having to guess the source by parsing `canonicalUrl`.
const storyListInclude = {
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

  aiSummaries: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1,
    select: {
      summary: true,
      keyPoints: true,
      whyItMatters: true,
      whatNext: true,
      model: true,
      version: true,
      createdAt: true
    }
  },

  storyTopics: {
    include: {
      topic: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  }
};

// Detail view additionally needs bias analysis, summary entities,
// and the other stories belonging to the same cluster.
const storyDetailInclude = {
  ...storyListInclude,

  aiSummaries: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1,
    select: {
      summary: true,
      keyPoints: true,
      whyItMatters: true,
      whatNext: true,
      entities: true,
      model: true,
      version: true,
      createdAt: true
    }
  },

  biasAnalysis: {
    select: {
      biasScore: true,
      tone: true,
      confidence: true,
      signals: true
    }
  },

  cluster: {
    include: {
      stories: {
        orderBy: {
          publishedAt: "asc"
        },
        take: 10,
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

          aiSummaries: {
            orderBy: {
              createdAt: "desc"
            },
            take: 1,
            select: {
              summary: true,
              keyPoints: true,
              whyItMatters: true,
              whatNext: true,
              model: true,
              version: true,
              createdAt: true
            }
          }
        }
      }
    }
  }
};

// `v3` marks the payload shape that now carries coverageCount.
const buildStoriesCacheKey = ({
  page,
  limit,
  search,
  cursor
}) => {
  return `stories:v3:page:${page}:limit:${limit}:search:${search}:cursor:${cursor || "first"}`;
};

const encodeCursor = (story) =>
  Buffer.from(
    JSON.stringify({
      points: story.points,
      id: story.id
    })
  ).toString("base64url");

const decodeCursor = (cursor) => {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    );

    if (
      typeof parsed.id !== "string" ||
      (
        parsed.points !== null &&
        !Number.isInteger(parsed.points)
      )
    ) {
      throw new Error("Invalid cursor");
    }

    return parsed;
  } catch {
    throw new AppError("Invalid pagination cursor", 400);
  }
};

/*
 * Adds the number of unique sources covering each clustered story.
 *
 * Example:
 *
 * Cluster A:
 *   BBC      -> article
 *   BBC      -> article
 *   Reuters -> article
 *   AP       -> article
 *
 * coverageCount = 3
 *
 * Unclustered stories receive coverageCount = 1.
 */
const addCoverageCount = async (stories) => {
  const clusterIds = [
    ...new Set(
      stories
        .map((story) => story.clusterId)
        .filter(Boolean)
    )
  ];

  if (clusterIds.length === 0) {
    return stories.map((story) => ({
      ...story,
      coverageCount: 1
    }));
  }

  const coverageRows = await prisma.story.groupBy({
    by: ["clusterId", "sourceId"],
    where: {
      clusterId: {
        in: clusterIds
      }
    }
  });

  const coverageMap = new Map();

  for (const row of coverageRows) {
    const currentCount =
      coverageMap.get(row.clusterId) || 0;

    coverageMap.set(
      row.clusterId,
      currentCount + 1
    );
  }

  return stories.map((story) => ({
    ...story,

    coverageCount: story.clusterId
      ? coverageMap.get(story.clusterId) || 1
      : 1
  }));
};

const getStories = async ({
  page = 1,
  limit = 6,
  search = "",
  cursor
}) => {
  const cacheKey = buildStoriesCacheKey({
    page,
    limit,
    search,
    cursor
  });

  const cachedResult = await getCache(cacheKey);

  if (cachedResult) {
    console.log(
      "Stories cache HIT:",
      cacheKey
    );

    return cachedResult;
  }

  console.log(
    "Stories cache MISS:",
    cacheKey
  );

  const searchWhere = search
    ? {
        OR: [
          {
            title: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            author: {
              contains: search,
              mode: "insensitive"
            }
          }
        ]
      }
    : {};

  let where = searchWhere;

  if (cursor) {
    const {
      points,
      id
    } = decodeCursor(cursor);

    const keysetWhere =
      points === null
        ? {
            points: null,
            id: {
              gt: id
            }
          }
        : {
            OR: [
              {
                points: {
                  lt: points
                }
              },
              {
                points,
                id: {
                  gt: id
                }
              },
              {
                points: null
              }
            ]
          };

    where = {
      AND: [
        searchWhere,
        keysetWhere
      ]
    };
  }

  const total = cursor
    ? null
    : await prisma.story.count({
        where
      });

  const stories = await prisma.story.findMany({
    where,

    include: storyListInclude,

    orderBy: [
      {
        points: {
          sort: "desc",
          nulls: "last"
        }
      },
      {
        id: "asc"
      }
    ],

    skip: cursor
      ? 0
      : (page - 1) * limit,

    take: limit + 1
  });

  const hasNextPage =
    stories.length > limit;

  const pageStories = hasNextPage
    ? stories.slice(0, limit)
    : stories;

  /*
   * Calculate coverage only for stories
   * actually returned to the client.
   */
  const storiesWithCoverage =
    await addCoverageCount(pageStories);

  const nextCursor = hasNextPage
    ? encodeCursor(pageStories.at(-1))
    : null;

  const result = {
    stories: storiesWithCoverage,

    pagination: {
      total,
      page,
      limit,

      totalPages:
        total === null
          ? null
          : Math.max(
              Math.ceil(total / limit),
              1
            ),

      hasNextPage,

      hasPreviousPage:
        Boolean(cursor) || page > 1,

      nextCursor
    }
  };

  await setCache(
    cacheKey,
    result,
    60
  );

  return result;
};

const getSingleStory = async (id) => {
  const story = await prisma.story.findUnique({
    where: {
      id
    },

    include: storyDetailInclude
  });

  if (!story) {
    throw new AppError(
      "Story not found",
      404
    );
  }

  return story;
};

module.exports = {
  getStories,
  getSingleStory
};