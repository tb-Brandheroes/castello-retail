import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RECIPES } from "@/data/recipes";

type EventKind =
  | "session_start"
  | "session_complete"
  | "recipe_shown"
  | "recipe_picked"
  | "heartbeat";

type ActivityEvent = {
  id: string;
  ts: string; // ISO
  kind: EventKind;
  location: string | null;
  description: string;
};

const slugToName = new Map(
  RECIPES.map((r) => [r.slug, r.url.split("/").filter(Boolean).pop() ?? r.slug]),
);

const KIND_LABEL: Record<EventKind, string> = {
  session_start: "Session start",
  session_complete: "Session gennemført",
  recipe_shown: "Opskrift vist",
  recipe_picked: "Opskrift valgt",
  heartbeat: "Heartbeat",
};

const KIND_VARIANT: Record<
  EventKind,
  "default" | "secondary" | "outline" | "destructive"
> = {
  session_start: "secondary",
  session_complete: "default",
  recipe_shown: "outline",
  recipe_picked: "default",
  heartbeat: "outline",
};

function relTime(iso: string, now: number): string {
  const diffMs = now - new Date(iso).getTime();
  const s = Math.max(0, Math.round(diffMs / 1000));
  if (s < 60) return `for ${s}s siden`;
  const m = Math.round(s / 60);
  if (m < 60) return `for ${m}m siden`;
  const h = Math.round(m / 60);
  if (h < 24) return `for ${h}t siden`;
  const d = Math.round(h / 24);
  return `for ${d}d siden`;
}

type Props = {
  locationFilter: string; // "all" or specific
};

const PAGE = 40;

export const LiveActivity = ({ locationFilter }: Props) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [lastFetched, setLastFetched] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const seenIds = useRef<Set<string>>(new Set());

  const merge = (incoming: ActivityEvent[]) => {
    setEvents((prev) => {
      const map = new Map<string, ActivityEvent>();
      [...incoming, ...prev].forEach((e) => map.set(e.id, e));
      const arr = Array.from(map.values()).sort(
        (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
      );
      const trimmed = arr.slice(0, 100);
      seenIds.current = new Set(trimmed.map((e) => e.id));
      return trimmed;
    });
  };

  const fetchAll = async () => {
    const [s, v, h] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, location, started_at, ended_at, completed, picked_slug")
        .order("started_at", { ascending: false })
        .limit(PAGE),
      supabase
        .from("recipe_views")
        .select("id, session_id, recipe_slug, picked, created_at")
        .order("created_at", { ascending: false })
        .limit(PAGE),
      supabase
        .from("device_heartbeats")
        .select("id, location, app_version, created_at")
        .order("created_at", { ascending: false })
        .limit(PAGE),
    ]);

    const evs: ActivityEvent[] = [];
    (s.data ?? []).forEach((row: any) => {
      evs.push({
        id: `s-start-${row.id}`,
        ts: row.started_at,
        kind: "session_start",
        location: row.location,
        description: "Bruger startede en session",
      });
      if (row.completed && row.ended_at) {
        evs.push({
          id: `s-done-${row.id}`,
          ts: row.ended_at,
          kind: "session_complete",
          location: row.location,
          description: row.picked_slug
            ? `Valgte ${slugToName.get(row.picked_slug) ?? row.picked_slug}`
            : "Gennemførte session",
        });
      }
    });
    (v.data ?? []).forEach((row: any) => {
      evs.push({
        id: `v-${row.id}`,
        ts: row.created_at,
        kind: row.picked ? "recipe_picked" : "recipe_shown",
        location: null,
        description: slugToName.get(row.recipe_slug) ?? row.recipe_slug,
      });
    });
    (h.data ?? []).forEach((row: any) => {
      evs.push({
        id: `h-${row.id}`,
        ts: row.created_at,
        kind: "heartbeat",
        location: row.location,
        description: `App ${row.app_version ?? "?"}`,
      });
    });
    merge(evs);
    setLastFetched(Date.now());
    setLoading(false);
  };

  useEffect(() => {
    void fetchAll();
    const poll = window.setInterval(() => void fetchAll(), 10_000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);

    const channel = supabase
      .channel("dashboard-live-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sessions" },
        (payload) => {
          const row: any = payload.new;
          merge([
            {
              id: `s-start-${row.id}`,
              ts: row.started_at,
              kind: "session_start",
              location: row.location,
              description: "Bruger startede en session",
            },
          ]);
          setLastFetched(Date.now());
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions" },
        (payload) => {
          const row: any = payload.new;
          if (row.completed && row.ended_at) {
            merge([
              {
                id: `s-done-${row.id}`,
                ts: row.ended_at,
                kind: "session_complete",
                location: row.location,
                description: row.picked_slug
                  ? `Valgte ${slugToName.get(row.picked_slug) ?? row.picked_slug}`
                  : "Gennemførte session",
              },
            ]);
            setLastFetched(Date.now());
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recipe_views" },
        (payload) => {
          const row: any = payload.new;
          merge([
            {
              id: `v-${row.id}`,
              ts: row.created_at,
              kind: row.picked ? "recipe_picked" : "recipe_shown",
              location: null,
              description: slugToName.get(row.recipe_slug) ?? row.recipe_slug,
            },
          ]);
          setLastFetched(Date.now());
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "device_heartbeats" },
        (payload) => {
          const row: any = payload.new;
          merge([
            {
              id: `h-${row.id}`,
              ts: row.created_at,
              kind: "heartbeat",
              location: row.location,
              description: `App ${row.app_version ?? "?"}`,
            },
          ]);
          setLastFetched(Date.now());
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    if (locationFilter === "all") return events;
    return events.filter(
      (e) => e.location === null || (e.location ?? "unknown") === locationFilter,
    );
  }, [events, locationFilter]);

  const newestTs = events[0] ? new Date(events[0].ts).getTime() : 0;
  const stale = newestTs && now - newestTs > 5 * 60 * 1000;
  const statusColor = !newestTs
    ? "bg-muted-foreground"
    : stale
      ? "bg-yellow-500"
      : "bg-green-500";
  const statusText = !newestTs
    ? "Ingen events endnu"
    : stale
      ? "Ingen nye events i 5+ min"
      : "Modtager events";

  return (
    <div className="bg-card border rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Live aktivitet</h3>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            {statusText}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Opdateret {relTime(new Date(lastFetched).toISOString(), now)}
          </span>
          <Button variant="outline" size="sm" onClick={() => void fetchAll()}>
            Genindlæs
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Indlæser…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen aktivitet endnu.</p>
      ) : (
        <ul className="divide-y max-h-[420px] overflow-auto">
          {visible.slice(0, 60).map((e) => (
            <li key={e.id} className="py-2 flex items-center gap-3 text-sm">
              <span className="text-xs text-muted-foreground w-28 shrink-0 tabular-nums">
                {new Date(e.ts).toLocaleTimeString("da-DK")}
              </span>
              <Badge variant={KIND_VARIANT[e.kind]} className="shrink-0">
                {KIND_LABEL[e.kind]}
              </Badge>
              <span className="truncate flex-1">{e.description}</span>
              {e.location && (
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                  {e.location}
                </span>
              )}
              <span className="text-xs text-muted-foreground w-28 shrink-0 text-right">
                {relTime(e.ts, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LiveActivity;
