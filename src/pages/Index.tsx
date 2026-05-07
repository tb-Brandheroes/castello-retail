import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ALL_TAGS,
  DURATION_LABELS,
  TAG_LABELS,
  pickRecipes,
  type Duration,
  type Recipe,
  type Tag,
} from "@/data/recipes";
import { useRecipeMeta } from "@/hooks/useRecipeMeta";
import { useIdleReset } from "@/hooks/useIdleReset";

type Step = "start" | "duration" | "tags" | "results" | "detail";

const IDLE_MS = 60_000;
const DETAIL_AUTOCLOSE_MS = 30_000;

const Index = () => {
  const [step, setStep] = useState<Step>("start");
  const [duration, setDuration] = useState<Duration | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [results, setResults] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);

  const reset = () => {
    setStep("start");
    setDuration(null);
    setTags([]);
    setResults([]);
    setSelected(null);
  };

  // Idle reset (1 min); pause on the start screen since it's already idle
  useIdleReset(step === "start" ? null : IDLE_MS, reset);

  // Auto-close detail after 30s
  useEffect(() => {
    if (step !== "detail") return;
    const t = window.setTimeout(reset, DETAIL_AUTOCLOSE_MS);
    return () => window.clearTimeout(t);
  }, [step]);

  const goResults = () => {
    if (!duration || tags.length < 3) return;
    setResults(pickRecipes(duration, tags, 3));
    setStep("results");
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{
        backgroundImage: "url('/lovable-uploads/8a2e8d91-e3ae-4a6f-aae6-44487632432c.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <main className="flex-1 container mx-auto px-6 pt-12 pb-8 max-w-5xl relative z-10 flex flex-col">
        {step === "start" && <StartScreen onStart={() => setStep("duration")} />}

        {step === "duration" && (
          <DurationScreen
            value={duration}
            onSelect={(d) => {
              setDuration(d);
              setStep("tags");
            }}
            onBack={reset}
          />
        )}

        {step === "tags" && (
          <TagsScreen
            selected={tags}
            onToggle={(t) =>
              setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
            }
            onContinue={goResults}
            onBack={() => setStep("duration")}
          />
        )}

        {step === "results" && (
          <ResultsScreen
            recipes={results}
            onPick={(r) => {
              setSelected(r);
              setStep("detail");
            }}
            onBack={() => setStep("tags")}
            onRestart={reset}
          />
        )}

        {step === "detail" && selected && (
          <DetailOverlay recipe={selected} onClose={reset} />
        )}

        <footer className="text-center mt-auto pt-8">
          <img
            src="/lovable-uploads/6ed48fd3-10f2-4811-bcdd-035cfbf810b8.png"
            alt="House of Castello"
            className="h-28 mx-auto opacity-90"
            style={{
              filter:
                "drop-shadow(0 8px 20px rgba(157, 106, 117, 0.6)) drop-shadow(0 4px 12px rgba(157, 106, 117, 0.4))",
            }}
          />
        </footer>
      </main>
    </div>
  );
};

/* ---------------- screens ---------------- */

const StartScreen = ({ onStart }: { onStart: () => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center gap-10">
    <h1 className="text-4xl md:text-6xl font-semibold text-white drop-shadow-lg uppercase tracking-wide max-w-3xl">
      Klik dig frem til dit næste måltid
    </h1>
    <p className="text-white/90 text-xl max-w-xl">
      Vælg tid og præferencer — og lad Castello inspirere dig til aftensmaden.
    </p>
    <Button
      onClick={onStart}
      className="h-20 px-16 text-xl uppercase tracking-wider rounded-none bg-primary hover:bg-primary/90 text-white"
    >
      Start
    </Button>
  </div>
);

const DurationScreen = ({
  value,
  onSelect,
  onBack,
}: {
  value: Duration | null;
  onSelect: (d: Duration) => void;
  onBack: () => void;
}) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-12">
    <BackBar onBack={onBack} />
    <h2 className="text-3xl md:text-5xl font-semibold text-white text-center uppercase tracking-wide drop-shadow">
      Hvor lang tid har du?
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
      {(Object.keys(DURATION_LABELS) as Duration[]).map((d) => (
        <button
          key={d}
          onClick={() => onSelect(d)}
          className={cn(
            "h-40 rounded-2xl backdrop-blur-md border-2 transition-all text-center",
            "bg-white/60 hover:bg-white/80 hover:scale-[1.02]",
            value === d ? "border-primary" : "border-white/60"
          )}
        >
          <div className="text-3xl font-semibold text-foreground">{DURATION_LABELS[d]}</div>
        </button>
      ))}
    </div>
  </div>
);

const TagsScreen = ({
  selected,
  onToggle,
  onContinue,
  onBack,
}: {
  selected: Tag[];
  onToggle: (t: Tag) => void;
  onContinue: () => void;
  onBack: () => void;
}) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-8">
    <BackBar onBack={onBack} />
    <div className="text-center">
      <h2 className="text-3xl md:text-4xl font-semibold text-white uppercase tracking-wide drop-shadow">
        Måltidet må indeholde
      </h2>
      <p className="text-white/90 mt-3 text-lg">Vælg minimum 3 ({selected.length} valgt)</p>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl">
      {ALL_TAGS.map((t) => {
        const active = selected.includes(t);
        return (
          <button
            key={t}
            onClick={() => onToggle(t)}
            className={cn(
              "h-20 rounded-xl backdrop-blur-md border-2 transition-all text-lg font-medium",
              active
                ? "bg-primary text-white border-primary scale-[1.02]"
                : "bg-white/60 text-foreground border-white/60 hover:bg-white/80"
            )}
          >
            {TAG_LABELS[t]}
          </button>
        );
      })}
    </div>
    <Button
      onClick={onContinue}
      disabled={selected.length < 3}
      className="h-16 px-12 text-lg uppercase tracking-wider rounded-none bg-primary hover:bg-primary/90 text-white disabled:opacity-40"
    >
      Vis opskrifter
    </Button>
  </div>
);

const ResultsScreen = ({
  recipes,
  onPick,
  onBack,
  onRestart,
}: {
  recipes: Recipe[];
  onPick: (r: Recipe) => void;
  onBack: () => void;
  onRestart: () => void;
}) => (
  <div className="flex-1 flex flex-col items-center gap-8 pt-4">
    <BackBar onBack={onBack} />
    <h2 className="text-3xl md:text-4xl font-semibold text-white uppercase tracking-wide text-center drop-shadow">
      Vælg din favorit
    </h2>
    {recipes.length === 0 ? (
      <div className="text-center text-white space-y-4">
        <p className="text-xl">Ingen opskrifter matcher dine valg.</p>
        <Button onClick={onRestart} className="rounded-none">
          Prøv igen
        </Button>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {recipes.map((r) => (
          <RecipeCard key={r.slug} recipe={r} onPick={() => onPick(r)} />
        ))}
      </div>
    )}
  </div>
);

const RecipeCard = ({ recipe, onPick }: { recipe: Recipe; onPick: () => void }) => {
  const { data, isLoading } = useRecipeMeta(recipe.url);
  return (
    <button
      onClick={onPick}
      className="group bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden border-2 border-white/60 hover:border-primary transition-all hover:scale-[1.02] text-left flex flex-col"
    >
      <div className="aspect-[4/3] bg-muted overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : data?.image ? (
          <img
            src={data.image}
            alt={data.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-muted-foreground text-sm">Billede ikke tilgængeligt</div>
        )}
      </div>
      <div className="p-4 min-h-[5rem] flex items-center">
        <h3 className="text-lg font-semibold text-foreground leading-snug">
          {data?.name ?? "Indlæser…"}
        </h3>
      </div>
    </button>
  );
};

const DetailOverlay = ({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) => {
  const { data, isLoading } = useRecipeMeta(recipe.url);
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
      <button
        onClick={onClose}
        aria-label="Luk"
        className="absolute top-6 right-6 h-14 w-14 rounded-full bg-white/90 hover:bg-white text-foreground flex items-center justify-center shadow-lg"
      >
        <X className="h-7 w-7" />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl w-full bg-card rounded-3xl overflow-hidden shadow-2xl">
        <div className="aspect-square md:aspect-auto bg-muted overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : (
            data?.image && (
              <img src={data.image} alt={data.name} className="w-full h-full object-cover" />
            )
          )}
        </div>
        <div className="p-8 md:p-10 flex flex-col gap-6">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
            {data?.name ?? "Indlæser…"}
          </h2>
          {data?.description && (
            <p className="text-foreground/80 text-lg leading-relaxed line-clamp-6">
              {data.description}
            </p>
          )}
          <div className="mt-auto flex items-center gap-6 pt-4">
            <div className="bg-white p-3 rounded-xl shadow">
              <QRCodeSVG value={recipe.url} size={160} level="M" includeMargin={false} />
            </div>
            <div className="text-foreground">
              <p className="text-lg font-semibold mb-1">Scan for opskriften</p>
              <p className="text-sm text-muted-foreground">
                Find hele opskriften på castellocheese.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BackBar = ({ onBack }: { onBack: () => void }) => (
  <div className="self-start">
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-white/90 hover:text-white text-base"
    >
      <ArrowLeft className="h-5 w-5" /> Tilbage
    </button>
  </div>
);

export default Index;
