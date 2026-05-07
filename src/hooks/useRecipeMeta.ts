import { useQuery } from "@tanstack/react-query";

export type RecipeMeta = { name: string; description: string; image: string };

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recipe-meta`;

async function fetchMeta(url: string): Promise<RecipeMeta> {
  const res = await fetch(`${FUNCTIONS_URL}?url=${encodeURIComponent(url)}`, {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!res.ok) throw new Error(`Failed to load recipe metadata (${res.status})`);
  return res.json();
}

export function useRecipeMeta(url: string | null) {
  return useQuery({
    queryKey: ["recipe-meta", url],
    queryFn: () => fetchMeta(url!),
    enabled: !!url,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
}
