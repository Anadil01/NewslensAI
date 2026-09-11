const prisma = require("../utils/prisma");

const {
  elasticsearchClient
} = require("../utils/elasticsearch");

const {
  STORIES_INDEX
} = require("./searchIndexService");


const indexStory = async (story) => {
  await elasticsearchClient.index({
    index: STORIES_INDEX,
    id: story.id,
    document: {
      id: story.id,
      sourceId: story.sourceId,
      externalId: story.externalId,
      canonicalUrl: story.canonicalUrl,
      title: story.title,
      author: story.author,
      content: story.content,
      excerpt: story.excerpt,
      points: story.points,
      readingTimeSeconds: story.readingTimeSeconds,
      publishedAt: story.publishedAt
    },
    refresh: "wait_for"
  });
};


const bulkIndexStories = async () => {
  const stories = await prisma.story.findMany();

  if (stories.length === 0) {
    console.log(
      "No stories found to index"
    );

    return {
      indexed: 0
    };
  }

  const operations = [];

  for (const story of stories) {
    operations.push({
      index: {
        _index: STORIES_INDEX,
        _id: story.id
      }
    });

    operations.push({
      id: story.id,
      sourceId: story.sourceId,
      externalId: story.externalId,
      canonicalUrl: story.canonicalUrl,
      title: story.title,
      author: story.author,
      content: story.content,
      excerpt: story.excerpt,
      points: story.points,
      readingTimeSeconds: story.readingTimeSeconds,
      publishedAt: story.publishedAt
    });
  }

  const response =
    await elasticsearchClient.bulk({
      operations,
      refresh: "wait_for"
    });

  if (response.errors) {
    console.error(
      "Some stories failed to index"
    );

    console.error(
      response.items.filter(
        (item) => item.index?.error
      )
    );

    throw new Error(
      "Bulk story indexing failed"
    );
  }

  console.log(
    `Stories indexed successfully: ${stories.length}`
  );

  return {
    indexed: stories.length
  };
};


const searchStories = async ({
  query,
  page = 1,
  limit = 10,
  sort = "relevance"
}) => {
  const from = (page - 1) * limit;
  
  let sortOptions;
  if (sort === "points") {
    sortOptions = [
      {
        points: {
          order: "desc",
          missing: "_last"
        }
      }
    ];
  } else if (sort === "newest") {
    sortOptions = [
      {
        publishedAt: {
          order: "desc",
          missing: "_last"
        }
      }
    ];
  } else {
    sortOptions = [
      "_score"
    ];
  }
  const response =
    await elasticsearchClient.search({
      index: STORIES_INDEX,

      from,

      size: limit,
      sort: sortOptions,
      
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query,
      
                type: "phrase",
      
                fields: [
                  "title^8",
                  "excerpt^4",
                  "content^2",
                  "author"
                ]
              }
            },
      
            {
              multi_match: {
                query,
      
                fields: [
                  "title^4",
                  "excerpt^2",
                  "content",
                  "author"
                ],
      
                fuzziness: "AUTO"
              }
            }
          ],
      
          minimum_should_match: 1
        }
      }
    });

  const hits = response.hits.hits;

  return {
    stories: hits.map((hit) => ({
      ...hit._source,
      score: hit._score
    })),

    pagination: {
      total:
        typeof response.hits.total === "object"
          ? response.hits.total.value
          : response.hits.total,

      page,

      limit,

      totalPages: Math.max(
        Math.ceil(
          (
            typeof response.hits.total === "object"
              ? response.hits.total.value
              : response.hits.total
          ) / limit
        ),
        1
      ),

      hasNextPage:
        page * limit <
        (
          typeof response.hits.total === "object"
            ? response.hits.total.value
            : response.hits.total
        ),

      hasPreviousPage:
        page > 1
    }
  };
};


module.exports = {
  indexStory,
  bulkIndexStories,
  searchStories
};