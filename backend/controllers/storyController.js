const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");

const searchService = require("../services/searchService");
const bookmarkService = require("../services/bookmarkService");
const storyService = require("../services/storyService");

const {
  enqueueIngestion,
} = require("../services/ingestionJobService");

// Trigger ingestion
exports.triggerIngestion = asyncHandler(async (req, res) => {
  const result = await enqueueIngestion(req.user);

  return ApiResponse.success(
    res,
    result,
    "Ingestion job queued successfully",
    202
  );
});

// Get stories
exports.getStories = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 24);
  const search = req.query.search?.trim() || "";
  
  // Force lowercase so "Hinglish" becomes "hinglish"
  const lang = (req.query.lang || "en").toLowerCase(); 

  const result = await storyService.getStories({
    page,
    limit,
    search,
    cursor: req.query.cursor,
    lang,
  });

  return ApiResponse.success(res, result, "Stories fetched successfully");
});
// Get single story
exports.getSingleStory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Force lowercase here as well
  const lang = (req.query.lang || "en").toLowerCase(); 

  const story = await storyService.getSingleStory(id, lang);

  return ApiResponse.success(res, story, "Story fetched successfully");
});


// Toggle bookmark
exports.toggleBookmark = asyncHandler(async (req, res) => {
  const result =
    await bookmarkService.toggleBookmark(
      req.user,
      req.params.id
    );

  return ApiResponse.success(
    res,
    result,
    result.bookmarked
      ? "Bookmark added"
      : "Bookmark removed"
  );
});

// Get bookmarks
exports.getBookmarks = asyncHandler(async (req, res) => {
  const result =
    await bookmarkService.getBookmarks(
      req.user
    );

  return ApiResponse.success(
    res,
    result,
    "Bookmarks fetched successfully"
  );
});

// Search stories
exports.searchStories = asyncHandler(async (req, res) => {
  const result =
    await searchService.searchStories({
      query: req.query.q,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
    });

  return ApiResponse.success(
    res,
    result,
    "Search results fetched successfully"
  );
});
