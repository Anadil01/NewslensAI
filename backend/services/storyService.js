const prisma = require("../utils/prisma");
const AppError = require("../utils/AppError");

const {
  getCache,
  setCache,
  deleteCache,
  existsCache
} = require("../utils/cache");

const { enqueueIngestion } = require("./ingestionJobService");

// Helper to handle the case-insensitive language filter and English fallback
const getAiSummariesFilter = (lang) => {
  const safeLang = (lang || "en").toLowerCase();
  if (safeLang === "en") {
    return undefined; // Bypass filter for English to grab the default original summary
  }
  return {
    version: {
      contains: safeLang,
      mode: "insensitive"
    }
  };
};

const getStoryListInclude = (lang = "en") => ({
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
    where: getAiSummariesFilter(lang),
    orderBy: {
      createdAt: "desc"
    },
    take: 4, 
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
  biasAnalysis: {
    select: {
      biasScore: true,
      tone: true,
      confidence: true,
      signals: true
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
});

const getStoryDetailInclude = (lang = "en") => ({
  ...getStoryListInclude(lang),
  aiSummaries: {
    where: getAiSummariesFilter(lang),
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
            where: getAiSummariesFilter(lang),
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
});

const buildStoriesCacheKey = ({ page, limit, search, lang }) => {
  return `stories:v4:page:${page}:limit:${limit}:search:${search}:lang:${lang}`;
};

// RENAMED AND UPDATED to map to sourceCount
const addSourceCount = async (stories) => {
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
      sourceCount: 1
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
    const currentCount = coverageMap.get(row.clusterId) || 0;
    coverageMap.set(row.clusterId, currentCount + 1);
  }

  return stories.map((story) => ({
    ...story,
    sourceCount: story.clusterId ? coverageMap.get(story.clusterId) || 1 : 1
  }));
};

const triggerBackgroundRefreshIfNeeded = async (force = false) => {
  const COOLDOWN_KEY = "lock:ingestion:auto_cooldown";
  const inCooldown = await existsCache(COOLDOWN_KEY);

  if (!inCooldown || force) {
    await setCache(COOLDOWN_KEY, { triggeredAt: Date.now() }, 600);
    try {
      await enqueueIngestion("system:auto-refresh");
      console.log("Background news ingestion queued.");
    } catch (err) {
      console.warn("Could not queue background ingestion:", err.message);
    }
  }
};

const getStories = async ({
  page = 1,
  limit = 6,
  search = "",
  refresh = false,
  lang = "en"
}) => {
  const cacheKey = buildStoriesCacheKey({ page, limit, search, lang });

  if (refresh) {
    void triggerBackgroundRefreshIfNeeded(true);
  }

  const cachedResult = await getCache(cacheKey);

  if (cachedResult) {
    console.log("Stories cache HIT:", cacheKey);
    void triggerBackgroundRefreshIfNeeded(false);
    return cachedResult;
  }

  console.log("Stories cache MISS:", cacheKey);

  const searchWhere = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { author: { contains: search, mode: "insensitive" } }
        ]
      }
    : {};

  const total = await prisma.story.count({ where: searchWhere });

  // STRICT OFFSET PAGINATION & CHRONOLOGICAL SORTING
  const stories = await prisma.story.findMany({
    where: searchWhere,
    include: getStoryListInclude(lang),
    orderBy: [
      { publishedAt: "desc" },
      { createdAt: "desc" }
    ],
    skip: (page - 1) * limit,
    take: limit
  });

  const hasNextPage = page * limit < total;
  // APPLIED FIX
  const storiesWithCoverage = await addSourceCount(stories);

  const result = {
    stories: storiesWithCoverage,
    pagination: {
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.max(Math.ceil(total / limit), 1),
      hasNextPage,
      hasPreviousPage: page > 1,
      nextCursor: null
    }
  };

  await setCache(cacheKey, result, 60);
  return result;
};

const getSingleStory = async (id, lang = "en") => {
  const story = await prisma.story.findUnique({
    where: { id },
    include: getStoryDetailInclude(lang)
  });

  if (!story) {
    throw new AppError("Story not found", 404);
  }

  return story;
};

module.exports = {
  getStories,
  getSingleStory
};