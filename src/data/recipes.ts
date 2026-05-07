export type Duration = "10-15" | "20-25" | "30-35";
export type Tag =
  | "kød"
  | "fisk"
  | "kylling"
  | "vegetar"
  | "pasta"
  | "salat"
  | "sandwich"
  | "æg"
  | "frugt-og-grønt";

export type Recipe = {
  slug: string;
  url: string;
  duration: Duration;
  tags: Tag[];
};

const BASE = "https://www.castellocheese.com/da/opskrifter/";

// Raw mapping: duration -> tag -> slugs (parsed from Opskrifter.docx)
const raw: Record<Duration, Partial<Record<Tag, string[]>>> = {
  "10-15": {
    kød: [
      "grillet-sandwich-med-havarti",
      "aaben-sandwich-med-prosciutto-og-paere",
      "sandwich-med-brie-serrano-og-abrikos",
      "picnicsandwich-med-modnet-havarti-og-parmaskinke",
    ],
    fisk: ["wraps-med-tun-og-mature-cheddar"],
    kylling: ["grillet-sandwich-med-kylling-og-ost"],
    vegetar: [
      "tagliatelle-med-castello-creamy-blue-og-svampesauce",
      "grillet-squash-med-revet-ost",
      "chilipopcorn-med-revet-cheddar",
    ],
    pasta: ["tagliatelle-med-castello-creamy-blue-og-svampesauce"],
    salat: ["wraps-med-tun-og-mature-cheddar"],
    sandwich: [
      "grillet-sandwich-med-kylling-og-ost",
      "grillet-sandwich-med-havarti",
      "aaben-sandwich-med-prosciutto-og-paere",
      "sandwich-med-brie-serrano-og-abrikos",
      "picnicsandwich-med-modnet-havarti-og-parmaskinke",
    ],
    "frugt-og-grønt": [
      "tagliatelle-med-castello-creamy-blue-og-svampesauce",
      "aaben-sandwich-med-prosciutto-og-paere",
      "sandwich-med-brie-serrano-og-abrikos",
      "picnicsandwich-med-modnet-havarti-og-parmaskinke",
      "wraps-med-tun-og-mature-cheddar",
      "grillet-squash-med-revet-ost",
    ],
  },
  "20-25": {
    kød: [
      "one-pot-pasta",
      "broedmuffins-med-cheddar-aeg-og-bacon",
      "sommersalat-med-jalapeno-ranch-dressing",
      "pinchos-med-matured-cheddar-og-skinke",
      "hawaiipizza-med-pancetta-og-rosmarin",
      "cheddar-med-anderillette-surt-og-sodt",
    ],
    vegetar: [
      "omelet-med-ost",
      "foraarsalat-med-pocheret-aeg-cheddar-og-croutoner",
      "brombaer-og-blaabaerkaalsalat-med-aged-havarti-og-baervinaigrette",
      "havarti-quinoasalat-med-koriandervinaigrette",
      "power-bowl-med-cheddar",
      "hasselbackkartofler-med-matured-cheddar-og-salsa",
      "grov-salat-to-go-med-cheddar",
      "ostekugler-med-chili",
    ],
    pasta: ["one-pot-pasta"],
    salat: [
      "foraarsalat-med-pocheret-aeg-cheddar-og-croutoner",
      "brombaer-og-blaabaerkaalsalat-med-aged-havarti-og-baervinaigrette",
      "sommersalat-med-jalapeno-ranch-dressing",
      "havarti-quinoasalat-med-koriandervinaigrette",
      "power-bowl-med-cheddar",
      "grov-salat-to-go-med-cheddar",
    ],
    sandwich: ["pinchos-med-matured-cheddar-og-skinke"],
    æg: [
      "omelet-med-ost",
      "broedmuffins-med-cheddar-aeg-og-bacon",
      "foraarsalat-med-pocheret-aeg-cheddar-og-croutoner",
    ],
    "frugt-og-grønt": [
      "one-pot-pasta",
      "omelet-med-ost",
      "brombaer-og-blaabaerkaalsalat-med-aged-havarti-og-baervinaigrette",
      "sommersalat-med-jalapeno-ranch-dressing",
      "havarti-quinoasalat-med-koriandervinaigrette",
      "power-bowl-med-cheddar",
      "hawaiipizza-med-pancetta-og-rosmarin",
      "hasselbackkartofler-med-matured-cheddar-og-salsa",
      "grov-salat-to-go-med-cheddar",
    ],
  },
  "30-35": {
    kød: [
      "one-pot-pastaret-med-squash-og-krydret-polse",
      "spaghetti-med-persillepesto-og-kodboller-i-parmasvob",
      "burger-med-svinekod-cheddar-og-bacon",
      "philly-cheese-burger",
      "dobbelt-cheese-steak-burger",
      "ostesnurrer-med-parmaskinke",
      "cheddar-og-steakburger-med-karamelliserede-log-og-portobellosvampe",
    ],
    fisk: ["rejepasta-med-citron--og-cheddarsauce"],
    kylling: [
      "kyllingesalat-og-hvidlogsbrod-med-ost",
      "aggemuffins-med-matured-cheddar",
      "pizza-med-kylling-og-pesto",
    ],
    vegetar: [
      "nem-mac-and-cheese-med-cremet-havarti",
      "hvid-pizza-med-blaskimmelost",
      "pinsa-med-mascarpone-tomater-brie-og-oliven",
      "paskebrod-med-cheddar-og-oregano",
    ],
    pasta: [
      "nem-mac-and-cheese-med-cremet-havarti",
      "one-pot-pastaret-med-squash-og-krydret-polse",
      "spaghetti-med-persillepesto-og-kodboller-i-parmasvob",
    ],
    salat: ["kyllingesalat-og-hvidlogsbrod-med-ost"],
    æg: [
      "rejepasta-med-citron--og-cheddarsauce",
      "paskebrod-med-cheddar-og-oregano",
      "aggemuffins-med-matured-cheddar",
    ],
    "frugt-og-grønt": [
      "one-pot-pastaret-med-squash-og-krydret-polse",
      "spaghetti-med-persillepesto-og-kodboller-i-parmasvob",
      "hvid-pizza-med-blaskimmelost",
      "pinsa-med-mascarpone-tomater-brie-og-oliven",
      "rejepasta-med-citron--og-cheddarsauce",
      "kyllingesalat-og-hvidlogsbrod-med-ost",
      "burger-med-svinekod-cheddar-og-bacon",
      "philly-cheese-burger",
      "dobbelt-cheese-steak-burger",
      "aggemuffins-med-matured-cheddar",
      "pizza-med-kylling-og-pesto",
      "cheddar-og-steakburger-med-karamelliserede-log-og-portobellosvampe",
    ],
  },
};

// Build deduplicated recipe list, merging tags per (slug, duration)
const map = new Map<string, Recipe>();
for (const [duration, byTag] of Object.entries(raw) as [Duration, Partial<Record<Tag, string[]>>][]) {
  for (const [tag, slugs] of Object.entries(byTag) as [Tag, string[]][]) {
    for (const slug of slugs) {
      const key = `${duration}::${slug}`;
      const existing = map.get(key);
      if (existing) {
        if (!existing.tags.includes(tag)) existing.tags.push(tag);
      } else {
        map.set(key, { slug, url: `${BASE}${slug}/`, duration, tags: [tag] });
      }
    }
  }
}

export const RECIPES: Recipe[] = Array.from(map.values());

export const ALL_TAGS: Tag[] = [
  "kød",
  "fisk",
  "kylling",
  "vegetar",
  "pasta",
  "salat",
  "sandwich",
  "æg",
  "frugt-og-grønt",
];

export const TAG_LABELS: Record<Tag, string> = {
  kød: "Kød",
  fisk: "Fisk",
  kylling: "Kylling",
  vegetar: "Vegetar",
  pasta: "Pasta",
  salat: "Salat",
  sandwich: "Sandwich",
  æg: "Æg",
  "frugt-og-grønt": "Frugt og grønt",
};

export const DURATION_LABELS: Record<Duration, string> = {
  "10-15": "10–15 min.",
  "20-25": "20–25 min.",
  "30-35": "30–35 min.",
};

/** Pick up to 3 recipes that match the duration and at least one selected tag. */
export function pickRecipes(duration: Duration, selectedTags: Tag[], count = 3): Recipe[] {
  const pool = RECIPES.filter(
    (r) => r.duration === duration && r.tags.some((t) => selectedTags.includes(t))
  );
  // Score by number of matching tags, then shuffle within score buckets
  const scored = pool.map((r) => ({
    r,
    score: r.tags.filter((t) => selectedTags.includes(t)).length,
    rand: Math.random(),
  }));
  scored.sort((a, b) => b.score - a.score || a.rand - b.rand);
  return scored.slice(0, count).map((s) => s.r);
}
