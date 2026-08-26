import React, { useState } from "react";
import confetti from "canvas-confetti";
import {
  Volume2,
  Volume1,
  CheckCircle2,
  Sparkles,
  Gamepad2,
  BookOpen,
  RotateCw,
  Search,
  Filter,
  Check,
  X,
  Award,
} from "lucide-react";
import { FlashcardItem } from "../types";
import { playEnglishAudio, soundFX } from "../utils/audio";

interface FlashcardsViewProps {
  flashcards: FlashcardItem[];
  masteredWords: string[];
  onToggleMastered: (wordId: string) => void;
  onAddXp: (amount: number) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  flashcards,
  masteredWords,
  onToggleMastered,
  onAddXp,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<boolean>(false);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  // Filtered Cards
  const filteredCards = flashcards.filter((card) => {
    const matchesCategory = selectedCategory === "all" || card.category === selectedCategory;
    const matchesSearch =
      card.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.arabicMeaning.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const handlePlayWord = (word: string, rate: number = 1.0) => {
    soundFX.playClick();
    playEnglishAudio(word, { rate });
  };

  const handlePlaySentence = (sentence: string) => {
    soundFX.playClick();
    playEnglishAudio(sentence, { rate: 0.9 });
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
    if (quizIndex + 1 < flashcards.length) {
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
  const currentQuizCard = flashcards[quizIndex];
  const generateOptions = (card: FlashcardItem) => {
    const distractors = flashcards
      .filter((c) => c.id !== card.id)
      .map((c) => c.word)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    return [card.word, ...distractors].sort(() => 0.5 - Math.random());
  };
// دالة البحث الديناميكي وتوليد البطاقة وتخزينها محلياً للأبد
const handleAiWordLookup = async () => {
  if (!searchQuery.trim()) return;
  const exists = cards.some((c: any) => 
    c.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.translation.includes(searchQuery)
  );
  if (exists) return;
  try {
    const res = await fetch("/api/lookup-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: searchQuery.trim() }),
    });
    const data = await res.json();
    if (data.success && data.card) {
      const updatedCards = [data.card, ...cards];
      setCards(updatedCards);
      localStorage.setItem("user_custom_flashcards", JSON.stringify(updatedCards));
      alert(`تم توليد وتعلم كلمة "${searchQuery}" بنجاح وأصبحت مخزنة في قاموسك الشخصي!`);
    }
  } catch (err) {
    console.error("Error looking up word:", err);
  }
};
  const currentOptions = currentQuizCard ? generateOptions(currentQuizCard) : [];

 return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner & Mode Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-white/20 backdrop-blur-md text-xs font-bold">
              قاموس المفردات المصور
            </span>
            <span className="text-xs font-medium text-blue-100">
              {masteredWords.length} من {flashcards.length} كلمة متقنة
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            تعلم الكلمات الإنجليزية بالصوت والصورة
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium">
            اربط الكلمة بصورتها ونطقها النموذجي لترسيخها في الذاكرة طويلة المدى، مع أمثلة عملية ونطق مبسط.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
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

      {!quizMode ? (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar w-full sm:w-auto">
              {[
                { id: "all", label: "جميع الكلمات" },
                { id: "food", label: "طعام ومشروبات" },
                { id: "travel", label: "سفر وسياحة" },
                { id: "work", label: "عمل واجتماعات" },
                { id: "tech", label: "تقنية وأجهزة" },
                { id: "health", label: "صحة وطوارئ" },
                { id: "emotions", label: "مشاعر وصفات" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
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

            {/* Search Input & AI Lookup Button */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالعربية أو الإنجليزية..."
                  className="w-full pl-3 pr-9 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <button 
                onClick={handleAiWordLookup}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                ✨ ابحث وتعلّم بالذكاء الاصطناعي
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCards.map((card) => {
              const isMastered = masteredWords.includes(card.id);

              return (
                <div
                  key={card.id}
                  id={`flashcard-${card.id}`}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
                >
                  {/* Visual Photo with Overlay */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={card.imageUrl}
                      alt={card.word}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Category Tag & Mastered Badge */}
                    <div className="absolute top-3 right-3 left-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-black/50 text-white backdrop-blur-md">
                        {card.category}
                      </span>

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
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50/80 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">
                          <span>النطق:</span>
                          <span className="font-semibold">{card.arabicPhonetics}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono dir-ltr mr-auto">
                            {card.ipa}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900 dark:text-white pt-1">{card.arabicMeaning}</p>
                      </div>

                      {/* Example Sentence */}
                      <div
                        onClick={() => handlePlaySentence(card.exampleEn)}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer transition-all group/sentence space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 dir-ltr group-hover/sentence:text-blue-600 dark:group-hover/sentence:text-blue-400">
                            "{card.exampleEn}"
                          </p>
                          <Volume2 className="w-3.5 h-3.5 text-slate-400 group-hover/sentence:text-blue-600 dark:group-hover/sentence:text-blue-400 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{card.exampleAr}</p>
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
        </div>
      ) : (
        /* Visual Interactive Quiz Mode */
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-6">
          {!quizCompleted && currentQuizCard ? (
            <div className="space-y-6">
              {/* Quiz Header */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-4">
                <span>
                  السؤال {quizIndex + 1} من {flashcards.length}
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

                  let btnStyle = "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700";
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
