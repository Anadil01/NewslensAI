-- Add model-generated structured intelligence to AI summaries.
ALTER TABLE "ai_summaries"
  ADD COLUMN "key_points" JSONB,
  ADD COLUMN "why_it_matters" TEXT,
  ADD COLUMN "what_next" TEXT;
