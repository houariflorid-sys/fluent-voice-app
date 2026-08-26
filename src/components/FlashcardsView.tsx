import React, { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Volume2,
  Volume1,
  CheckCircle2,
  Sparkles,
  Gamepad2,
  RotateCw,
  Search,
  Filter,
  Check,
  X,
  Award,
  Loader2,
  BookOpen,
  PlusCircle,
  Brain,
  Info,
} from "lucide-react";
import { FlashcardItem } from "../types";
import { playEnglishAudio, soundFX } from "../utils/audio";
import { createClientFallbackFlashcard, CATEGORY_IMAGES } from "../utils/cardGenerator";

interface FlashcardsViewProps {
  flashcards: FlashcardItem[];
  masteredWords: string[];
  onToggleMastered: (wordId: string) => void;
  onAddFlashcard?: (card: FlashcardItem) => void;
  onAddXp: (amount: number) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  flashcards,
  masteredWords,
  onToggleMastered,
  onAddFlashcard,
  onAddXp,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchingAi, setIsSearchingAi] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Synchronized cards list for instant local rendering
  const [cardsList, setCardsList] = useState<FlashcardItem[]>(flashcards);

  useEffect(() => {
    setCardsList((prev) => {
      const map = new Map<string, FlashcardItem>();
      flashcards.forEach((c) => map.set(c.word.toLowerCase(), c));
      prev.forEach((c) => map.set(c.word.toLowerCase(), c));
      return Array.from(map.values());
    });
  }, [flashcards]);

  // Quiz Mode state
  const [quizMode, setQuizMode] = useState<boolean>(false);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered Cards
  const filteredCards = cardsList.filter((card) => {
    if (selectedCategory === "mastered") {
      if (!masteredWords.includes(card.id)) return false;
    } else if (selectedCategory === "ai_generated") {
      if (!card.isAiGenerated && !card.id.startsWith("fc-ai")) return false;
    } else if (selectedCategory !== "all") {
      if (card.category !== selectedCategory) return false;
    }

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    return (
      card.word.toLowerCase().includes(query) ||
      card.arabicMeaning.toLowerCase().includes(query) ||
      card.arabicPhonetics.includes(query) ||
      card.exampleEn.toLowerCase().includes(query) ||
      card.exampleAr.includes(query)
    );
  });

  // Autocomplete Suggestions while typing
  const cleanSearch = searchQuery.trim().toLowerCase();
  const suggestions = cleanSearch
    ? cardsList.filter(
        (c) =>
          c.word.toLowerCase().includes(cleanSearch) ||
          c.arabicMeaning.includes(cleanSearch) ||
          c.arabicPhonetics.includes(cleanSearch)
      ).slice(0, 6)
    : [];

  const exactMatchCard = cardsList.find(
    (c) =>
      c.word.toLowerCase() === cleanSearch ||
      c.arabicMeaning.trim() === searchQuery.trim()
  );

  const handlePlayWord = (word: string, rate: number = 1.0) => {
    soundFX.playClick();
    playEnglishAudio(word, { rate });
  };

  const handlePlaySentence = (sentence: string) => {
    soundFX.playClick();
    playEnglishAudio(sentence, { rate: 0.9 });
  };

  // Scroll to and highlight a specific card
  const scrollToCard = (cardId: string) => {
    setHighlightedCardId(cardId);
    setIsDropdownOpen(false);

    setTimeout(() => {
      const el = document.getElementById(`flashcard-${cardId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    setTimeout(() => {
      setHighlightedCardId(null);
    }, 3500);
  };

  // AI Lookup & Generation handler
  const handleAiLookup = async (wordToSearch?: string) => {
    const term = (wordToSearch || searchQuery).trim();
    if (!term) {
      setStatusMessage({
        type: "error",
        text: "الرجاء كتابة كلمة في خانة البحث أولاً (مثل: Hospitality أو مستشفى أو Resilience)",
      });
      return;
    }

    setIsDropdownOpen(false);

    // 1. Check if the card already exists in the library
    const existing = flashcards.find(
      (c) =>
        c.word.toLowerCase() === term.toLowerCase() ||
        c.arabicMeaning.toLowerCase() === term.toLowerCase()
    );

    if (existing) {
      soundFX.playSuccess();
      setSelectedCategory("all");
      setSearchQuery(existing.word);
      scrollToCard(existing.id);
      setStatusMessage({
        type: "info",
        text: `✨ الكلمة "${existing.word}" (${existing.arabicMeaning}) موجودة بالفعل في البطاقات! تم تحديدها لك.`,
      });
      return;
    }

    // 2. Generate via Gemini backend API or Instant Lexical Synthesizer
    setIsSearchingAi(true);
    setStatusMessage({
      type: "info",
      text: `جارِ البحث والتحليل وتوليد بطاقة مصورة تفاعلية لكلمة "${term}"...`,
    });

    try {
      let generatedCard: FlashcardItem | null = null;

      try {
        const response = await fetch("/api/generate-flashcard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: term }),
        });

        if (response.ok) {
          generatedCard = await response.json();
        }
      } catch (netErr) {
        console.warn("Backend API not reachable (e.g., static hosting), using client generator:", netErr);
      }

      // If backend failed or returned incomplete, use the client educational generator
      if (!generatedCard || !generatedCard.word) {
        generatedCard = await createClientFallbackFlashcard(term);
      }

      if (onAddFlashcard) {
        onAddFlashcard(generatedCard);
      }

      onAddXp(25);
      soundFX.playSuccess();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

      setSelectedCategory("all");
      setSearchQuery(generatedCard.word);
      scrollToCard(generatedCard.id);

      setStatusMessage({
        type: "success",
        text: `🎉 تم بنجاح توليد وحفظ بطاقة "${generatedCard.word}" (${generatedCard.arabicMeaning}) وستكون متاحة للجميع دائماً! (+25 XP)`,
      });
    } catch (err: any) {
      console.error("AI flashcard generation error:", err);
      // Final resilient safety
      try {
        const fallbackCard = await createClientFallbackFlashcard(term);
        if (onAddFlashcard) onAddFlashcard(fallbackCard);
        onAddXp(25);
        soundFX.playSuccess();
        setSelectedCategory("all");
        setSearchQuery(fallbackCard.word);
        scrollToCard(fallbackCard.id);
        setStatusMessage({
          type: "success",
          text: `🎉 تم توليد بطاقة "${fallbackCard.word}" (${fallbackCard.arabicMeaning}) بنجاح! (+25 XP)`,
        });
      } catch {
        soundFX.playEncouragement();
        setStatusMessage({
          type: "error",
          text: "تعذر إتمام التوليد، يرجى المحاولة مرة أخرى.",
        });
      }
    } finally {
      setIsSearchingAi(false);
    }
  };

  // Start Quiz
  const startQuiz = () => {
    setQuizMode(true);
    setQuizIndex(0);
    setQuizScore(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setQuizCompleted(false);
  };

  // Check Quiz Answer
  const handleCheckAnswer = (option: string, correctAnswer: string) => {
    if (isAnswerChecked) return;
    setSelectedOption(option);
    setIsAnswerChecked(true);

    const correct = option.toLowerCase() === correctAnswer.toLowerCase();
    setIsCorrect(correct);

    if (correct) {
      soundFX.playSuccess();
      setQuizScore((prev) => prev + 1);
      onAddXp(15);
    } else {
      soundFX.playEncouragement();
    }
  };

  // Next Quiz Question
  const handleNextQuestion = () => {
    if (quizIndex + 1 < cardsList.length) {
      setQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
    } else {
      setQuizCompleted(true);
      soundFX.playSuccess();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onAddXp(50);
    }
  };

  // Quiz Options generator
  const currentQuizCard = cardsList[quizIndex] || cardsList[0];
  const generateOptions = (card: FlashcardItem) => {
    const distractors = cardsList
      .filter((c) => c.id !== card.id)
      .map((c) => c.word)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    return [card.word, ...distractors].sort(() => 0.5 - Math.random());
  };

  const currentOptions = currentQuizCard ? generateOptions(currentQuizCard) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner & Mode Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-white/20 backdrop-blur-md text-xs font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>قاموس المفردات المصور والذكي</span>
            </span>
            <span className="text-xs font-medium text-blue-100">
              {masteredWords.length} من {flashcards.length} كلمة متقنة
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            تعلم الكلمات الإنجليزية بالصوت والصورة والذكاء الاصطناعي
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium">
            ابحث عن أي كلمة أو اطلب من الذكاء الاصطناعي توليد بطاقتها المصورة فوراً بنطقها وأمثلتها ليتم حفظها ومشاركتها مع جميع المتعلمين!
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="flashcards-quiz-toggle-btn"
            onClick={() => setQuizMode(!quizMode)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer ${
              quizMode
                ? "bg-white text-blue-700 hover:bg-blue-50"
                : "bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-amber-400/20"
            }`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span>{quizMode ? "العودة للبطاقات" : "اختبر ذاكرتك البصرية والسمعية"}</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 border transition-all animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : statusMessage.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
              : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : statusMessage.type === "error" ? (
              <X className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!quizMode ? (
        <div className="space-y-6">
          {/* Filters & Interactive Search Bar with Live Suggestions */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
              {[
                { id: "all", label: "جميع الكلمات" },
                { id: "ai_generated", label: "✨ مولدة بالذكاء الاصطناعي" },
                { id: "mastered", label: "✓ المتقنة" },
                { id: "food", label: "طعام ومشروبات" },
                { id: "travel", label: "سفر وسياحة" },
                { id: "work", label: "عمل واجتماعات" },
                { id: "tech", label: "تقنية وأجهزة" },
                { id: "health", label: "صحة وطوارئ" },
                { id: "emotions", label: "مشاعر وصفات" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCategory(c.id);
                    soundFX.playClick();
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === c.id
                      ? "bg-slate-900 dark:bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Live Autocomplete Search Input + AI Action */}
            <div ref={searchContainerRef} className="relative flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-80">
                <input
                  id="flashcards-search-input"
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) setIsDropdownOpen(true);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (exactMatchCard) {
                        scrollToCard(exactMatchCard.id);
                      } else {
                        handleAiLookup();
                      }
                    }
                  }}
                  placeholder="ابحث بالحرف أو الكلمة (عربي/إنجليزي)..."
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setIsDropdownOpen(false);
                    }}
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* 🔍 Dynamic Live Autocomplete Suggestions Dropdown */}
                {isDropdownOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in max-h-80 overflow-y-auto">
                    {/* Instant AI Generation Option if word is being typed */}
                    <div
                      onClick={() => handleAiLookup(searchQuery)}
                      className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 cursor-pointer transition-all flex items-center justify-between gap-2 text-blue-700 dark:text-blue-300"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-black">
                            توليد بطاقة مصورة لـ: <span className="underline font-mono dir-ltr">"{searchQuery.trim()}"</span>
                          </p>
                          <p className="text-[10px] text-blue-600/80 dark:text-blue-300/80">
                            سيقوم Gemini بصياغة المعنى، النطق، جملة واقعية، وحفظها
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-lg shrink-0">
                        توليد الآن
                      </span>
                    </div>

                    {/* Matching Cards Suggestions */}
                    {suggestions.length > 0 ? (
                      <div>
                        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          نتائج مطابقة من البطاقات ({suggestions.length})
                        </div>
                        {suggestions.map((card) => (
                          <div
                            key={card.id}
                            onClick={() => {
                              setSearchQuery(card.word);
                              scrollToCard(card.id);
                            }}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={card.imageUrl}
                                alt={card.word}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="flex items-baseline gap-1.5">
                                  <p className="text-xs font-black text-slate-900 dark:text-white dir-ltr group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                    {card.word}
                                  </p>
                                  <span className="text-[10px] text-slate-400 italic">
                                    ({card.partOfSpeech})
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                  {card.arabicMeaning} • <span className="text-indigo-600 dark:text-indigo-400 font-bold">{card.arabicPhonetics}</span>
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayWord(card.word);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 text-slate-600 dark:text-slate-300 hover:text-blue-600 shrink-0"
                              title="استمع للنطق"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                        لم يتم العثور على كلمة مطابقة سابقة. اضغط على خيار التوليد بالذكاء الاصطناعي بالأعلى!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Main AI Search / Generate Button */}
              <button
                id="flashcard-ai-generate-btn"
                disabled={isSearchingAi}
                onClick={() => handleAiLookup()}
                className={`w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 ${
                  isSearchingAi ? "opacity-75 cursor-wait" : ""
                }`}
              >
                {isSearchingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>جارِ التوليد...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>✨ ابحث وتعلّم بالذكاء الاصطناعي</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cards Count and Active Filters Notice */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold px-1">
            <span>
              عرض {filteredCards.length} من أصل {cardsList.length} بطاقة
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>إلغاء البحث ({searchQuery})</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Cards Grid */}
          {filteredCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCards.map((card) => {
                const isMastered = masteredWords.includes(card.id);
                const isHighlighted = highlightedCardId === card.id;

                return (
                  <div
                    key={card.id}
                    id={`flashcard-${card.id}`}
                    className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col group relative ${
                      isHighlighted
                        ? "ring-4 ring-amber-400 dark:ring-amber-500 border-amber-400 scale-[1.02] shadow-xl"
                        : "border-slate-200/90 dark:border-slate-800"
                    }`}
                  >
                    {/* Visual Photo with Overlay */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={card.imageUrl}
                        alt={card.word}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = CATEGORY_IMAGES[card.category] || CATEGORY_IMAGES.general;
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Category Tag & Mastered Badge */}
                      <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-black/60 text-white backdrop-blur-md">
                            {card.category}
                          </span>
                          {(card.isAiGenerated || card.id.startsWith("fc-ai")) && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-indigo-600/90 text-white backdrop-blur-md flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                              <span>AI</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            onToggleMastered(card.id);
                            if (!isMastered) {
                              soundFX.playSuccess();
                              onAddXp(15);
                            }
                          }}
                          className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                            isMastered
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                          }`}
                          title={isMastered ? "تم حفظ الكلمة" : "تحديد كمتقنة"}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Word Title & Part of Speech */}
                      <div className="absolute bottom-3 right-3 left-3 text-white">
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-xl font-black tracking-wide dir-ltr">{card.word}</h3>
                          <span className="text-[11px] text-slate-300 font-medium italic">
                            ({card.partOfSpeech})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Details, Phonetics, and Audio Buttons */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        {/* Phonetics & Meaning */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50/80 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-xl">
                            <span>النطق:</span>
                            <span className="font-black text-slate-900 dark:text-white">
                              {card.arabicPhonetics}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono dir-ltr mr-auto">
                              {card.ipa}
                            </span>
                          </div>

                          <p className="text-sm font-black text-slate-900 dark:text-white pt-1">
                            {card.arabicMeaning}
                          </p>
                        </div>

                        {/* Example Sentence */}
                        <div
                          onClick={() => handlePlaySentence(card.exampleEn)}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer transition-all group/sentence space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 dir-ltr group-hover/sentence:text-blue-600 dark:group-hover/sentence:text-blue-400">
                              "{card.exampleEn}"
                            </p>
                            <Volume2 className="w-3.5 h-3.5 text-slate-400 group-hover/sentence:text-blue-600 dark:group-hover/sentence:text-blue-400 shrink-0" />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {card.exampleAr}
                          </p>
                        </div>
                      </div>

                      {/* Audio Playback Controls (Normal & Slow) */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handlePlayWord(card.word, 1.0)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>نطق عادي</span>
                        </button>

                        <button
                          onClick={() => handlePlayWord(card.word, 0.75)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                          title="نطق بطيء للمبتدئين"
                        >
                          <Volume1 className="w-4 h-4" />
                          <span>نطق بطيء</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  لم يتم العثور على بطاقات تطابق "{searchQuery}"
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  يمكنك توليد بطاقة تعليمية فورية لهذه الكلمة بالذكاء الاصطناعي مع حفظها تلقائياً!
                </p>
              </div>
              <button
                disabled={isSearchingAi}
                onClick={() => handleAiLookup(searchQuery)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer transition-all"
              >
                ✨ اضغط لتوليد بطاقة "{searchQuery}" الآن
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Visual Interactive Quiz Mode */
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-6">
          {!quizCompleted && currentQuizCard ? (
            <div className="space-y-6">
              {/* Quiz Header */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-4">
                <span>
                  السؤال {quizIndex + 1} من {cardsList.length}
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  النقاط: {quizScore}
                </span>
              </div>

              {/* Quiz Visual Card */}
              <div className="relative h-60 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <img
                  src={currentQuizCard.imageUrl}
                  alt="Quiz visual"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = CATEGORY_IMAGES[currentQuizCard.category] || CATEGORY_IMAGES.general;
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
                  <div className="text-white space-y-0.5">
                    <p className="text-xs text-slate-300 font-medium">ما هي الكلمة الإنجليزية المناسبة للصورة؟</p>
                    <p className="text-lg font-bold text-amber-300">{currentQuizCard.arabicMeaning}</p>
                  </div>
                </div>

                {/* Listen to audio hint */}
                <button
                  onClick={() => handlePlayWord(currentQuizCard.word, 1.0)}
                  className="absolute top-3 left-3 p-3 rounded-2xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md shadow-md transition-all cursor-pointer"
                  title="استمع للصوت"
                >
                  <Volume2 className="w-5 h-5 animate-pulse" />
                </button>
              </div>

              {/* 4 Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentOptions.map((opt) => {
                  const isSelected = selectedOption === opt;
                  const isAnswer = opt.toLowerCase() === currentQuizCard.word.toLowerCase();

                  let btnStyle =
                    "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700";
                  if (isAnswerChecked) {
                    if (isAnswer) {
                      btnStyle = "bg-emerald-500 border-emerald-600 text-white shadow-md";
                    } else if (isSelected && !isCorrect) {
                      btnStyle = "bg-rose-500 border-rose-600 text-white";
                    }
                  }

                  return (
                    <button
                      key={opt}
                      disabled={isAnswerChecked}
                      onClick={() => handleCheckAnswer(opt, currentQuizCard.word)}
                      className={`p-4 rounded-2xl border-2 font-bold text-base transition-all dir-ltr text-center cursor-pointer ${btnStyle}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Feedback and Next */}
              {isAnswerChecked && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                        <Check className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
                        <X className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {isCorrect ? "إجابة صحيحة وممتازة! (+15 XP)" : `الإجابة الصحيحة هي: ${currentQuizCard.word}`}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        النطق: {currentQuizCard.arabicPhonetics}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    السؤال التالي
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Quiz Completed Score Card */
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center shadow-md">
                <Award className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">أحسنت! أكملت الاختبار بنجاح</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                  حققت {quizScore} إجابات صحيحة من أصل {flashcards.length} أسئلة! (+50 XP)
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={startQuiz}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>إعادة الاختبار</span>
                </button>

                <button
                  onClick={() => setQuizMode(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  العودة للبطاقات
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};