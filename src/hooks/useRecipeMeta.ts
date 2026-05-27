import recipesMeta from "@/data/recipes-meta.json";

export type RecipeMeta = { name: string; description: string; image: string };

const META: Record<string, RecipeMeta> = recipesMeta as Record<string, RecipeMeta>;

const EMPTY: RecipeMeta = { name: "", description: "", image: "" };

export function getRecipeMeta(url: string | null): RecipeMeta {
  if (!url) return EMPTY;
  return META[url] ?? EMPTY;
}

/** Backwards-compatible hook: synchronous, always resolved from bundled JSON. */
export function useRecipeMeta(url: string | null): {
  data: RecipeMeta | undefined;
  isLoading: false;
} {
  const meta = url ? META[url] : undefined;
  return { data: meta, isLoading: false };
}

// No-op for legacy callers
export function prefetchRecipeMeta(_qc: unknown, _url: string) {
  return Promise.resolve();
}
