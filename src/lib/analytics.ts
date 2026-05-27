import { supabase } from "@/integrations/supabase/client";

export type Step = "start" | "duration" | "tags" | "results" | "detail";

let sessionId: string | null = null;
let location: string | null = null;

const OUTBOX_KEY = "castello.analytics.outbox.v1";
type OutboxItem =
  | { kind: "session-insert"; tempId: string; row: Record<string, unknown> }
  | { kind: "session-update"; sessionId: string; patch: Record<string, unknown> }
  | { kind: "view-insert"; sessionId: string; rows: Record<string, unknown>[] };

function readOutbox(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeOutbox(items: OutboxItem[]) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  } catch {
    /* quota */
  }
}
function enqueue(item: OutboxItem) {
  const items = readOutbox();
  items.push(item);
  writeOutbox(items);
}

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

const isOnline = () =>
  typeof navigator === "undefined" ? true : navigator.onLine !== false;

export async function startSession() {
  const row = {
    location: getLocation(),
    abandoned_step: "start",
    started_at: new Date().toISOString(),
  };
  if (!isOnline()) {
    sessionId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    enqueue({ kind: "session-insert", tempId: sessionId, row });
    return;
  }
  try {
    const { data, error } = await supabase
      .from("sessions")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    sessionId = data.id;
  } catch (e) {
    console.warn("startSession failed, queueing", e);
    sessionId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    enqueue({ kind: "session-insert", tempId: sessionId, row });
  }
}

type SessionPatch = Partial<{
  abandoned_step: string | null;
  completed: boolean;
  duration: string;
  ended_at: string;
  location: string;
  picked_slug: string;
  shown_slugs: string[];
  tags: string[];
}>;

export async function updateSession(patch: SessionPatch) {
  if (!sessionId) return;
  if (!isOnline() || sessionId.startsWith("local-")) {
    enqueue({ kind: "session-update", sessionId, patch: patch as Record<string, unknown> });
    return;
  }
  try {
    await supabase.from("sessions").update(patch as never).eq("id", sessionId);
  } catch (e) {
    console.warn("updateSession failed, queueing", e);
    enqueue({ kind: "session-update", sessionId, patch: patch as Record<string, unknown> });
  }
}

export async function logShownRecipes(slugs: string[]) {
  if (!sessionId) return;
  await updateSession({ shown_slugs: slugs });
  const rows = slugs.map((s) => ({ recipe_slug: s }));
  if (!isOnline() || sessionId.startsWith("local-")) {
    enqueue({ kind: "view-insert", sessionId, rows });
    return;
  }
  try {
    await supabase
      .from("recipe_views")
      .insert(rows.map((r) => ({ ...r, session_id: sessionId })));
  } catch (e) {
    console.warn("logShownRecipes failed, queueing", e);
    enqueue({ kind: "view-insert", sessionId, rows });
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
  const rows = [{ recipe_slug: slug, picked: true }];
  if (!isOnline() || sessionId.startsWith("local-")) {
    enqueue({ kind: "view-insert", sessionId, rows });
    return;
  }
  try {
    await supabase
      .from("recipe_views")
      .insert(rows.map((r) => ({ ...r, session_id: sessionId })));
  } catch (e) {
    console.warn("logPicked failed, queueing", e);
    enqueue({ kind: "view-insert", sessionId, rows });
  }
}

export function endSessionAbandoned(step: Step) {
  if (!sessionId) return;
  void updateSession({ abandoned_step: step, ended_at: new Date().toISOString() });
}

export function clearSession() {
  sessionId = null;
}

export function hasSession() {
  return !!sessionId;
}

/** Try to flush queued events. Safe to call multiple times. */
let flushing = false;
export async function flushOutbox() {
  if (flushing) return;
  if (!isOnline()) return;
  const items = readOutbox();
  if (items.length === 0) return;
  flushing = true;
  // tempId -> real uuid produced when we insert the queued session
  const idMap = new Map<string, string>();
  const remaining: OutboxItem[] = [];
  try {
    for (const item of items) {
      try {
        if (item.kind === "session-insert") {
          const { data, error } = await supabase
            .from("sessions")
            .insert(item.row as never)
            .select("id")
            .single();
          if (error) throw error;
          idMap.set(item.tempId, (data as { id: string }).id);
        } else if (item.kind === "session-update") {
          const realId = idMap.get(item.sessionId) ?? item.sessionId;
          if (realId.startsWith("local-")) {
            remaining.push(item);
            continue;
          }
          const { error } = await supabase
            .from("sessions")
            .update(item.patch as never)
            .eq("id", realId);
          if (error) throw error;
        } else if (item.kind === "view-insert") {
          const realId = idMap.get(item.sessionId) ?? item.sessionId;
          if (realId.startsWith("local-")) {
            remaining.push(item);
            continue;
          }
          const { error } = await supabase
            .from("recipe_views")
            .insert(item.rows.map((r) => ({ ...r, session_id: realId })) as never);
          if (error) throw error;
        }
      } catch (e) {
        console.warn("flushOutbox item failed", e);
        remaining.push(item);
      }
    }
  } finally {
    writeOutbox(remaining);
    flushing = false;
  }
}
