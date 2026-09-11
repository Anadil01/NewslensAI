import { useInfiniteQuery } from "@tanstack/react-query";
import API from "../api/axios";
import { useLanguage } from "../context/useLanguage"; // 1. Import useLanguage

export const useFeed = ({ mode, limit = 10 }) => {
  const { language } = useLanguage(); // 2. Get active language

  return useInfiniteQuery({
    // 3. Include language in queryKey so it refetches when language changes
    queryKey: ["feed", mode, language],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await API.get(`/feed/personalized`, {
        params: { 
          mode, 
          page: pageParam, 
          limit,
          lang: language // 4. Send language parameter to backend
        },
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