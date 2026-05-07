import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, ChefHat } from "lucide-react";
const Index = () => {
  const [name, setName] = useState("");
  const [moment, setMoment] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const webhookUrl = "https://hook.eu2.make.com/lctnekjrtmp58mq6c136tssqqlvsxzss";
  const {
    toast
  } = useToast();
  const momentBubbles = ["Gathering with family", "Walking slowly through autumn", "Running around with the kids", "Picnic in the park", "A quiet evening", "A gentle hug"];
  const handleBubbleClick = (bubbleText: string) => {
    setMoment(bubbleText);
  };
  const handleGenerateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !moment.trim()) {
      toast({
        title: "Please complete all fields",
        description: "Please write your name and tell us what makes you be in the moment to generate your personalized recipe.",
        variant: "destructive"
      });
      return;
    }
    setIsGenerating(true);
    try {
      // Send to Make.com webhook
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        mode: "no-cors",
        body: JSON.stringify({
          name: name,
          moment: moment,
          timestamp: new Date().toISOString(),
          brand: "Castello",
          concept: "Being in the Moment",
          deviceInfo: {
            screenResolution: `${screen.width}x${screen.height}`,
            deviceId: navigator.userAgent.includes('iPad') ? `iPad-${screen.width}x${screen.height}` : `Device-${screen.width}x${screen.height}`
          }
        })
      });
      toast({
        title: "Recipe Generated Successfully!",
        description: "Your personalized 'Being in the Moment' recipe has been sent to the chef's printer."
      });
      setName("");
      setMoment("");
    } catch (error) {
      console.error("Error sending recipe:", error);
      toast({
        title: "Error",
        description: "Failed to send the recipe. Please check your webhook URL and try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  return <div className="min-h-screen relative overflow-hidden" style={{
    backgroundImage: "url('/lovable-uploads/8a2e8d91-e3ae-4a6f-aae6-44487632432c.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat"
  }}>
      {/* Decorative Bubbles */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {momentBubbles.map((bubble, index) => <button key={index} onClick={() => handleBubbleClick(bubble)} className={`
              absolute pointer-events-auto rounded-full flex items-center justify-center
              text-xs font-medium text-foreground/80 leading-tight text-center
              transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer
              backdrop-blur-md border border-white/60 hover:border-white/80
              ${index === 0 ? 'top-1/2 left-8 md:left-16 w-32 h-32 float-1' : ''}
              ${index === 1 ? 'top-1/2 mt-8 right-8 md:right-20 w-28 h-28 float-2' : ''}
              ${index === 2 ? 'top-1/2 mt-32 left-4 md:left-12 w-24 h-24 float-3' : ''}
              ${index === 3 ? 'top-1/2 mt-40 right-4 md:right-16 w-32 h-32 float-4' : ''}
              ${index === 4 ? 'top-1/2 mt-72 left-12 md:left-24 w-36 h-36 float-5' : ''}
              ${index === 5 ? 'top-1/2 mt-80 right-4 md:right-12 w-28 h-28 float-6' : ''}
            `} style={{
        background: "var(--bubble-gradient)",
        boxShadow: "var(--bubble-shadow), var(--bubble-inner-light)"
      }}>
            <span className="px-2">{bubble}</span>
          </button>)}
      </div>

      {/* Header */}
      <header className="pt-8 pb-4 relative z-10">
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-16 pb-8 max-w-2xl relative z-10">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img src="/lovable-uploads/207b9934-3049-4357-80da-2102e5d538aa.png" alt="Plate" className="h-32 md:h-40 opacity-90 drop-shadow-lg" />
          </div>
          <p className="text-white/90 leading-relaxed max-w-md mx-auto text-xl">TELL US ABOUT YOUR FAVORITE MOMENT AND WE WILL CREATE A UNIQUE TASTING PLATE JUST FOR YOU</p>
        </div>

        <form onSubmit={handleGenerateRecipe} className="space-y-8 max-w-md mx-auto">
          {/* Name Field */}
          <div className="space-y-4">
            <Input 
              id="name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="WRITE YOUR NAME" 
              className="h-14 text-lg bg-white/60 border-none focus:border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/70 rounded-none" 
              disabled={isGenerating} 
            />
          </div>

          {/* Moment Question */}
          <div className="space-y-4">
            <Label htmlFor="moment" className="text-base font-medium text-white/90 uppercase tracking-wider"></Label>
            <Textarea id="moment" value={moment} onChange={e => setMoment(e.target.value)} placeholder="I FEEL PRESENT IN THE MOMENT WHEN" className="min-h-36 text-lg leading-relaxed resize-none bg-white/60 border-none focus:border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/70 rounded-none placeholder:text-lg" disabled={isGenerating} />
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button type="submit" disabled={isGenerating || !name.trim() || !moment.trim()} className="w-[28rem] h-16 font-semibold bg-primary hover:bg-primary/90 text-white transition-all duration-300 disabled:opacity-50 uppercase tracking-wider text-base rounded-none">
            {isGenerating ? <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Creating Your Moment On A Plate...
              </> : "Create My Moment On A Plate"}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 pt-8">
          <img src="/lovable-uploads/6ed48fd3-10f2-4811-bcdd-035cfbf810b8.png" alt="House of Castello" className="h-40 mx-auto opacity-80" style={{
            filter: 'drop-shadow(0 8px 20px rgba(157, 106, 117, 0.6)) drop-shadow(0 4px 12px rgba(157, 106, 117, 0.4))'
          }} />
        </div>
      </main>
    </div>;
};
export default Index;