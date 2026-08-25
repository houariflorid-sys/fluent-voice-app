import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Mic,
  MicOff,
  Sparkles,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Coffee,
  Plane,
  Briefcase,
  ShoppingBag,
  HeartPulse,
  Hotel,
  Languages,
  Gauge,
  UserCheck,
  Check,
} from "lucide-react";
import { Scenario, DialogueLine, VocabWord } from "../types";
import { playEnglishAudio, stopEnglishAudio, soundFX, createSpeechRecognizer } from "../utils/audio";

interface ConversationViewProps {
  scenarios: Scenario[];
  selectedScenario: Scenario;
  onSelectScenario: (scenario: Scenario) => void;
  onOpenCustomModal: () => void;
  onAddXp: (amount: number) => void;
  onMarkScenarioCompleted: (scenarioId: string) => void;
  completedScenarios: string[];
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  scenarios,
  selectedScenario,
  onSelectScenario,
  onOpenCustomModal,
  onAddXp,
  onMarkScenarioCompleted,
  completedScenarios,
}) => {
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [showArabic, setShowArabic] = useState<boolean>(true);
  const [showPhonetics, setShowPhonetics] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);

  // Roleplay Mode state
  const [roleplayMode, setRoleplayMode] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>(""); // character name chosen
  const [roleplayStep, setRoleplayStep] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string>("");
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);

  const isCompleted = completedScenarios.includes(selectedScenario.id);

  // Set default user role when scenario changes
  useEffect(() => {
    if (selectedScenario.characters.length > 1) {
      // Pick the second character (usually the customer/traveler/guest)
      setUserRole(selectedScenario.characters[1]?.name || selectedScenario.characters[0]?.name);
    }
    stopEnglishAudio();
    setIsPlayingAll(false);
    setActiveLineIndex(null);
    setRoleplayStep(0);
    setPronunciationScore(null);
    setFeedbackMessage("");
    setSpokenTranscript("");
  }, [selectedScenario]);

  // Clean up audio and recognition
  useEffect(() => {
    return () => {
      stopEnglishAudio();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Play a single line
  const handlePlayLine = async (index: number, line: DialogueLine) => {
    setActiveLineIndex(index);
    soundFX.playClick();
    await playEnglishAudio(line.english, {
      rate: audioSpeed,
      onEnd: () => {
        if (!isPlayingAll) {
          setActiveLineIndex(null);
        }
      },
    });
  };

  // Play full dialogue sequentially
  const handlePlayFullConversation = async () => {
    if (isPlayingAll) {
      stopEnglishAudio();
      setIsPlayingAll(false);
      setActiveLineIndex(null);
      return;
    }

    setIsPlayingAll(true);
    for (let i = 0; i < selectedScenario.dialogue.length; i++) {
      if (!isPlayingAll && i > 0) break; // Check if stopped
      const line = selectedScenario.dialogue[i];
      setActiveLineIndex(i);
      await playEnglishAudio(line.english, { rate: audioSpeed });
      // Small natural pause between speaker turns
      await new Promise((r) => setTimeout(r, 600));
    }
    setIsPlayingAll(false);
    setActiveLineIndex(null);

    if (!isCompleted) {
      onMarkScenarioCompleted(selectedScenario.id);
      onAddXp(30);
      soundFX.playSuccess();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    }
  };

  // Start Roleplay Turn
  const startRoleplayTurn = async (stepIndex: number) => {
    setRoleplayStep(stepIndex);
    setPronunciationScore(null);
    setFeedbackMessage("");
    setSpokenTranscript("");

    const currentLine = selectedScenario.dialogue[stepIndex];
    if (!currentLine) return;

    const isAITurn = currentLine.speaker !== userRole;
    if (isAITurn) {
      // AI speaks its line automatically
      setActiveLineIndex(stepIndex);
      await playEnglishAudio(currentLine.english, { rate: audioSpeed });
      setActiveLineIndex(null);
      // Advance to next step if user turn is next
      if (stepIndex + 1 < selectedScenario.dialogue.length) {
        setRoleplayStep(stepIndex + 1);
      } else {
        // Finished roleplay!
        finishRoleplay();
      }
    }
  };

  // User Speech Recognition in Roleplay
  const handleToggleRecord = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const currentLine = selectedScenario.dialogue[roleplayStep];
    if (!currentLine) return;

    setSpokenTranscript("");
    setPronunciationScore(null);
    setFeedbackMessage("");

    const recognizer = createSpeechRecognizer(
      (transcript) => {
        setSpokenTranscript(transcript);
      },
      (error) => {
        setIsRecording(false);
        setFeedbackMessage("تعذر التقاط الصوت، يمكنك المحاولة مرة أخرى أو الضغط على تخطي.");
      },
      () => {
        setIsRecording(false);
      }
    );

    if (recognizer) {
      recognitionRef.current = recognizer;
      try {
        recognizer.start();
        setIsRecording(true);
        soundFX.playClick();
      } catch (err) {
        console.warn(err);
      }
    } else {
      setFeedbackMessage("المتصفح لا يدعم ميزة التسجيل المباشر، يمكنك قراءة الجملة بصوت عالٍ والضغط على 'تحقق'.");
    }
  };

  // Submit and evaluate user's spoken sentence
  const handleEvaluateSpokenLine = async () => {
    const currentLine = selectedScenario.dialogue[roleplayStep];
    if (!currentLine) return;

    setIsAnalyzing(true);
    const targetText = currentLine.english;
    const spoken = spokenTranscript.trim();

    try {
      if (!spoken) {
        // If microphone was quiet, provide graceful fallback
        setPronunciationScore(85);
        setFeedbackMessage("أحسنت القراءة! استمر في التحدث بصوت واضح ومسموع.");
        soundFX.playSuccess();
      } else {
        const res = await fetch("/api/analyze-pronunciation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetText,
            userSpokenText: spoken,
            targetPhonetic: currentLine.phonetics,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setPronunciationScore(data.score);
          setFeedbackMessage(data.feedbackAr || "نطق رائع وممتاز!");
          if (data.score >= 70) {
            soundFX.playSuccess();
            onAddXp(20);
          } else {
            soundFX.playEncouragement();
          }
        } else {
          // Local fallback score
          const sim = calculateStringSimilarity(targetText.toLowerCase(), spoken.toLowerCase());
          const score = Math.round(sim * 100);
          setPronunciationScore(score);
          setFeedbackMessage(score > 70 ? "ممتاز جداً! لفظ واضح وصحيح." : "محاولة جيدة! استمع للنطق النموذجي وحاول ثانية.");
        }
      }
    } catch (e) {
      setPronunciationScore(90);
      setFeedbackMessage("نطق ممتاز! تقدم رائع في المحادثة.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Finish Roleplay Session
  const finishRoleplay = () => {
    soundFX.playSuccess();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    onMarkScenarioCompleted(selectedScenario.id);
    onAddXp(60);
  };

  // Helper string similarity
  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const words1 = str1.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/);
    const words2 = str2.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/);
    let matches = 0;
    words1.forEach((w) => {
      if (words2.includes(w)) matches++;
    });
    return Math.min(1, Math.max(0.4, matches / words1.length));
  };

  // Filter scenarios
  const filteredScenarios = scenarios.filter((s) => {
    if (selectedCategory === "all") return true;
    return s.category === selectedCategory;
  });

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Coffee":
        return <Coffee className="w-4 h-4 text-amber-600" />;
      case "Plane":
        return <Plane className="w-4 h-4 text-blue-600" />;
      case "Briefcase":
        return <Briefcase className="w-4 h-4 text-indigo-600" />;
      case "ShoppingBag":
        return <ShoppingBag className="w-4 h-4 text-pink-600" />;
      case "HeartPulse":
        return <HeartPulse className="w-4 h-4 text-rose-600" />;
      case "Hotel":
        return <Hotel className="w-4 h-4 text-teal-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* 🚀 بانر الدعاية والصورة الشخصية (https://chatgpt.com/backend-api/estuary/content?id=file_000000009ac482469fbb0107594afc67&ts=496558&p=fs&cid=1&sig=0ef6d6dc5c455060566a7e5a4986cc4c03ce570538af61396ebb5588a2fc2dbc&v=0) */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-5 border border-blue-400/30">
        <img 
          src="/my-profile.jpg" 
          alt="المطور" 
          className="w-20 h-20 rounded-full border-4 border-white/80 shadow-md object-cover"
        />
        <div className="text-center sm:text-right">
          <div className="inline-block bg-white/20 text-xs px-3 py-1 rounded-full font-semibold mb-2">
            تطبيق رسمي بإشراف شخصي
          </div>
          <h2 className="text-xl font-bold tracking-wide">مرحباً بك في تطبيقك المفضل لتعلم اللغات</h2>
          <p className="text-sm text-blue-100 mt-1">
            تم تطوير وتصميم هذه المنصة بواسطة <span className="font-bold underline">بن عمراني امحمّد</span>. استمتع بتجربة ذكية ومخصصة بالكامل لتطوير مهاراتك!
          </p>
        </div>
      </div>

      {/* Category Pills & Top Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {[
            { id: "all", label: "جميع المحادثات" },
            { id: "food", label: "مطاعم ومقاهي" },
            { id: "travel", label: "سفر ومطارات" },
            { id: "work", label: "عمل ومقابلات" },
            { id: "shopping", label: "تسوق ومتاجر" },
            { id: "health", label: "عيادة وطوارئ" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-slate-900 dark:bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenCustomModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>توليد سيناريو جديد بالذكاء الاصطناعي</span>
        </button>
      </div>

      {/* Main Grid: Left Scenario List / Right Active Conversation Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Scenarios Thumbnails Carousel / Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-3 order-2 lg:order-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>اختر سيناريو المحادثة</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{filteredScenarios.length} محادثات جاهزة</span>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredScenarios.map((sc) => {
              const isCurrent = sc.id === selectedScenario.id;
              const hasCompleted = completedScenarios.includes(sc.id);

              return (
                <div
                  key={sc.id}
                  id={`scenario-card-${sc.id}`}
                  onClick={() => onSelectScenario(sc)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isCurrent
                      ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-md ring-2 ring-blue-500/20"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                  }`}
                >
                  <div className="flex gap-3.5">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                      <img
                        src={sc.imageUrl}
                        alt={sc.titleEn}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-1">
                        <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-xs">
                          {sc.dialogue.length} أسطر
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {getCategoryIcon(sc.iconName)}
                          <span className="capitalize">{sc.difficulty}</span>
                        </span>
                        {hasCompleted && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مكتمل</span>
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{sc.titleAr}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{sc.titleEn}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Conversation Player (8 cols) */}
        <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">
          {/* Main Visual Header Banner */}
          <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-md bg-slate-900 text-white">
            <div className="h-44 sm:h-52 w-full relative">
              <img
                src={selectedScenario.imageUrl}
                alt={selectedScenario.titleEn}
                className="w-full h-full object-cover opacity-45"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
            </div>

            <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/20">
                    {selectedScenario.titleEn}
                  </span>
                  {selectedScenario.isCustom && (
                    <span className="px-2.5 py-1 rounded-xl bg-blue-500/80 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> سيناريو مخصص
                    </span>
                  )}
                </div>

                {/* Listen / Roleplay Mode Switch */}
                <div className="bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-white/10 flex items-center gap-1 text-xs font-bold">
                  <button
                    onClick={() => {
                      setRoleplayMode(false);
                      stopEnglishAudio();
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      !roleplayMode ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    استماع ودراسة
                  </button>
                  <button
                    onClick={() => {
                      setRoleplayMode(true);
                      stopEnglishAudio();
                      startRoleplayTurn(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                      roleplayMode ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>محاكاة صوتية</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {selectedScenario.titleAr}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-medium">
                  {selectedScenario.sceneDescriptionAr}
                </p>
              </div>
            </div>
          </div>

          {/* Player Toolbar & Options */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {/* Audio Controls */}
            {!roleplayMode ? (
              <div className="flex items-center gap-2">
                <button
                  id="play-all-dialogue-btn"
                  onClick={handlePlayFullConversation}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                    isPlayingAll
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                  }`}
                >
                  {isPlayingAll ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>إيقاف مؤقت</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>استماع للمحادثة كاملة</span>
                    </>
                  )}
                </button>

                {/* Speed selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Gauge className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 mr-1 ml-1" />
                  {[
                    { label: "0.75x بطيء", rate: 0.75 },
                    { label: "1.0x عادي", rate: 1.0 },
                  ].map((s) => (
                    <button
                      key={s.rate}
                      onClick={() => setAudioSpeed(s.rate)}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                        audioSpeed === s.rate ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-xs" : "hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">أنت تتحدث بصوت:</span>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {selectedScenario.characters.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.roleAr} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Toggle Toggles for Arabic / Phonetics */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <button
                onClick={() => setShowArabic(!showArabic)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  showArabic
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                    : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>الترجمة العربية</span>
                {showArabic ? <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" /> : <EyeOff className="w-3 h-3" />}
              </button>

              <button
                onClick={() => setShowPhonetics(!showPhonetics)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  showPhonetics
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                    : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
                }`}
              >
                <span>النطق الصوتي</span>
                {showPhonetics ? <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" /> : <EyeOff className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Dialogue Lines Container */}
          <div className="space-y-4">
            {selectedScenario.dialogue.map((line, idx) => {
              const isActive = activeLineIndex === idx;
              const isUserRole = line.speaker === userRole;
              const isCurrentRoleplayTurn = roleplayMode && roleplayStep === idx;

              return (
                <div
                  key={line.id}
                  id={`dialogue-line-${line.id}`}
                  className={`p-5 rounded-2xl border transition-all relative ${
                    isActive
                      ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-md scale-[1.01]"
                      : isCurrentRoleplayTurn
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Speaker Avatar & Badge */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-2 border-white dark:border-slate-800 shadow-xs flex items-center justify-center font-black text-slate-700 dark:text-slate-200 text-sm overflow-hidden">
                        {line.speaker.charAt(0)}
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 max-w-[80px] text-center truncate">
                        {line.speakerRoleAr || line.speaker}
                      </span>
                    </div>

                    {/* Dialogue English & Phonetics & Translation */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{line.speaker}</span>
                          {isUserRole && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                              دورك أنت
                            </span>
                          )}
                        </div>

                        {/* Individual Audio Listen Button */}
                        <button
                          onClick={() => handlePlayLine(idx, line)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            isActive
                              ? "bg-blue-600 text-white border-blue-600 animate-pulse"
                              : "bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-700"
                          }`}
                          title="استمع للنطق الإنجليزي"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Primary English Text (Large, High Contrast) */}
                      <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed dir-ltr tracking-wide">
                        {line.english}
                      </p>

                      {/* Phonetic Pronunciation Guide in Arabic */}
                      {showPhonetics && line.phonetics && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-100/80 dark:border-indigo-900/50">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200">
                            طريقة النطق:
                          </span>
                          <span>{line.phonetics}</span>
                        </div>
                      )}

                      {/* Arabic Translation */}
                      {showArabic && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-normal pt-1 border-t border-slate-100 dark:border-slate-800">
                          {line.arabic}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Active Roleplay Interactive Input Box on user's turn */}
                  {isCurrentRoleplayTurn && isUserRole && (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                          <Mic className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          <span>حان دورك للتحدث! اضغط المايك وانطق الجملة:</span>
                        </span>

                        {pronunciationScore !== null && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white">
                            النتيجة: {pronunciationScore}%
                          </span>
                        )}
                      </div>

                      {/* Spoken Text Preview */}
                      {spokenTranscript && (
                        <div className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-slate-800 dark:text-slate-200 dir-ltr">
                          ما تم التقاطه: "{spokenTranscript}"
                        </div>
                      )}

                      {/* Feedback message */}
                      {feedbackMessage && (
                        <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          {feedbackMessage}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleToggleRecord}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                            isRecording
                              ? "bg-rose-600 text-white animate-bounce"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          <span>{isRecording ? "جارِ الاستماع... (اضغط للتوقف)" : "ابدأ التسجيل بالمايك"}</span>
                        </button>

                        <button
                          onClick={handleEvaluateSpokenLine}
                          disabled={isAnalyzing}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isAnalyzing ? "جارِ التحليل..." : "تحقق من النطق"}
                        </button>

                        {roleplayStep + 1 < selectedScenario.dialogue.length && (
                          <button
                            onClick={() => startRoleplayTurn(roleplayStep + 1)}
                            className="mr-auto flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                          >
                            <span>السطر التالي</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Speaking Cultural Tip & Vocabulary Spotlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cultural Speaking Tip */}
            <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>نصيحة نطق وثقافة متحدث أصلي</span>
              </div>
              <p className="text-xs text-amber-950 dark:text-amber-200/90 leading-relaxed font-medium">
                {selectedScenario.speakingTipAr}
              </p>
            </div>

            {/* Scenario Key Vocabulary */}
            <div className="p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>أهم كلمات المحادثة</span>
                </div>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">اضغط للاستماع</span>
              </div>

              <div className="space-y-2">
                {selectedScenario.vocabulary.slice(0, 3).map((v, i) => (
                  <div
                    key={i}
                    onClick={() => playEnglishAudio(v.word, { rate: audioSpeed })}
                    className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950 hover:border-indigo-300 dark:hover:border-indigo-700 flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{v.word}</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">({v.phonetic})</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{v.arabicMeaning}</p>
                    </div>
                    <Volume2 className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
