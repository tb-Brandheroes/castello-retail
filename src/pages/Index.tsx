import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import { X, ArrowLeft } from "lucide-react";
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
import { useWakeLock } from "@/hooks/useWakeLock";
import { StatusBadge } from "@/components/StatusBadge";
import {
  startSession,
  updateSession,
  logShownRecipes,
  logPicked,
  endSessionAbandoned,
  clearSession,
  hasSession,
} from "@/lib/analytics";

type Step = "start" | "duration" | "tags" | "results" | "detail";

const IDLE_MS = 60_000;
const DETAIL_AUTOCLOSE_MS = 30_000;

const Index = () => {
  const [step, setStep] = useState<Step>("start");
  const [duration, setDuration] = useState<Duration | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [results, setResults] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);

  useWakeLock();




  const reset = () => {
    if (hasSession() && step !== "detail") {
      endSessionAbandoned(step);
    }
    clearSession();
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

  const handleStart = () => {
    startSession();
    setStep("duration");
  };

  const handleDuration = (d: Duration) => {
    setDuration(d);
    updateSession({ duration: d, abandoned_step: "duration" });
    setStep("tags");
  };

  const goResults = (chosenTags: Tag[]) => {
    if (!duration || chosenTags.length === 0) return;
    const picked = pickRecipes(duration, chosenTags, 4);
    setTags(chosenTags);
    setResults(picked);
    updateSession({ tags: chosenTags, abandoned_step: "results" });
    logShownRecipes(picked.map((r) => r.slug));
    setStep("results");
  };

  const handlePick = (r: Recipe) => {
    setSelected(r);
    logPicked(r.slug);
    setStep("detail");
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-primary">
      <StatusBadge />
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/lovable-uploads/8a2e8d91-e3ae-4a6f-aae6-44487632432c.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transform: "scale(1.6)",
          transformOrigin: "center",
        }}
      />
      <main className="flex-1 container mx-auto px-10 pt-16 pb-10 max-w-[1800px] relative z-10 flex flex-col">
        {step === "start" && <StartScreen onStart={handleStart} />}

        {step === "duration" && (
          <DurationScreen value={duration} onSelect={handleDuration} onBack={reset} />
        )}

        {step === "tags" && (
          <TagsScreen onSelect={goResults} onBack={() => setStep("duration")} />
        )}

        {step === "results" && (
          <ResultsScreen
            recipes={results}
            onPick={handlePick}
            onBack={() => setStep("tags")}
            onRestart={reset}
          />
        )}

        {step === "detail" && selected && (
          <DetailOverlay recipe={selected} onClose={() => setStep("results")} />
        )}

        <footer className="text-center mt-auto pt-8">
          <img
            src="/lovable-uploads/6ed48fd3-10f2-4811-bcdd-035cfbf810b8.png"
            alt="House of Castello"
            className="h-40 md:h-44 mx-auto opacity-95"
            style={{
              filter:
                "drop-shadow(0 2px 4px rgba(74, 30, 45, 0.35)) drop-shadow(0 1px 2px rgba(74, 30, 45, 0.25))",
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
    <div className="text-castello-plum-deep/70 text-xs tracking-[0.4em] font-sans">SINCE 1893</div>
    <h1 className="font-serif text-5xl md:text-7xl font-semibold text-castello-plum-deep uppercase tracking-wide max-w-3xl leading-tight">
      Klik dig frem til dit næste måltid
    </h1>
    <div className="h-px w-24 bg-castello-gold" />
    <p className="text-castello-plum-deep/80 text-xl max-w-xl font-sans">
      Vælg tid og præferencer - og lad Castello inspirere dig til aftensmaden.
    </p>
    <Button
      onClick={onStart}
      className="h-20 px-16 text-xl uppercase tracking-[0.3em] rounded-none bg-castello-plum hover:bg-castello-plum-deep text-castello-cream border-2 border-castello-gold font-serif"
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
  <div className="flex-1 flex flex-col items-center justify-center gap-10">
    <BackBar onBack={onBack} />
    <div className="flex flex-col items-center gap-4">
      <h2 className="font-serif text-4xl md:text-6xl font-semibold text-castello-plum-deep text-center uppercase tracking-wide">
        Hvor lang tid har du?
      </h2>
      <div className="h-px w-20 bg-castello-gold" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
      {(Object.keys(DURATION_LABELS) as Duration[]).map((d) => (
        <button
          key={d}
          onClick={() => onSelect(d)}
          className={cn(
            "h-40 rounded-none border-2 transition-all text-center font-serif",
            "bg-castello-plum hover:bg-castello-plum-deep text-castello-cream",
            "hover:shadow-[0_0_24px_hsl(var(--castello-gold)/0.5)]",
            value === d ? "border-castello-gold" : "border-castello-gold/60"
          )}
        >
          <div className="text-3xl font-semibold tracking-wide">{DURATION_LABELS[d]}</div>
        </button>
      ))}
    </div>
  </div>
);

const TagsScreen = ({
  onSelect,
  onBack,
}: {
  onSelect: (tags: Tag[]) => void;
  onBack: () => void;
}) => {
  const choices: { key: string; label: string; tags: Tag[] }[] = [
    { key: "kød", label: "Kød", tags: ["kød"] },
    { key: "vegetar", label: "Vegetar", tags: ["vegetar"] },
    { key: "surprise", label: "Surprise me", tags: [...ALL_TAGS] },
  ];
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10">
      <BackBar onBack={onBack} />
      <div className="flex flex-col items-center gap-4">
        <h2 className="font-serif text-4xl md:text-5xl font-semibold text-castello-plum-deep uppercase tracking-wide text-center">
          Måltidet må indeholde
        </h2>
        <div className="h-px w-20 bg-castello-gold" />
      </div>
      <div className="grid grid-cols-2 gap-6 w-full max-w-3xl">
        {choices.map((c) => (
          <button
            key={c.key}
            onClick={() => onSelect(c.tags)}
            className={cn(
              "h-32 rounded-none border-2 border-castello-gold/60 transition-all text-2xl font-serif font-semibold bg-castello-plum text-castello-cream hover:bg-castello-plum-deep hover:border-castello-gold hover:shadow-[0_0_24px_hsl(var(--castello-gold)/0.5)] tracking-wide",
              c.key === "surprise" && "col-span-2"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
};

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
    <div className="flex flex-col items-center gap-4">
      <h2 className="font-serif text-4xl md:text-5xl font-semibold text-castello-plum-deep uppercase tracking-wide text-center">
        Vælg din favorit
      </h2>
      <div className="h-px w-20 bg-castello-gold" />
    </div>
    {recipes.length === 0 ? (
      <div className="text-center text-castello-plum-deep space-y-4">
        <p className="text-xl font-serif">Ingen opskrifter matcher dine valg.</p>
        <Button onClick={onRestart} className="rounded-none bg-castello-plum hover:bg-castello-plum-deep text-castello-cream border-2 border-castello-gold font-serif uppercase tracking-[0.2em]">
          Prøv igen
        </Button>
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-6 w-full max-w-3xl">
        {recipes.map((r) => (
          <RecipeCard key={r.slug} recipe={r} onPick={() => onPick(r)} />
        ))}
      </div>
    )}
  </div>
);

const RecipeCard = ({ recipe, onPick }: { recipe: Recipe; onPick: () => void }) => {
  const { data } = useRecipeMeta(recipe.url);
  return (
    <button
      onClick={onPick}
      className="group w-full bg-castello-cream rounded-none overflow-hidden border-2 border-castello-gold/60 hover:border-castello-gold hover:shadow-[0_0_24px_hsl(var(--castello-gold)/0.5)] transition-all text-left flex flex-col"
    >
      <div className="aspect-[4/3] bg-castello-plum/10 overflow-hidden flex items-center justify-center">
        {data?.image ? (
          <img
            src={data.image}
            alt={data.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-castello-plum/60 text-sm">Billede ikke tilgængeligt</div>
        )}
      </div>
      <div className="w-full p-3 md:p-4 min-h-[4rem] flex items-center justify-center bg-castello-plum">
        <h3 className="font-serif text-base md:text-lg lg:text-xl font-semibold text-castello-cream leading-snug line-clamp-3 text-center w-full">
          {data?.name ?? recipe.slug}
        </h3>
      </div>
    </button>
  );
};


const DetailOverlay = ({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) => {
  const { data } = useRecipeMeta(recipe.url);
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300 overflow-y-auto">
      <button
        onClick={onClose}
        aria-label="Luk"
        className="fixed top-4 right-4 md:top-6 md:right-6 h-14 w-14 rounded-full bg-white/90 hover:bg-white text-foreground flex items-center justify-center shadow-lg z-10"
      >
        <X className="h-7 w-7" />
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-w-6xl w-full max-h-[95vh] bg-card rounded-3xl overflow-y-auto shadow-2xl my-auto">
        <div className="lg:aspect-auto bg-muted overflow-hidden h-[35vh] lg:h-auto">
          {data?.image && (
            <img src={data.image} alt={data.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-6 md:p-8 lg:p-10 flex flex-col gap-5">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-castello-plum-deep leading-tight">
            {data?.name ?? "Indlæser…"}
          </h2>
          {data?.description && (
            <p className="text-foreground/80 text-base md:text-lg leading-relaxed line-clamp-5">
              {data.description}
            </p>
          )}
          <div className="mt-auto flex flex-col gap-3 pt-4">
            <div className="flex items-center gap-5">
              <div className="bg-white p-3 rounded-xl shadow shrink-0">
                <QRCodeSVG value={recipe.url} size={140} level="M" includeMargin={false} />
              </div>
              <div className="text-foreground min-w-0">
                <p className="text-base md:text-lg font-semibold mb-1">Scan for opskriften</p>
                <p className="text-sm text-muted-foreground">
                  Find hele opskriften på castellocheese.com
                </p>
              </div>
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
      className="flex items-center gap-2 text-castello-plum-deep/80 hover:text-castello-plum-deep text-base font-serif tracking-wide uppercase"
    >
      <ArrowLeft className="h-5 w-5" /> Tilbage
    </button>
  </div>
);

export default Index;
