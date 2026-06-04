import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getDeviceLocation, setDeviceLocation } from "@/lib/analytics";
import { RECIPES } from "@/data/recipes";

type Session = {
  id: string;
  location: string | null;
  started_at: string;
  ended_at: string | null;
  completed: boolean;
  abandoned_step: string | null;
  duration: string | null;
  tags: string[] | null;
  picked_slug: string | null;
};

type View = {
  id: string;
  session_id: string;
  recipe_slug: string;
  picked: boolean;
  created_at: string;
};

const slugToName = new Map(RECIPES.map((r) => [r.slug, r.url.split("/").filter(Boolean).pop() ?? r.slug]));

const Dashboard = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [locFilter, setLocFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [deviceName, setDeviceName] = useState<string>(() => getDeviceLocation());
  const [nameInput, setNameInput] = useState<string>(() => getDeviceLocation());

  const saveDeviceName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast.error("Skriv et navn til denne skærm");
      return;
    }
    setDeviceLocation(trimmed);
    setDeviceName(trimmed);
    toast.success(`Skærm gemt som "${trimmed}"`);
  };

  useEffect(() => {
    document.title = "Castello Kiosk – Dashboard";
    const load = async () => {
      setLoading(true);
      const [s, v] = await Promise.all([
        supabase.from("sessions").select("*").order("started_at", { ascending: false }).limit(2000),
        supabase.from("recipe_views").select("*").order("created_at", { ascending: false }).limit(5000),
      ]);
      setSessions((s.data as Session[]) ?? []);
      setViews((v.data as View[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const locations = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => set.add(s.location ?? "unknown"));
    return ["all", ...Array.from(set).sort()];
  }, [sessions]);

  const filteredSessions = useMemo(
    () => (locFilter === "all" ? sessions : sessions.filter((s) => (s.location ?? "unknown") === locFilter)),
    [sessions, locFilter],
  );
  const sessionIds = useMemo(() => new Set(filteredSessions.map((s) => s.id)), [filteredSessions]);
  const filteredViews = useMemo(() => views.filter((v) => sessionIds.has(v.session_id)), [views, sessionIds]);

  const total = filteredSessions.length;
  const completed = filteredSessions.filter((s) => s.completed).length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  const dropoff = useMemo(() => {
    const counts: Record<string, number> = { start: 0, duration: 0, tags: 0, results: 0 };
    filteredSessions.forEach((s) => {
      if (s.completed) return;
      const step = s.abandoned_step ?? "start";
      counts[step] = (counts[step] ?? 0) + 1;
    });
    return counts;
  }, [filteredSessions]);

  const popular = useMemo(() => {
    const shown: Record<string, number> = {};
    const picked: Record<string, number> = {};
    filteredViews.forEach((v) => {
      shown[v.recipe_slug] = (shown[v.recipe_slug] ?? 0) + 1;
      if (v.picked) picked[v.recipe_slug] = (picked[v.recipe_slug] ?? 0) + 1;
    });
    const rows = Object.keys(shown).map((slug) => ({
      slug,
      shown: shown[slug],
      picked: picked[slug] ?? 0,
      rate: shown[slug] ? Math.round(((picked[slug] ?? 0) / shown[slug]) * 100) : 0,
    }));
    rows.sort((a, b) => b.picked - a.picked || b.shown - a.shown);
    return rows;
  }, [filteredViews]);

  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSessions.forEach((s) => (s.tags ?? []).forEach((t) => (counts[t] = (counts[t] ?? 0) + 1)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredSessions]);

  const durStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSessions.forEach((s) => {
      if (s.duration) counts[s.duration] = (counts[s.duration] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredSessions]);

  const avgSeconds = useMemo(() => {
    const completedSessions = filteredSessions.filter((s) => s.ended_at);
    if (!completedSessions.length) return 0;
    const sum = completedSessions.reduce(
      (acc, s) => acc + (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()),
      0,
    );
    return Math.round(sum / completedSessions.length / 1000);
  }, [filteredSessions]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end gap-4 justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold">Kiosk Dashboard</h1>
            <p className="text-muted-foreground mt-1">Brug af Castello opskrifts-kiosken</p>
          </div>
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            className="border rounded-md px-3 py-2 bg-card"
          >
            {locations.map((l) => (
              <option key={l} value={l}>
                {l === "all" ? "Alle lokationer" : l}
              </option>
            ))}
          </select>
        </header>

        <Panel title="Denne skærms navn">
          <p className="text-sm text-muted-foreground mb-3">
            Sættes på selve tabletten ved opsætning. Gemmes lokalt og bruges som
            lokation på alle sessioner og heartbeats fra denne enhed. Skriv fx
            "Kvickly ved køl" eller "Kvickly ved indgang".
          </p>
          <div className="flex gap-2">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Fx Kvickly ved køl"
              onKeyDown={(e) => {
                if (e.key === "Enter") saveDeviceName();
              }}
            />
            <Button onClick={saveDeviceName}>Gem</Button>
          </div>
          {deviceName && (
            <p className="text-xs mt-3 text-muted-foreground">
              Nuværende: <strong className="text-foreground">{deviceName}</strong>
            </p>
          )}
        </Panel>

        {loading ? (
          <p>Indlæser…</p>
        ) : (
          <p>Indlæser…</p>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Sessioner" value={total} />
              <Stat label="Gennemført" value={`${completed} (${completionRate}%)`} />
              <Stat label="Snit varighed" value={`${avgSeconds}s`} />
              <Stat label="Visninger" value={filteredViews.length} />
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Mest valgte opskrifter</h2>
              <div className="border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Opskrift</TableHead>
                      <TableHead className="text-right">Vist</TableHead>
                      <TableHead className="text-right">Valgt</TableHead>
                      <TableHead className="text-right">Konvertering</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {popular.slice(0, 25).map((r) => (
                      <TableRow key={r.slug}>
                        <TableCell>{slugToName.get(r.slug) ?? r.slug}</TableCell>
                        <TableCell className="text-right">{r.shown}</TableCell>
                        <TableCell className="text-right">{r.picked}</TableCell>
                        <TableCell className="text-right">{r.rate}%</TableCell>
                      </TableRow>
                    ))}
                    {popular.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground text-center py-6">
                          Ingen data endnu
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-6">
              <Panel title="Hvor falder folk fra">
                <ul className="space-y-2">
                  {Object.entries(dropoff).map(([step, n]) => (
                    <li key={step} className="flex justify-between">
                      <span className="capitalize">{step}</span>
                      <span className="font-medium">{n}</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Valgte tider">
                <ul className="space-y-2">
                  {durStats.map(([d, n]) => (
                    <li key={d} className="flex justify-between">
                      <span>{d} min</span>
                      <span className="font-medium">{n}</span>
                    </li>
                  ))}
                  {!durStats.length && <li className="text-muted-foreground">Ingen data</li>}
                </ul>
              </Panel>

              <Panel title="Populære præferencer">
                <ul className="space-y-2">
                  {tagStats.map(([t, n]) => (
                    <li key={t} className="flex justify-between">
                      <span className="capitalize">{t}</span>
                      <span className="font-medium">{n}</span>
                    </li>
                  ))}
                  {!tagStats.length && <li className="text-muted-foreground">Ingen data</li>}
                </ul>
              </Panel>

              <Panel title="Seneste sessioner">
                <ul className="space-y-2 text-sm">
                  {filteredSessions.slice(0, 10).map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {new Date(s.started_at).toLocaleString("da-DK")} · {s.location ?? "unknown"}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {s.completed ? "✓" : s.abandoned_step ?? "–"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-card border rounded-lg p-4">
    <div className="text-sm text-muted-foreground">{label}</div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
  </div>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border rounded-lg p-5">
    <h3 className="font-semibold mb-3">{title}</h3>
    {children}
  </div>
);

export default Dashboard;
