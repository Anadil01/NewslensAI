import { useQuery } from "@tanstack/react-query";

import API from "../api/axios";
import { queryKeys } from "../api/queryKeys";
import { useAuth } from "../context/useAuth";

/**
 * Fetch the current user's bookmarked stories.
 *
 * Backend response:
 * {
 *   bookmarks: [
 *     {
 *       id,
 *       storyId,
 *       story: {...}
 *     }
 *   ]
 * }
 *
 * StoryCard needs the actual story objects, so we unwrap
 * bookmark.story here.
 */
const fetchBookmarks = async () => {
  const { data } = await API.get("/bookmarks");

  return (data?.bookmarks ?? [])
    .map((bookmark) => bookmark?.story)
    .filter(Boolean);
};

export const useBookmarks = (options = {}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: fetchBookmarks,

    // Never call the protected /bookmarks endpoint
    // when the user is signed out.
    enabled: Boolean(user) && (options.enabled ?? true),

    // Avoid unnecessary requests while navigating
    // between feed/story pages.
    staleTime: 30_000,

    ...options,

    // Make sure a caller cannot accidentally enable
    // the protected request while signed out.
    enabled: Boolean(user) && (options.enabled ?? true),
  });
};

export default useBookmarks;