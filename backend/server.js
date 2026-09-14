const config = require("./config/env");
const app = require("./app");
const cron = require("node-cron");
const ingestionQueue = require("./queues/ingestionQueue");

const {
  connectRedis,
  redisClient,
} = require("./utils/redis");

const prisma = require("./utils/prisma");

const {
  connectElasticsearch,
} = require("./utils/elasticsearch");

const {
  createStoriesIndex,
} = require("./services/searchIndexService");

const PORT = Number(process.env.PORT) || Number(config.port) || 5001;

let server;
let ingestionWorker;
let ingestionCron;

/**
 * Start the HTTP server immediately.
 *
 * Render needs the application to bind to its assigned PORT
 * before it considers the deployment healthy.
 */
const startHttpServer = () => {
  return new Promise((resolve, reject) => {
    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      resolve();
    });

    server.on("error", reject);
  });
};

/**
 * Start background services after the HTTP server is available.
 */
const startBackgroundServices = async () => {
  try {
    console.log("🔌 Connecting to Redis...");
    await connectRedis();

    console.log("🔎 Connecting to Elasticsearch...");
    await connectElasticsearch();

    console.log("📚 Creating/checking stories index...");
    await createStoriesIndex();

    // Start the BullMQ worker.
    ingestionWorker = require("./workers/ingestionWorker");

    /**
     * Run ingestion every 30 minutes.
     */
    ingestionCron = cron.schedule("0,30 * * * *", async () => {
      console.log("⏰ Cron triggered: Adding ingestion job to queue...");

      try {
        await ingestionQueue.add("run-pipeline", {
          source: "all",
          timestamp: new Date().toISOString(),
        });

        console.log("✅ Ingestion job added to queue successfully.");
      } catch (error) {
        console.error(
          "❌ Failed to add ingestion job:",
          error.message
        );
      }
    });

    /**
     * Trigger an initial ingestion run.
     *
     * IMPORTANT:
     * This happens AFTER the HTTP server is already listening.
     * Render therefore does not have to wait for the ingestion
     * pipeline before detecting the application port.
     */
    console.log(
      "🚀 Adding initial NewsLensAI ingestion job..."
    );

    await ingestionQueue.add("run-pipeline-initial", {
      source: "all",
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Initial ingestion job added successfully.");
  } catch (error) {
    console.error(
      "❌ Background service startup failed:",
      error.message
    );

    throw error;
  }
};

/**
 * Graceful shutdown.
 */
const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down...`);

  try {
    // Stop cron from creating new jobs.
    if (ingestionCron) {
      ingestionCron.stop();
    }

    // Close HTTP server.
    if (server) {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    }

    // Close BullMQ worker.
    if (ingestionWorker?.close) {
      await ingestionWorker.close();
    }

    // Close Redis.
    if (redisClient?.isOpen) {
      await redisClient.quit();
    }

    // Disconnect Prisma.
    await prisma.$disconnect();

    console.log("✅ Shutdown complete.");
  } catch (shutdownError) {
    console.error(
      "❌ Error during shutdown:",
      shutdownError.message
    );
  }

  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

/**
 * Application startup.
 */
const startServer = async () => {
  try {
    /**
     * STEP 1
     *
     * Start HTTP server FIRST.
     *
     * This is critical for Render.
     */
    await startHttpServer();

    /**
     * STEP 2
     *
     * Start Redis, Elasticsearch, worker and ingestion
     * AFTER Render can already see the HTTP port.
     */
    await startBackgroundServices();

    console.log("=================================");
    console.log("🎉 NewsLensAI backend is ready");
    console.log(`🌐 Port: ${PORT}`);
    console.log("=================================");
  } catch (error) {
    console.error(
      "❌ Server startup failed:",
      error.message
    );

    if (server) {
      server.close();
    }

    process.exit(1);
  }
};

startServer();