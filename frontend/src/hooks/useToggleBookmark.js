import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import API from "../api/axios";
import { queryKeys } from "../api/queryKeys";
import { useToast } from "../context/useToast";

export const useToggleBookmark = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (storyId) => {
      if (!storyId || typeof storyId !== "string") {
        throw new Error("Invalid story ID");
      }

      const response = await API.post(
        `/stories/${storyId}/bookmark`
      );

      return {
        ...response.data,
        message: response.message,
      };
    },

    onSuccess: (result) => {
      toast.success(result.message || "Bookmark updated");

      // Refresh the bookmarks list.
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookmarks,
      });
    },

    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Bookmark action failed."
      );
    },
  });
};

export default useToggleBookmark;