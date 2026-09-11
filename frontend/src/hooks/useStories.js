import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import API from "../api/axios";
import { queryKeys } from "../api/queryKeys";

export const useStories = ({ search = "", limit = 10 } = {}) => {
  return useInfiniteQuery({
    queryKey: ["stories", search],
    queryFn: async ({ pageParam = 1 }) => {
      // Fixed: Capitalized API to match the import
      const { data } = await API.get("/stories", {
        params: { search, page: pageParam, limit },
      });
      return data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });
};

export const useSearch = (query) => {
  return useQuery({
    queryKey: queryKeys.stories.search(query),
    queryFn: async () => {
      const { data } = await API.get("/stories/search", {
        params: { q: query }
      });
      // Safely unwrap the payload
      return data?.stories ?? data ?? [];
    },
    // Only fire the request if the user has typed at least 2 characters
    enabled: Boolean(query && query.trim().length > 1),
    staleTime: 60 * 1000,
  });
};