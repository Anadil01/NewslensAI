const { z } = require("zod");

const personalizedFeedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(10),
  mode: z
    .enum(["personalized", "latest", "trending"])
    .default("personalized"),
  lang: z.string().trim().default("en") // Add lang support here
});

const preferencesSchema = z.object({
  preferences: z.array(
      z.object({
          topicId: z.uuid("Invalid topic ID"),
          preference: z.number().int().min(-5).max(5)
      })
  )
  .min(1)
  .max(20)
}).superRefine((data, context) => {
  const topicIds = new Set();

  for (const [index, preference] of data.preferences.entries()) {
      if (topicIds.has(preference.topicId)) {
          context.addIssue({
              code: "custom",
              path: ["preferences", index, "topicId"],
              message: "Topic IDs must be unique"
          });
      }

      topicIds.add(preference.topicId);
  }
});

const readingActivitySchema = z.object({
  durationSeconds: z.number().int().min(0).max(86_400).default(0),
  completed: z.boolean().default(false)
});

const topicIdParamsSchema = z.object({
  topicId: z.uuid("Invalid topic ID")
});

const feedbackSchema = z.object({
  feedback: z.enum(["LIKE", "DISLIKE"])
});

const sourceIdParamsSchema = z.object({
  sourceId: z.uuid("Invalid source ID")
});

const skipSchema = z.object({
  skipped: z.boolean().default(true)
});

module.exports = {
  personalizedFeedQuerySchema,
  preferencesSchema,
  readingActivitySchema,
  topicIdParamsSchema,
  feedbackSchema,
  sourceIdParamsSchema,
  skipSchema
};
