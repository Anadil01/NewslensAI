const express = require("express");
const cors = require("cors");

const config = require("./config/env");

const securityHeaders = require("./middleware/securityMiddleware");
const { apiLimiter } = require("./middleware/rateLimitMiddleware");

const app = express();

/* =========================================================
   SECURITY
========================================================= */

app.use(securityHeaders);

app.use(
  cors({
    origin: config.clientUrl,
  })
);

/* =========================================================
   BODY PARSING
========================================================= */

app.use(
  express.json({
    limit: "1mb",
  })
);

/* =========================================================
   API RATE LIMITING
========================================================= */

app.use("/api", apiLimiter);

/* =========================================================
   ROOT / SERVICE STATUS
========================================================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "NewsLensAI API",
    status: "running",
  });
});

/* =========================================================
   AUTH
========================================================= */

app.use(
  "/api/auth",
  require("./routes/authRoutes")
);

/* =========================================================
   STORIES
========================================================= */

app.use(
  "/api",
  require("./routes/storyRoutes")
);

/* =========================================================
   PUBLIC TOPICS & SOURCES
========================================================= */

// These catalogues are public.
// Only follow/unfollow actions require authentication.

app.get(
  "/api/topics",
  require("./controllers/personalizationController").getTopics
);

app.get(
  "/api/sources",
  require("./controllers/personalizationController").getSources
);

/* =========================================================
   PERSONALIZATION
========================================================= */

app.use(
  "/api",
  require("./routes/personalizationRoutes")
);

/* =========================================================
   CLUSTERS
========================================================= */

app.use(
  "/api",
  require("./routes/clusterRoutes")
);

/* =========================================================
   HEALTH
========================================================= */

app.use(
  require("./routes/healthRoutes")
);

/* =========================================================
   ERROR HANDLING
========================================================= */

const notFound = require("./middleware/notFoundMiddleware");
const errorHandler = require("./middleware/errorMiddleware");

app.use(notFound);
app.use(errorHandler);

module.exports = app;