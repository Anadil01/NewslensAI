// Change this line:
const { Client } = require("@opensearch-project/opensearch");

const config = require("../config/env");

const elasticsearchClient = new Client({
  node: config.elasticsearchUrl
});

const connectElasticsearch = async () => {
  try {
    const response = await elasticsearchClient.info();

    // response.body.version.number contains the version in the OpenSearch client
    const version = response.body ? response.body.version.number : response.version?.number || 'Unknown';

    console.log(`Search Engine connected: ${version}`);
  } catch (error) {
    console.error("Search Engine connection failed:", error.message);
    throw error;
  }
};

module.exports = {
  elasticsearchClient,
  connectElasticsearch
};