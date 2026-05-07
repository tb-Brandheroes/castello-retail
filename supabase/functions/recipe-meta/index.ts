const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_PREFIX = "https://www.castellocheese.com/da/opskrifter/";

type Meta = { name: string; description: string; image: string };

const cache = new Map<string, { meta: Meta; expires: number }>();
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function pickImage(images: unknown): string {
  if (Array.isArray(images)) {
    // Prefer a larger image for kiosk display
    const big = images.find((u) => typeof u === "string" && u.includes("width=400"));
    return (big as string) || (images[0] as string) || "";
  }
  return typeof images === "string" ? images : "";
}

function extractMeta(html: string): Meta | null {
  const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = ldRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item && (item["@type"] === "Recipe" || item["@type"]?.includes?.("Recipe"))) {
          return {
            name: String(item.name || ""),
            description: String(item.description || ""),
            image: pickImage(item.image),
          };
        }
      }
    } catch {
      // ignore parse errors and continue
    }
  }
  // Fallback to OG tags
  const og = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
    return m ? m[1] : "";
  };
  const name = og("og:title");
  if (!name) return null;
  return { name, description: og("og:description"), image: og("og:image") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url") || "";
    if (!target.startsWith(ALLOWED_PREFIX)) {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cached = cache.get(target);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify(cached.meta), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 CastelloKiosk/1.0" },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Upstream ${res.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const html = await res.text();
    const meta = extractMeta(html);
    if (!meta) {
      return new Response(JSON.stringify({ error: "No metadata found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    cache.set(target, { meta, expires: Date.now() + TTL_MS });

    return new Response(JSON.stringify(meta), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
