const { z } = require("zod");

const storyIdParamsSchema = z.object({
  id: z.uuid("Invalid story ID")
});

const storyQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(24)
    .default(6),

  search: z
    .string()
    .trim()
    .default(""),

  cursor: z.string().trim().min(1).max(500).optional(),
  
  // Accept the language parameter so Zod doesn't strip it!
  lang: z.string().trim().default("en") 
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(200),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(10),
  sort: z.enum(["relevance", "points", "newest"]).default("relevance"),
  
  // Accept the language parameter here too
  lang: z.string().trim().default("en")
});

module.exports = {
  storyIdParamsSchema,
  storyQuerySchema,
  searchQuerySchema
};