import { supabase } from "@/integrations/supabase/client";

export type Step = "start" | "duration" | "tags" | "results" | "detail";

let sessionId: string | null = null;
let location: string | null = null;

const getLocation = () => {
  if (location !== null) return location;
  try {
    const params = new URLSearchParams(window.location.search);
    location = params.get("loc") || "unknown";
  } catch {
    location = "unknown";
  }
  return location;
};

export async function startSession() {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .insert({ location: getLocation(), abandoned_step: "start" })
      .select("id")
      .single();
    if (error) throw error;
    sessionId = data.id;
  } catch (e) {
    console.warn("startSession failed", e);
  }
}

export async function updateSession(patch: Record<string, unknown>) {
  if (!sessionId) return;
  try {
    await supabase.from("sessions").update(patch).eq("id", sessionId);
  } catch (e) {
    console.warn("updateSession failed", e);
  }
}

export async function logShownRecipes(slugs: string[]) {
  if (!sessionId) return;
  await updateSession({ shown_slugs: slugs });
  try {
    await supabase
      .from("recipe_views")
      .insert(slugs.map((s) => ({ session_id: sessionId, recipe_slug: s })));
  } catch (e) {
    console.warn("logShownRecipes failed", e);
  }
}

export async function logPicked(slug: string) {
  if (!sessionId) return;
  await updateSession({
    picked_slug: slug,
    completed: true,
    ended_at: new Date().toISOString(),
    abandoned_step: null,
  });
  try {
    await supabase
      .from("recipe_views")
      .insert({ session_id: sessionId, recipe_slug: slug, picked: true });
  } catch (e) {
    console.warn("logPicked failed", e);
  }
}

export function endSessionAbandoned(step: Step) {
  if (!sessionId) return;
  // fire-and-forget
  supabase
    .from("sessions")
    .update({ abandoned_step: step, ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .then(() => {});
}

export function clearSession() {
  sessionId = null;
}

export function hasSession() {
  return !!sessionId;
}
