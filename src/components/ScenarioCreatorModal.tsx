import React, { useState } from "react";
import { Sparkles, X, Loader2, Lightbulb } from "lucide-react";
import { Scenario } from "../types";
import { soundFX } from "../utils/audio";

interface ScenarioCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioCreated: (scenario: Scenario) => void;
}

export const ScenarioCreatorModal: React.FC<ScenarioCreatorModalProps> = ({
  isOpen,
  onClose,
  onScenarioCreated,
}) => {
  const [topicPrompt, setTopicPrompt] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen) return null;

  const quickIdeas = [
    { title: "حجز طاولة في مطعم إيطالي", en: "Booking a table at an Italian restaurant" },
    { title: "شراء تذكرة قطار في المحطة", en: "Buying a train ticket at the station" },
    { title: "استئجار سيارة في المطار", en: "Renting a car at the airport" },
    { title: "طلب مساعدة في السوبرماركت", en: "Asking for help finding items in a supermarket" },
    { title: "فتح حساب بنكي جديد", en: "Opening a new bank account" },
  ];

  const handleGenerate = async () => {
    if (!topicPrompt.trim() || isLoading) return;
    setIsLoading(true);
    setErrorMsg("");
    soundFX.playClick();

    try {
      const res = await fetch("/api/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicPrompt: topicPrompt.trim(),
          difficulty,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate custom scenario");
      }

      const data = await res.json();

      // Ensure appropriate image
      const fallbackImages: Record<string, string> = {
        restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
        airport: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
        hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
        default: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
      };

      const customScenario: Scenario = {
        id: `custom-${Date.now()}`,
        titleEn: data.titleEn || topicPrompt,
        titleAr: data.titleAr || "محادثة مخصصة",
        category: (data.category as any) || "daily",
        difficulty: difficulty,
        imageUrl: fallbackImages.default,
        iconName: data.icon || "Sparkles",
        sceneDescriptionAr: data.sceneDescriptionAr || "محادثة واقعية بالذكاء الاصطناعي.",
        sceneDescriptionEn: data.sceneDescriptionEn || topicPrompt,
        characters: data.characters || [
          { name: "Speaker A", roleAr: "المتحدث الأول", avatar: "" },
          { name: "You", roleAr: "أنت", avatar: "" },
        ],
        dialogue: data.dialogue || [],
        vocabulary: data.vocabulary || [],
        speakingTipAr: data.speakingTipAr || "تدرب على نطق العبارات كاملة بطلاقة وثقة.",
        isCustom: true,
      };

      soundFX.playSuccess();
      onScenarioCreated(customScenario);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg("حدث خطأ أثناء توليد السيناريو، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
            <Sparkles className="w-4 h-4" />
            <span>الذكاء الاصطناعي التوليدي</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            توليد سيناريو محادثة واقعية مخصصة
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            صف أي موقف ترغب في التدرب عليه وسيقوم الذكاء الاصطناعي بكتابة المحادثة مع النطق الصوتي العربي والمفردات فوراً!
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              ما هو الموقف أو المكان الذي تريد التدرب عليه؟
            </label>
            <input
              type="text"
              value={topicPrompt}
              onChange={(e) => setTopicPrompt(e.target.value)}
              placeholder="مثال: شراء دواء من الصيدلية في لندن، أو استئجار شقة..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Ideas */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>أفكار جاهزة سريعة:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickIdeas.map((idea, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTopicPrompt(idea.title)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  {idea.title}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">مستوى الصعوبة</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "beginner", label: "مبتدئ (A1-A2)" },
                { id: "intermediate", label: "متوسط (B1-B2)" },
                { id: "advanced", label: "متقدم (C1)" },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setDifficulty(lvl.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    difficulty === lvl.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleGenerate}
            disabled={!topicPrompt.trim() || isLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جارِ بناء سيناريو المحادثة والنطق...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>إنشاء السيناريو الآن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
