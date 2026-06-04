import { supabase } from "@/integrations/supabase/client";

export type Step = "start" | "duration" | "tags" | "results" | "detail";

let sessionId: string | null = null;
let location: string | null = null;

const OUTBOX_KEY = "castello.analytics.outbox.v1";
const HEARTBEAT_KEY = "castello.analytics.lastHeartbeat.v1";

type OutboxItem =
  | { kind: "session-insert"; tempId: string; row: Record<string, unknown> }
  | { kind: "session-update"; sessionId: string; patch: Record<string, unknown> }
  | { kind: "view-insert"; sessionId: string; rows: Record<string, unknown>[] }
  | { kind: "heartbeat-insert"; row: Record<string, unknown> };

/* ---------------- IndexedDB backup (Step 4) ---------------- */

const IDB_NAME = "castello-analytics";
const IDB_STORE = "outbox";

function openIdb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbWriteAll(items: OutboxItem[]) {
  const db = await openIdb();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    store.put({ key: "outbox", items });
  } catch {
    /* ignore */
  }
}

async function idbReadAll(): Promise<OutboxItem[]> {
  const db = await openIdb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get("outbox");
      req.onsuccess = () => resolve((req.result?.items as OutboxItem[]) ?? []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/* ---------------- Outbox (localStorage + IDB mirror) ---------------- */

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
  void idbWriteAll(items);
}
function enqueue(item: OutboxItem) {
  const items = readOutbox();
  items.push(item);
  writeOutbox(items);
}

/** Recover from IndexedDB if localStorage got cleared but IDB still has data. */
export async function recoverOutboxFromIdb() {
  try {
    const ls = readOutbox();
    if (ls.length > 0) return;
    const idb = await idbReadAll();
    if (idb.length > 0) {
      try {
        localStorage.setItem(OUTBOX_KEY, JSON.stringify(idb));
      } catch {
        /* quota */
      }
    }
  } catch {
    /* ignore */
  }
}

/* ---------------- Helpers ---------------- */

const LOCATION_KEY = "castello.location";

const getLocation = () => {
  if (location !== null) return location;
  try {
    const stored = localStorage.getItem(LOCATION_KEY);
    if (stored && stored.trim()) {
      location = stored.trim();
      return location;
    }
    const params = new URLSearchParams(window.location.search);
    location = params.get("loc") || "unknown";
  } catch {
    location = "unknown";
  }
  return location;
};

export function setDeviceLocation(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(LOCATION_KEY, trimmed);
  } catch {
    /* ignore */
  }
  location = trimmed;
}

export function getDeviceLocation(): string {
  try {
    return localStorage.getItem(LOCATION_KEY) ?? "";
  } catch {
    return "";
  }
}

const getTzOffset = () => {
  try {
    return new Date().getTimezoneOffset();
  } catch {
    return null;
  }
};

const getAppVersion = () => {
  try {
    return typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "unknown";
  } catch {
    return "unknown";
  }
};

const isOnline = () =>
  typeof navigator === "undefined" ? true : navigator.onLine !== false;

/* ---------------- Public API ---------------- */

export async function startSession() {
  const row = {
    location: getLocation(),
    abandoned_step: "start",
    started_at: new Date().toISOString(),
    tz_offset_minutes: getTzOffset(),
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

/* ---------------- Heartbeat (Step 10) ---------------- */

const HEARTBEAT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function sendHeartbeat(force = false) {
  try {
    const last = Number(localStorage.getItem(HEARTBEAT_KEY) ?? "0");
    if (!force && Date.now() - last < HEARTBEAT_INTERVAL_MS) return;
  } catch {
    /* ignore */
  }
  const row = {
    location: getLocation(),
    app_version: getAppVersion(),
    tz_offset_minutes: getTzOffset(),
  };
  if (!isOnline()) {
    enqueue({ kind: "heartbeat-insert", row });
    return;
  }
  try {
    const { error } = await supabase.from("device_heartbeats").insert(row as never);
    if (error) throw error;
    try {
      localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  } catch (e) {
    console.warn("sendHeartbeat failed, queueing", e);
    enqueue({ kind: "heartbeat-insert", row });
  }
}

/* ---------------- Flush ---------------- */

let flushing = false;
export async function flushOutbox() {
  if (flushing) return;
  if (!isOnline()) return;
  const items = readOutbox();
  if (items.length === 0) return;
  flushing = true;
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
        } else if (item.kind === "heartbeat-insert") {
          const { error } = await supabase
            .from("device_heartbeats")
            .insert(item.row as never);
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

/* ---------------- Background scheduler (Step 10) ---------------- */

let schedulerStarted = false;
export function startBackgroundScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  // Recover any IDB-only data first
  void recoverOutboxFromIdb().then(() => {
    void flushOutbox();
    void sendHeartbeat();
  });
  // Periodic flush every 5 min
  window.setInterval(() => {
    void flushOutbox();
  }, 5 * 60 * 1000);
  // Heartbeat every 15 min (gated by 1h cooldown inside sendHeartbeat)
  window.setInterval(() => {
    void sendHeartbeat();
  }, 15 * 60 * 1000);
  // Flush on reconnect
  window.addEventListener("online", () => {
    void flushOutbox();
    void sendHeartbeat();
  });
}
