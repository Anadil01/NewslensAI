const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const personalizationService = require("../services/personalizationService");

exports.getTopics = asyncHandler(async (req, res) => {
  const topics = await personalizationService.getTopics();
  return ApiResponse.success(res, { topics }, "Topics fetched successfully");
});

exports.getPreferences = asyncHandler(async (req, res) => {
  const preferences = await personalizationService.getPreferences(req.user);
  return ApiResponse.success(res, { preferences }, "Preferences fetched successfully");
});

exports.replacePreferences = asyncHandler(async (req, res) => {
  const preferences = await personalizationService.replacePreferences(
    req.user,
    req.body.preferences
  );
  return ApiResponse.success(res, { preferences }, "Preferences saved successfully");
});

exports.getPersonalizedFeed = asyncHandler(async (req, res) => {
  const result = await personalizationService.getPersonalizedFeed({
    userId: req.user,
    page: req.query.page,
    limit: req.query.limit,
    mode: req.query.mode,
    // Force lowercase
    lang: (req.query.lang || "en").toLowerCase() 
  });

  return ApiResponse.success(
    res,
    result,
    `${req.query.mode} feed fetched successfully`
  );
});

exports.recordReading = asyncHandler(async (req, res) => {
  const result = await personalizationService.recordReading({
    userId: req.user,
    storyId: req.params.id,
    durationSeconds: req.body.durationSeconds,
    completed: req.body.completed
  });
  return ApiResponse.success(res, result, "Reading activity recorded", 201);
});


exports.followTopic = asyncHandler(async (req, res) => {
  const preference = await personalizationService.followTopic({
    userId: req.user,
    topicId: req.params.topicId
  });

  return ApiResponse.success(
    res,
    { preference },
    "Topic followed successfully",
    201
  );
});

exports.unfollowTopic = asyncHandler(async (req, res) => {
  const result = await personalizationService.unfollowTopic({
    userId: req.user,
    topicId: req.params.topicId
  });

  return ApiResponse.success(
    res,
    result,
    "Topic unfollowed successfully"
  );
});


exports.setStoryFeedback = asyncHandler(async (req, res) => {
  const result = await personalizationService.setStoryFeedback({
    userId: req.user,
    storyId: req.params.id,
    feedback: req.body.feedback
  });

  return ApiResponse.success(
    res,
    result,
    "Story feedback saved successfully"
  );
});

exports.getStoryFeedback = asyncHandler(async (req, res) => {
  const result = await personalizationService.getStoryFeedback({
    userId: req.user,
    storyId: req.params.id
  });

  return ApiResponse.success(
    res,
    { feedback: result },
    "Story feedback fetched successfully"
  );
});

exports.removeStoryFeedback = asyncHandler(async (req, res) => {
  const result = await personalizationService.removeStoryFeedback({
    userId: req.user,
    storyId: req.params.id
  });

  return ApiResponse.success(
    res,
    result,
    "Story feedback removed successfully"
  );
});


exports.getSources = asyncHandler(async (req, res) => {
  const sources = await personalizationService.getSources();

  return ApiResponse.success(
    res,
    { sources },
    "Sources fetched successfully"
  );
});

exports.getSourcePreferences = asyncHandler(async (req, res) => {

  const preferences =
    await personalizationService.getSourcePreferences(req.user);

  return ApiResponse.success(
    res,
    { preferences },
    "Source preferences fetched successfully"
  );
});

exports.followSource = asyncHandler(async (req, res) => {
  const preference = await personalizationService.followSource({
    userId: req.user,
    sourceId: req.params.sourceId
  });

  return ApiResponse.success(
    res,
    { preference },
    "Source followed successfully",
    201
  );
});

exports.unfollowSource = asyncHandler(async (req, res) => {
  const result = await personalizationService.unfollowSource({
    userId: req.user,
    sourceId: req.params.sourceId
  });

  return ApiResponse.success(
    res,
    result,
    "Source unfollowed successfully"
  );
});



exports.skipStory = asyncHandler(async (req, res) => {
  const result = await personalizationService.skipStory({
    userId: req.user,
    storyId: req.params.id
  });

  return ApiResponse.success(
    res,
    result,
    "Story skipped successfully"
  );
});

exports.getStorySkip = asyncHandler(async (req, res) => {
  const result = await personalizationService.getStorySkip({
    userId: req.user,
    storyId: req.params.id
  });

  return ApiResponse.success(
    res,
    { skip: result },
    "Story skip status fetched successfully"
  );
});

exports.removeStorySkip = asyncHandler(async (req, res) => {
  const result = await personalizationService.removeStorySkip({
    userId: req.user,
    storyId: req.params.id
  });

  return ApiResponse.success(
    res,
    result,
    "Story skip removed successfully"
  );
});