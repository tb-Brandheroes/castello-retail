import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECIPES } from "@/data/recipes";
import { getRecipeMeta } from "@/hooks/useRecipeMeta";

/**
 * Lokal fallback-visning af en opskrift — bruges når kunden ikke kan scanne QR,
 * eller hvis castellocheese.com er nede. Data kommer fra bundlet JSON.
 */
const RecipeDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const recipe = useMemo(
    () => RECIPES.find((r) => r.slug === slug) ?? null,
    [slug],
  );
  const meta = recipe ? getRecipeMeta(recipe.url) : null;

  if (!recipe || !meta?.name) {
    return (
      <div className="min-h-screen bg-castello-cream flex flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="font-serif text-3xl text-castello-plum-deep">
          Opskrift ikke fundet
        </h1>
        <Button
          onClick={() => navigate("/")}
          className="rounded-none bg-castello-plum hover:bg-castello-plum-deep text-castello-cream border-2 border-castello-gold font-serif uppercase tracking-[0.2em]"
        >
          Til forsiden
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-castello-cream">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-castello-plum-deep/80 hover:text-castello-plum-deep text-base font-serif tracking-wide uppercase mb-6"
        >
          <ArrowLeft className="h-5 w-5" /> Tilbage
        </button>

        {meta.image && (
          <div className="aspect-[4/3] w-full overflow-hidden rounded-none border-2 border-castello-gold/60 mb-6">
            <img
              src={meta.image}
              alt={meta.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h1 className="font-serif text-3xl md:text-5xl font-semibold text-castello-plum-deep leading-tight mb-4">
          {meta.name}
        </h1>

        {meta.description && (
          <p className="text-foreground/80 text-base md:text-lg leading-relaxed mb-8">
            {meta.description}
          </p>
        )}

        <div className="border-t border-castello-gold/40 pt-6 mt-6 text-sm text-foreground/60">
          Den fulde opskrift med ingredienser og fremgangsmåde finder du på{" "}
          <span className="font-medium">castellocheese.com</span> via QR-koden.
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
