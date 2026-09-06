const express = require("express");
const validate = require("../middleware/validateMiddleware");
const controller = require("../controllers/clusterController");

const {
  clusterIdParamsSchema,
  storyIdParamsSchema,
  clusterQuerySchema
} = require("../validations/clusterValidation");

const router = express.Router();

router.get(
  "/clusters",
  validate(clusterQuerySchema, "query"),
  controller.getClusters
);



router.get(
  "/clusters/:id",
  validate(clusterIdParamsSchema, "params"),
  controller.getCluster
);

router.get(
  "/stories/:id/related",
  validate(storyIdParamsSchema, "params"),
  controller.getRelatedStories
);

module.exports = router;
