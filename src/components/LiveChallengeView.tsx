import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Volume1,
  Sparkles,
  Trophy,
  Award,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Clock,
  Languages,
  Check,
  X,
  Share2,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  GraduationCap,
  Briefcase,
  Plane,
  Coffee,
  MessageSquareQuote,
  Lightbulb,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  LiveChallengeQuestion,
  LiveChallengeEvaluationReport,
  LiveChallengeTargetWord,
} from "../types";
import { playEnglishAudio, stopEnglishAudio, soundFX } from "../utils/audio";

interface LiveChallengeViewProps {
  onAddXp: (amount: number) => void;
}

const TOPICS = [
  {
    id: "travel",
    label: "السفر والمطارات",
    icon: Plane,
    desc: "مواقف المطار، حجز الفنادق، طلب الاتجاهات",
    color: "from-sky-500 to-blue-600",
  },
  {
    id: "job_interview",
    label: "مقابلات العمل والمهن",
    icon: Briefcase,
    desc: "التعريف بالنفس، الخبرات، والرد على أسئلة المقابلات",
    color: "from-indigo-500 to-purple-600",
  },
  {
    id: "daily_life",
    label: "الحياة اليومية والمطاعم",
    icon: Coffee,
    desc: "طلب الطعام، التسوق، والحديث عن الهوايات",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "ielts",
    label: "اختبار IELTS Speaking",
    icon: GraduationCap,
    desc: "أسئلة أكاديمية لتطوير الطلاقة والتنظيم الفكري",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "debate_opinions",
    label: "النقاشات والتعبير عن الرأي",
    icon: MessageSquareQuote,
    desc: "المقارنات، إبداء الآراء، والإقناع اللغوي",
    color: "from-rose-500 to-pink-600",
  },
  {
    id: "pronunciation_drills",
    label: "تحدي الأصوات الصعبة",
    icon: Target,
    desc: "التركيز على أصوات P/B, TH, V/F وتناغم الكلمات",
    color: "from-violet-500 to-indigo-600",
  },
];

export const LiveChallengeView: React.FC<LiveChallengeViewProps> = ({ onAddXp }) => {
  // Setup state
  const [selectedTopic, setSelectedTopic] = useState<string>("travel");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [challengeModeActive, setChallengeModeActive] = useState<boolean>(false);

  // Round / Progress state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [totalQuestionsInRound] = useState<number>(3);
  const [roundCompleted, setRoundCompleted] = useState<boolean>(false);
  const [sessionReports, setSessionReports] = useState<{ question: LiveChallengeQuestion; report: LiveChallengeEvaluationReport }[]>([]);

  // Current Question state
  const [currentQuestion, setCurrentQuestion] = useState<LiveChallengeQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState<boolean>(false);
  const [showArabicTranslation, setShowArabicTranslation] = useState<boolean>(true);
  const [showPhonetics, setShowPhonetics] = useState<boolean>(true);
  const [showModelAnswer, setShowModelAnswer] = useState<boolean>(false);

  // User Recording & Speech state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [currentReport, setCurrentReport] = useState<LiveChallengeEvaluationReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Refs for Speech Recognition and Audio
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const previousQuestionsRef = useRef<string[]>([]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + " ";
        }
        setUserTranscript(transcript.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("يرجى إعطاء صلاحية استخدام الميكروفون لتسجيل إجابتك.");
        }
      };

      recognition.onend = () => {
        // will update isRecording via stop function
      };

      recognitionRef.current = recognition;
    }

    return () => {
      stopRecording();
      stopEnglishAudio();
    };
  }, []);

  // Fetch a new question from AI
  const fetchNewQuestion = async (topicId = selectedTopic, diff = difficulty) => {
    try {
      setIsLoadingQuestion(true);
      setErrorMessage("");
      setCurrentReport(null);
      setUserTranscript("");
      setShowModelAnswer(false);
      setRecordingSeconds(0);

      const res = await fetch("/api/live-challenge/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicId,
          difficulty: diff,
          previousQuestions: previousQuestionsRef.current,
        }),
      });

      if (!res.ok) {
        throw new Error("فشل في توليد سؤال التحدي، يرجى المحاولة ثانية.");
      }

      const data: LiveChallengeQuestion = await res.json();
      setCurrentQuestion(data);
      previousQuestionsRef.current.push(data.questionEn);

      // Auto play question sound
      playEnglishAudio(data.questionEn, { rate: diff === "beginner" ? 0.85 : 1.0 });
    } catch (err: any) {
      console.error("Error fetching question:", err);
      setErrorMessage(err?.message || "حدث خطأ أثناء تحميل السؤال.");
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  // Start new Challenge Round
  const startChallengeRound = async () => {
    soundFX.playClick();
    setChallengeModeActive(true);
    setRoundCompleted(false);
    setCurrentQuestionIndex(0);
    setSessionReports([]);
    previousQuestionsRef.current = [];
    await fetchNewQuestion(selectedTopic, difficulty);
  };

  // Mic & Recording Handler
  const startRecording = async () => {
    try {
      setErrorMessage("");
      setUserTranscript("");
      setRecordingSeconds(0);
      soundFX.playClick();

      // Start Web Audio for visualizer
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        if (isRecording) {
          requestAnimationFrame(updateLevel);
        }
      };

      setIsRecording(true);
      requestAnimationFrame(updateLevel);

      // Start recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Recognition already active", e);
        }
      }

      // Start Timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Mic error:", err);
      setErrorMessage("تعذر فتح الميكروفون. يرجى التأكد من منحه الإذن في المتصفح.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setAudioLevel(0);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // Submit Spoken Answer for In-depth AI Evaluation
  const evaluateAnswer = async () => {
    if (!currentQuestion) return;
    if (!userTranscript || userTranscript.trim().length < 2) {
      setErrorMessage("يرجى نطق إجابتك بالإنجليزية أولاً قبل إرسال التقييم.");
      return;
    }

    stopRecording();
    setIsEvaluating(true);
    setErrorMessage("");
    soundFX.playClick();

    try {
      const res = await fetch("/api/live-challenge/evaluate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionEn: currentQuestion.questionEn,
          targetKeywords: currentQuestion.targetKeywords,
          userTranscript: userTranscript.trim(),
          difficulty,
          topic: selectedTopic,
        }),
      });

      if (!res.ok) {
        throw new Error("حدث خطأ أثناء تقييم الأداء النطقي.");
      }

      const report: LiveChallengeEvaluationReport = await res.json();
      setCurrentReport(report);

      // Award XP
      const xp = report.xpEarned || 35;
      onAddXp(xp);

      // Sound FX & Confetti
      if (report.overallScore >= 75) {
        soundFX.playSuccess();
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } else {
        soundFX.playClick();
      }

      // Add to session reports
      setSessionReports((prev) => [...prev, { question: currentQuestion, report }]);
    } catch (err: any) {
      console.error("Evaluation error:", err);
      setErrorMessage(err?.message || "تعذر إجراء التقييم، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handle Next Question or Finish Round
  const handleNextQuestion = async () => {
    soundFX.playClick();
    if (currentQuestionIndex + 1 < totalQuestionsInRound) {
      setCurrentQuestionIndex((prev) => prev + 1);
      await fetchNewQuestion();
    } else {
      setRoundCompleted(true);
      soundFX.playSuccess();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
    }
  };

  // Helper to play native audio of words or phrases
  const handlePlayAudio = (text: string, rate = 1.0) => {
    playEnglishAudio(text, { rate });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    if (score >= 70) return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
    if (score >= 55) return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    return "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  };

  const getScoreBadgeText = (score: number) => {
    if (score >= 90) return "نطق ممتاز ومتقن 🌟";
    if (score >= 80) return "أداء رائع جداً 🚀";
    if (score >= 70) return "جيد ومفهوم 👍";
    if (score >= 55) return "مقبول مع ملاحظات ✍️";
    return "يحتاج إلى تدريب مكثف 🎯";
  };

  return (
    <div className="space-y-6">
      {/* If challenge mode is NOT active: Show Topic Selector & Setup */}
      {!challengeModeActive ? (
        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-tr from-indigo-700 via-blue-600 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="px-3.5 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-xs font-black flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>وضع التحدي التفاعلي والتقييم النطقي الفوري</span>
              </span>
              <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-lg">
                مدعوم بنموذج Gemini 3.7 Flash
              </span>
            </div>

            <div className="space-y-2 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-black">
                تحدث مع الذكاء الاصطناعي واحصل على تقرير أخطاء مفصل
              </h2>
              <p className="text-sm text-blue-100 font-medium leading-relaxed">
                يطرح عليك الـ AI أسئلة تحدث واقعية ومحفزة، ثم يحلل صوتك ونطقك بدقة بالغة، ويقدم لك تقريراً تفصيلياً يوضح الكلمات غير المتقنة، تصحيحات القواعد، والنصائح الصوتية المخصصة للناطقين بالعربية.
              </p>
            </div>

            {/* Quick Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2.5 text-xs font-bold">
                <Target className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>تحليل مخارج الحروف والأصوات</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2.5 text-xs font-bold">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>كشف وتصحيح الأخطاء القواعدية</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2.5 text-xs font-bold">
                <Award className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>إجابات نموذجية مع نطق بطيء</span>
              </div>
            </div>
          </div>

          {/* Difficulty Selector */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>اختر مستوى التحدي المناسب لك:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "beginner", label: "مبتدئ (Beginner)", desc: "أسئلة بسيطة ومباشرة ومفردات أساسية" },
                { id: "intermediate", label: "متوسط (Intermediate)", desc: "مواقف يومية وأسئلة مركبة تتطلب عدة جمل" },
                { id: "advanced", label: "متقدم (Advanced)", desc: "نقاشات تحليلية واختبارات IELTS ومفردات أكاديمية" },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setDifficulty(lvl.id as any)}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer space-y-1 ${
                    difficulty === lvl.id
                      ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 dark:border-blue-500 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900 dark:text-white">{lvl.label}</span>
                    {difficulty === lvl.id && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{lvl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Topics Grid */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>اختر موضوع التحدي للبدء:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TOPICS.map((topic) => {
                const Icon = topic.icon;
                const isSelected = selectedTopic === topic.id;

                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`p-5 rounded-3xl border text-right transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? "bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20"
                        : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${topic.color} flex items-center justify-center text-white shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {topic.label}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {topic.desc}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                      <span>{isSelected ? "محدد للبدء" : "اختيار هذا التحدي"}</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Challenge CTA */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={startChallengeRound}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-black text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all flex items-center gap-3 cursor-pointer"
            >
              <Trophy className="w-5 h-5 text-amber-300" />
              <span>بدء جولة التحدي الآن (3 أسئلة تفاعلية)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : roundCompleted ? (
        /* Round Completed Summary Card */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-6 sm:p-10 text-center space-y-8">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-md">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              أحسنت! أكملت جولة التحدي بنجاح 🏅
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
              تم تقييم أدائك النطقي والقواعدي في {sessionReports.length} أسئلة بنجاح وحصلت على مكافآت XP مضاعفة.
            </p>
          </div>

          {/* Average Scores Summary */}
          {sessionReports.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">متوسط النطق</span>
                <span className="text-xl font-black text-blue-900 dark:text-blue-200">
                  {Math.round(
                    sessionReports.reduce((acc, r) => acc + r.report.pronunciationScore, 0) /
                      sessionReports.length
                  )}
                  %
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">الطلاقة</span>
                <span className="text-xl font-black text-emerald-900 dark:text-emerald-200">
                  {Math.round(
                    sessionReports.reduce((acc, r) => acc + r.report.fluencyScore, 0) /
                      sessionReports.length
                  )}
                  %
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block">القواعد</span>
                <span className="text-xl font-black text-indigo-900 dark:text-indigo-200">
                  {Math.round(
                    sessionReports.reduce((acc, r) => acc + r.report.grammarScore, 0) /
                      sessionReports.length
                  )}
                  %
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-center">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block">المفردات</span>
                <span className="text-xl font-black text-purple-900 dark:text-purple-200">
                  {Math.round(
                    sessionReports.reduce((acc, r) => acc + r.report.vocabularyScore, 0) /
                      sessionReports.length
                  )}
                  %
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={startChallengeRound}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>بدء جولة تحدي جديدة</span>
            </button>
            <button
              onClick={() => setChallengeModeActive(false)}
              className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs transition-all cursor-pointer"
            >
              العودة لقائمة التحديات
            </button>
          </div>
        </div>
      ) : (
        /* Active Challenge Stage */
        <div className="space-y-6">
          {/* Top Progress & Navigation Bar */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  stopRecording();
                  setChallengeModeActive(false);
                }}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                title="الخروج من التحدي"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  السؤال {currentQuestionIndex + 1} من {totalQuestionsInRound}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                  {TOPICS.find((t) => t.id === selectedTopic)?.label} • مستوى {difficulty === "beginner" ? "مبتدئ" : difficulty === "intermediate" ? "متوسط" : "متقدم"}
                </span>
              </div>
            </div>

            {/* Progress Dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalQuestionsInRound }).map((_, i) => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === currentQuestionIndex
                      ? "bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/50"
                      : i < currentQuestionIndex
                      ? "bg-emerald-500"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Loading State for Question */}
          {isLoadingQuestion ? (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                الذكاء الاصطناعي يقوم بصياغة سؤال التحدي والمفردات المستهدفة...
              </p>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-6">
              {/* Question Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-6">
                {/* Scenario Context Badge */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>سياق الموقف: {currentQuestion.contextDescriptionAr}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowArabicTranslation(!showArabicTranslation)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        showArabicTranslation
                          ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Languages className="w-3.5 h-3.5 inline ml-1" />
                      <span>الترجمة</span>
                    </button>
                    <button
                      onClick={() => setShowPhonetics(!showPhonetics)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        showPhonetics
                          ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span>النطق</span>
                    </button>
                  </div>
                </div>

                {/* Question Audio & English Text */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-relaxed dir-ltr">
                      "{currentQuestion.questionEn}"
                    </h3>

                    {/* Audio Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handlePlayAudio(currentQuestion.questionEn, 1.0)}
                        className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 transition-all cursor-pointer"
                        title="استماع عادي"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handlePlayAudio(currentQuestion.questionEn, 0.75)}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                        title="استماع بطيء للمبتدئين"
                      >
                        <Volume1 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Phonetics */}
                  {showPhonetics && currentQuestion.questionPhonetics && (
                    <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 ml-1">النطق بالعربية:</span>
                      {currentQuestion.questionPhonetics}
                    </div>
                  )}

                  {/* Arabic Translation */}
                  {showArabicTranslation && currentQuestion.questionAr && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {currentQuestion.questionAr}
                    </p>
                  )}
                </div>

                {/* Recommended Keywords */}
                {currentQuestion.targetKeywords && currentQuestion.targetKeywords.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>كلمات وتعبيرات مستهدفة يُفضل استخدامها في إجابتك:</span>
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {currentQuestion.targetKeywords.map((kw, i) => (
                        <div
                          key={i}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-2xs"
                        >
                          <span className="text-xs font-black text-slate-900 dark:text-white dir-ltr">{kw.word}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({kw.arabicMeaning})</span>
                          <button
                            onClick={() => handlePlayAudio(kw.word, 0.85)}
                            className="text-blue-600 dark:text-blue-400 hover:scale-110 transition-transform cursor-pointer"
                            title="استمع للكلمة"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model Answer Toggle Hint */}
                <div className="pt-1">
                  <button
                    onClick={() => setShowModelAnswer(!showModelAnswer)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showModelAnswer ? "إخفاء الإجابة النموذجية المقترحة" : "أحتاج مساعدة: عرض إجابة نموذجية مقترحة"}</span>
                  </button>

                  {showModelAnswer && (
                    <div className="mt-3 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">إجابة نموذجية يمكنك الاستعانة بها:</span>
                        <button
                          onClick={() => handlePlayAudio(currentQuestion.sampleGoodAnswerEn)}
                          className="p-1 rounded-lg bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 cursor-pointer text-xs font-bold flex items-center gap-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>استماع</span>
                        </button>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white dir-ltr">
                        "{currentQuestion.sampleGoodAnswerEn}"
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                        {currentQuestion.sampleGoodAnswerAr}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Spoken Answer & Recording Stage */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-6 text-center">
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {isRecording ? "جارِ الاستماع لنطقك وتسجيل صوتك الآن..." : "اضغط المايك وتحدث بإجابتك باللغة الإنجليزية"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    تحدث بوضوح وطبيعية كما لو كنت تجيب شخصاً حقيقياً
                  </p>
                </div>

                {/* Big Animated Mic Button */}
                <div className="py-4 flex flex-col items-center justify-center space-y-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center gap-1 text-white shadow-xl transition-all cursor-pointer ${
                      isRecording
                        ? "bg-rose-600 ring-8 ring-rose-200 dark:ring-rose-900 animate-pulse"
                        : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-600 hover:scale-105 shadow-blue-500/25"
                    }`}
                  >
                    {isRecording ? <MicOff className="w-8 h-8 sm:w-10 sm:h-10" /> : <Mic className="w-8 h-8 sm:w-10 sm:h-10" />}
                    <span className="text-[10px] font-black">{isRecording ? "إيقاف التسجيل" : "ابدأ التحدث"}</span>
                  </button>

                  {/* Visualizer & Timer */}
                  {isRecording && (
                    <div className="space-y-2 w-full max-w-xs mx-auto">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-rose-500 animate-spin" />
                          <span>مدة التسجيل: {recordingSeconds} ثانية</span>
                        </span>
                        <span>مستوى الإشارة: {audioLevel}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-indigo-600 transition-all duration-75 rounded-full"
                          style={{ width: `${Math.max(8, audioLevel)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Real-time Spoken Transcript Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-right space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span>النص المنطوق الذي تم التقاطه:</span>
                    {userTranscript && (
                      <button
                        onClick={() => setUserTranscript("")}
                        className="text-[11px] text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        مسح النص
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    value={userTranscript}
                    onChange={(e) => setUserTranscript(e.target.value)}
                    placeholder="سيظهر كلامك الإنجليزي هنا تلقائياً أثناء حديثك، أو يمكنك كتابته وتعديله يدوياً..."
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dir-ltr"
                  />
                </div>

                {/* Submit For AI Evaluation Button */}
                <div className="pt-2">
                  <button
                    onClick={evaluateAnswer}
                    disabled={isEvaluating || !userTranscript.trim()}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>الذكاء الاصطناعي يحلل نطقك وقواعدك بدقة...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>تقييم إجابتي وعرض تقرير الأخطاء المفصل</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* DETAILED ERROR & EVALUATION REPORT */}
              {currentReport && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-6 sm:p-8 space-y-8 animate-fade-in">
                  {/* Report Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-amber-500" />
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                          تقرير الأداء والتحليل الصوتي المفصل
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {currentReport.summaryFeedbackAr}
                      </p>
                    </div>

                    {/* Overall Score Badge */}
                    <div className={`p-4 rounded-2xl border text-center shrink-0 ${getScoreColor(currentReport.overallScore)}`}>
                      <span className="text-xs font-bold block">الدرجة الإجمالية</span>
                      <span className="text-3xl font-black">{currentReport.overallScore}%</span>
                      <span className="text-[10px] font-bold block mt-0.5">
                        {getScoreBadgeText(currentReport.overallScore)}
                      </span>
                    </div>
                  </div>

                  {/* 4 Skill Score Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">دقة النطق والأصوات</span>
                      <span className="text-lg font-black text-blue-600 dark:text-blue-400">{currentReport.pronunciationScore}%</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">الطلاقة والاسترسال</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{currentReport.fluencyScore}%</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">القواعد وتركيب الجمل</span>
                      <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{currentReport.grammarScore}%</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">الثروة اللغوية</span>
                      <span className="text-lg font-black text-purple-600 dark:text-purple-400">{currentReport.vocabularyScore}%</span>
                    </div>
                  </div>

                  {/* SECTION 1: Mispronounced Words & Phonetic Corrections */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-rose-500" />
                      <span>سجل الأخطاء النطقية وتصحيح مخارج الحروف:</span>
                    </h4>

                    {currentReport.mispronouncedWords && currentReport.mispronouncedWords.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentReport.mispronouncedWords.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-slate-900 dark:text-white dir-ltr">
                                  {item.word}
                                </span>
                                {item.ipa && (
                                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 dir-ltr">
                                    /{item.ipa}/
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handlePlayAudio(item.word, 1.0)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-all cursor-pointer"
                                  title="استمع للنطق الصحيح"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePlayAudio(item.word, 0.7)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
                                  title="استمع ببطء"
                                >
                                  <Volume1 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="text-xs space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-rose-700 dark:text-rose-400 font-bold">
                                  ❌ ما تم سماعه: {item.userSoundAr || "غير واضح"}
                                </span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                  ✅ النطق الصحيح: {item.correctPhoneticAr}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium bg-white/80 dark:bg-slate-800/80 p-2 rounded-xl border border-rose-100 dark:border-rose-900/50">
                                💡 {item.phoneticTip}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>رائع جداً! نطقك كان سليماً ومخارج الحروف واضحة للغاية دون أخطاء بارزة.</span>
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: Grammar & Sentence Restructuring */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span>تصحيح القواعد وصياغة الجمل (Grammar & Phrasing):</span>
                    </h4>

                    {currentReport.grammarCorrections && currentReport.grammarCorrections.length > 0 ? (
                      <div className="space-y-3">
                        {currentReport.grammarCorrections.map((corr, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 space-y-2 text-xs"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block">❌ ما قلته:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200 dir-ltr mt-0.5">"{corr.original}"</p>
                              </div>
                              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/60">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">✅ الصياغة المثالية:</span>
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <p className="font-bold text-emerald-700 dark:text-emerald-300 dir-ltr">"{corr.improved}"</p>
                                  <button
                                    onClick={() => handlePlayAudio(corr.improved)}
                                    className="text-emerald-600 hover:scale-110 transition-transform cursor-pointer"
                                    title="استمع للصياغة"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-indigo-900 dark:text-indigo-200 font-medium pt-1">
                              📖 {corr.explanationAr}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>ممتاز! تركيب الجمل والأزمنة كان متماسكاً وخالياً من الأخطاء القواعدية.</span>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: Strengths & Improvement Tips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>نقاط القوة في أدائك:</span>
                      </span>
                      <ul className="space-y-1 text-xs text-emerald-950 dark:text-emerald-200 font-medium">
                        {currentReport.strengths.map((str, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                      <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span>نصائح ومجالات للتطوير:</span>
                      </span>
                      <ul className="space-y-1 text-xs text-amber-950 dark:text-amber-200 font-medium">
                        {currentReport.areasToImprove.map((tip, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* SECTION 4: Suggested Native Model Answer */}
                  <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <Award className="w-4 h-4" />
                        <span>إجابة متحدث أصلي مقترحة للتعلم:</span>
                      </span>
                      <button
                        onClick={() => handlePlayAudio(currentReport.suggestedNativeResponseEn)}
                        className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                        <span>استماع للإجابة الكاملة</span>
                      </button>
                    </div>

                    <p className="text-sm font-black text-white dir-ltr leading-relaxed">
                      "{currentReport.suggestedNativeResponseEn}"
                    </p>
                    <p className="text-xs text-slate-300 font-medium">
                      {currentReport.suggestedNativeResponseAr}
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setCurrentReport(null);
                        setUserTranscript("");
                        soundFX.playClick();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة محاولة هذا السؤال</span>
                    </button>

                    <button
                      onClick={handleNextQuestion}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>
                        {currentQuestionIndex + 1 < totalQuestionsInRound ? "الانتقال للسؤال التالي" : "إنهاء وعرض نتيجة الجولة"}
                      </span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
