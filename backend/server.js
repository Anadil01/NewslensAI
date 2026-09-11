const config = require("./config/env");
const app = require("./app");
const cron = require("node-cron");
const { ingestionQueue } = require("./queues/ingestionQueue");

const {
  connectRedis,
  redisClient
} = require("./utils/redis");

const prisma = require("./utils/prisma");

const {
  connectElasticsearch
} = require("./utils/elasticsearch");

const {
  createStoriesIndex
} = require("./services/searchIndexService");

const startServer = async () => {
  try {
    await connectRedis();
    await connectElasticsearch();
    await createStoriesIndex();

    const ingestionWorker = require("./workers/ingestionWorker");

    // 1. Setup the 30-minute background cron job
    const ingestionCron = cron.schedule("0,30 * * * *", async () => {
      console.log("⏰ Cron triggered: Adding ingestion job to queue...");
      try {
        await ingestionQueue.add("run-pipeline", {
          source: "all",
          timestamp: new Date().toISOString()
        });
        console.log("✅ Ingestion job added to queue successfully.");
      } catch (error) {
        console.error("❌ Failed to add ingestion job:", error.message);
      }
    });

    // 2. Trigger an immediate run right now so the feed populates instantly!
    console.log("🚀 Server starting: Triggering initial ingestion job for first load...");
    await ingestionQueue.add("run-pipeline-initial", {
      source: "all",
      timestamp: new Date().toISOString()
    });

    const server = app.listen(
      config.port,
      () => {
        console.log(`🚀 Server running on ${config.port}`);
      }
    );

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down...`);

      server.close();

      try {
        // Stop the cron job from firing during shutdown
        ingestionCron.stop();

        await ingestionWorker.close();

        if (redisClient.isOpen) {
          await redisClient.quit();
        }

        await prisma.$disconnect();
      } catch (shutdownError) {
        console.error(
          "Error during shutdown:",
          shutdownError.message
        );
      }

      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.log("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();