import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const TABLES = {
  sessions: { order: "started_at", cols: "*" },
  recipe_views: { order: "created_at", cols: "*" },
  device_heartbeats: { order: "created_at", cols: "*" },
} as const;

type TableName = keyof typeof TABLES;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const adminCode = Deno.env.get("DASHBOARD_ADMIN_CODE") ?? "";
  if (!adminCode) return json({ error: "Server not configured" }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (!code || !safeEqual(code, adminCode)) {
    return json({ error: "Ugyldig kode" }, 401);
  }

  const table = String(body.table ?? "") as TableName;
  if (!(table in TABLES)) return json({ error: "Unknown table" }, 400);

  const cfg = TABLES[table];
  const limit =
    typeof body.limit === "number" && body.limit > 0 && body.limit <= 1000
      ? Math.floor(body.limit)
      : null;
  const from = typeof body.from === "string" ? body.from : null;
  const to = typeof body.to === "string" ? body.to : null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const applyFilters = (q: any) => {
    let out = q;
    if (from) out = out.gte(cfg.order, from);
    if (to) out = out.lte(cfg.order, to);
    return out;
  };

  try {
    // Single page mode (live activity)
    if (limit) {
      const { data, error } = await applyFilters(
        supabase.from(table).select(cfg.cols).order(cfg.order, { ascending: false }),
      ).limit(limit);
      if (error) throw error;
      return json({ rows: data ?? [] });
    }

    // Full pagination mode (dashboard)
    const pageSize = 1000;
    const rows: unknown[] = [];
    for (let offset = 0; offset < 100_000; offset += pageSize) {
      const { data, error } = await applyFilters(
        supabase.from(table).select(cfg.cols).order(cfg.order, { ascending: false }),
      ).range(offset, offset + pageSize - 1);
      if (error) throw error;
      const page = data ?? [];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    return json({ rows });
  } catch (e) {
    console.error("analytics-read failed", e);
    return json({ error: "Kunne ikke hente data" }, 500);
  }
});
