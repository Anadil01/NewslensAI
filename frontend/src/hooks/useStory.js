import { useQuery } from "@tanstack/react-query";

import API from "../api/axios";
import { queryKeys } from "../api/queryKeys";

/*
 * All paths here are relative to VITE_API_URL, which already ends in `/api`.
 * Prefixing them again produces `/api/api/...` and a 404.
 */

/**
 * GET /stories/:id
 *
 * Returns the story with `source`, latest `aiSummaries[0]`, `storyTopics[]`
 * and `biasAnalysis` included by the backend.
 */
export const useStory = (id) => {
  return useQuery({
    queryKey: ["story", id],
    queryFn: async () => {
      const { data } = await API.get(`/stories/${id}`);
      return data?.data || data;
    },
    enabled: Boolean(id),
  });
};

/**
 * GET /clusters/:id
 *
 * Payload shape: { id, ...cluster, stories: [...], sourceCount }
 */
export const useCluster = (clusterId) => {
  return useQuery({
    queryKey: queryKeys.clusters.detail(clusterId),

    queryFn: async () => {
      const { data } = await API.get(`/clusters/${clusterId}`);
      return data;
    },

    enabled: Boolean(clusterId)
  });
};

/**
 * GET /stories/:id/related
 *
 * Payload shape: { storyId, clusterId, stories: [...], relatedCount }.
 * The array is unwrapped here so callers get a plain list.
 */
export const useRelatedStories = (id) => {
  return useQuery({
    queryKey: queryKeys.stories.related(id),

    queryFn: async () => {
      const { data } = await API.get(`/stories/${id}/related`);

      return Array.isArray(data?.stories) ? data.stories : [];
    },

    enabled: Boolean(id)
  });
};
