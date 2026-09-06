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

// Detail view additionally needs bias analysis and summary entities.
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
  }
};

const buildStoriesCacheKey = ({
  page,
  limit,
  search,
  cursor
}) => {
  // `v2` marks the payload shape that carries source/summary/topic relations.
  // Bumping it prevents the 60s-old cached entries from the previous shape
  // being served to a client that now expects those fields.
  return `stories:v2:page:${page}:limit:${limit}:search:${search}:cursor:${cursor || "first"}`;
};


const encodeCursor = (story) => Buffer.from(JSON.stringify({
  points: story.points,
  id: story.id
})).toString("base64url");

const decodeCursor = (cursor) => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed.id !== "string" ||
      (parsed.points !== null && !Number.isInteger(parsed.points))) {
      throw new Error("Invalid cursor");
    }
    return parsed;
  } catch {
    throw new AppError("Invalid pagination cursor", 400);
  }
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
    console.log("Stories cache HIT:", cacheKey);
    return cachedResult;
  }

  console.log("Stories cache MISS:", cacheKey);

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
    const { points, id } = decodeCursor(cursor);
    const keysetWhere = points === null
      ? { points: null, id: { gt: id } }
      : {
          OR: [
            { points: { lt: points } },
            { points, id: { gt: id } },
            { points: null }
          ]
        };
    where = { AND: [searchWhere, keysetWhere] };
  }

  const total = cursor ? null : await prisma.story.count({ where });

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
    skip: cursor ? 0 : (page - 1) * limit,
    take: limit + 1
  });

  const hasNextPage = stories.length > limit;
  const pageStories = hasNextPage ? stories.slice(0, limit) : stories;
  const nextCursor = hasNextPage ? encodeCursor(pageStories.at(-1)) : null;

  const result = {
    stories: pageStories,
    pagination: {
      total,
      page,
      limit,
      totalPages: total === null ? null : Math.max(Math.ceil(total / limit), 1),
      hasNextPage,
      hasPreviousPage: Boolean(cursor) || page > 1,
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
