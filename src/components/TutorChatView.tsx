import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Volume1,
  Sparkles,
  Bot,
  User,
  Globe,
  MapPin,
  ShieldCheck,
  Zap,
  GraduationCap,
  Briefcase,
  Smile,
  ExternalLink,
  Languages,
} from "lucide-react";
import { ChatMessage } from "../types";
import { playEnglishAudio, stopEnglishAudio, soundFX, createSpeechRecognizer } from "../utils/audio";

interface TutorChatViewProps {
  onAddXp: (amount: number) => void;
}

export const TutorChatView: React.FC<TutorChatViewProps> = ({ onAddXp }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      content: "Hello! I am your AI English conversation mentor. Choose a role or topic, and let's practice speaking naturally!",
      arabicTranslation: "مرحباً! أنا موجهك الذكي لمحادثة اللغة الإنجليزية. اختر دور المعلم أو الموضوع، ودعنا نتدرب على التحدث بطلاقة!",
      arabicPhonetics: "هيلو! آي آم يور إيه آي إنجلش كونفرسيشن مينتور. تشوز إيه رول أور توبيك، آند ليتس براكتس سبيكينغ ناتشورالي!",
      feedbackOnUser: "أهلاً بك! يمكنك التبديل بين الأدوار التخصصية (IELTS، إدارة أعمال، سارة الودودة، صديق محلي) واستخدام البحث الحي والخرائط.",
      suggestedReplies: [
        { english: "I want to practice ordering coffee.", arabic: "أريد التدرب على طلب قهوة." },
        { english: "Let's do an IELTS speaking part 1 test.", arabic: "دعنا نجري اختبار آيلتس الجزء الأول." },
        { english: "Can you recommend top sights in London?", arabic: "هل يمكنك ترشيح معالم بارزة في لندن؟" },
      ],
      timestamp: Date.now(),
    },
  ]);

  const [inputVal, setInputVal] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [tutorRole, setTutorRole] = useState<string>("sara_supportive");
  const [enableSearch, setEnableSearch] = useState<boolean>(false);
  const [enableMaps, setEnableMaps] = useState<boolean>(false);
  const [modelChoice, setModelChoice] = useState<string>("auto");
  const [showArabic, setShowArabic] = useState<boolean>(true);
  const [showPhonetics, setShowPhonetics] = useState<boolean>(true);
  const [userLevel, setUserLevel] = useState<string>("beginner");

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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

  const handlePlayMessageAudio = (text: string, rate: number = 1.0) => {
    soundFX.playClick();
    playEnglishAudio(text, { rate });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isLoading) return;

    soundFX.playClick();
    setInputVal("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const formattedHistory = newHistory.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: formattedHistory,
          userLevel,
          tutorRole,
          enableSearch,
          enableMaps,
          modelChoice,
        }),
      });

      if (!res.ok) {
        throw new Error("Chat request failed");
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.english || "That's great! Tell me more.",
        arabicTranslation: data.arabicTranslation,
        arabicPhonetics: data.arabicPhonetics,
        feedbackOnUser: data.feedbackOnUser,
        suggestedReplies: data.suggestedReplies,
        keyVocabulary: data.keyVocabulary,
        groundingSources: data.groundingSources,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      onAddXp(30);
      soundFX.playSuccess();

      // Auto-play audio of response
      playEnglishAudio(assistantMsg.content, { rate: 1.0 });
    } catch (err) {
      console.error("Chat error:", err);
      const fallbackMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "That sounds very interesting! How do you usually spend your weekend?",
        arabicTranslation: "هذا يبدو مثيراً جداً للاهتمام! كيف تقضي عطلة نهاية الأسبوع عادة؟",
        arabicPhonetics: "ذات ساوندز فيري إنترستينغ! هاو دو يو يوجولي سبيند يور ويكند؟",
        feedbackOnUser: "جملة إنجليزية جيدة جداً وواضحة المعنى!",
        suggestedReplies: [
          { english: "I like spending time with my family.", arabic: "أحب قضاء الوقت مع عائلتي." },
          { english: "I usually travel or explore new places.", arabic: "عادةً ما أسافر أو أستكشف أماكن جديدة." },
        ],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      playEnglishAudio(fallbackMsg.content, { rate: 1.0 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoiceInput = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const recognizer = createSpeechRecognizer(
      (transcript) => {
        setInputVal(transcript);
      },
      () => {
        setIsRecording(false);
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
      } catch (e) {
        console.warn(e);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Role & Model Controls Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">المعلم الذكي متعدد الأدوار</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Gemini 3.1 Pro / Flash
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                اختر شخصية المعلم والقدرات الحية (البحث والخرائط) لتعلم واقعي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <button
              onClick={() => setShowArabic(!showArabic)}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                showArabic
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                  : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>الترجمة</span>
            </button>
            <button
              onClick={() => setShowPhonetics(!showPhonetics)}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                showPhonetics
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                  : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
              }`}
            >
              <span>النطق</span>
            </button>
          </div>
        </div>

        {/* Roles Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: "sara_supportive", label: "سارة (معلمة ودودة)", icon: Smile },
            { id: "ielts_examiner", label: "مختبر IELTS (أكاديمي)", icon: GraduationCap },
            { id: "business_coach", label: "مدرب أعمال (رسمي)", icon: Briefcase },
            { id: "native_friend", label: "صديق محلي (عامي)", icon: Zap },
          ].map((role) => {
            const Icon = role.icon;
            const isSelected = tutorRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setTutorRole(role.id)}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{role.label}</span>
              </button>
            );
          })}
        </div>

        {/* Realtime Grounding Toggles (Search & Maps) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="text-slate-400 dark:text-slate-500 font-medium">أدوات السياق الحي:</span>
          <button
            onClick={() => {
              setEnableSearch(!enableSearch);
              if (!enableSearch) setEnableMaps(false);
            }}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
              enableSearch
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>بحث جوجل الحي (Search Grounding)</span>
          </button>

          <button
            onClick={() => {
              setEnableMaps(!enableMaps);
              if (!enableMaps) setEnableSearch(false);
            }}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
              enableMaps
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>خرائط جوجل للأماكن (Maps Grounding)</span>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-6 min-h-[480px] max-h-[560px] overflow-y-auto space-y-6">
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs text-xs font-black ${
                  isUser
                    ? "bg-slate-900 dark:bg-blue-600 text-white"
                    : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white"
                }`}
              >
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 space-y-3 shadow-xs ${
                  isUser
                    ? "bg-slate-900 dark:bg-blue-600 text-white rounded-tr-none"
                    : "bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white rounded-tl-none"
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400">المعلم الموجه</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePlayMessageAudio(msg.content, 1.0)}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 transition-all cursor-pointer"
                        title="استماع عادي"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePlayMessageAudio(msg.content, 0.75)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                        title="استماع بطيء"
                      >
                        <Volume1 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-base sm:text-lg font-bold leading-relaxed dir-ltr">
                  {msg.content}
                </p>

                {!isUser && showPhonetics && msg.arabicPhonetics && (
                  <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900">
                    <span className="font-bold text-[10px] text-indigo-900 dark:text-indigo-200 ml-1">النطق: </span>
                    {msg.arabicPhonetics}
                  </div>
                )}

                {!isUser && showArabic && msg.arabicTranslation && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800">
                    {msg.arabicTranslation}
                  </p>
                )}

                {!isUser && msg.feedbackOnUser && (
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{msg.feedbackOnUser}</span>
                  </div>
                )}

                {/* Grounding Citations */}
                {!isUser && msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">مصادر موثقة ومواقع حية:</span>
                    <div className="flex flex-wrap gap-2">
                      {msg.groundingSources.map((source, sIdx) => (
                        <a
                          key={sIdx}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:border-blue-300 flex items-center gap-1 font-bold transition-all text-[11px]"
                        >
                          {source.type === "maps" ? <MapPin className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                          <span className="truncate max-w-[160px]">{source.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {!isUser && msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">اقتراحات يمكنك قولها:</span>
                    <div className="flex flex-col gap-1.5">
                      {msg.suggestedReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(reply.english)}
                          className="text-right p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all text-xs group cursor-pointer"
                        >
                          <div className="font-bold text-slate-800 dark:text-slate-200 dir-ltr group-hover:text-blue-700 dark:group-hover:text-blue-400">
                            "{reply.english}"
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {reply.arabic}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>المعلم يفكر ويحلل صياغة الإجابة...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-3 sm:p-4 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            className={`p-3 rounded-2xl transition-all shadow-xs cursor-pointer ${
              isRecording
                ? "bg-rose-600 text-white animate-bounce"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            }`}
            title={isRecording ? "إيقاف التسجيل" : "تحدث بصوتك بالإنجليزية"}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={
              isRecording
                ? "جارِ الاستماع لصوتك بالإنجليزية..."
                : "اكتب رسالتك بالإنجليزية أو اضغط المايك للتحدث..."
            }
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dir-ltr"
          />

          <button
            type="submit"
            disabled={!inputVal.trim() || isLoading}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">إرسال</span>
          </button>
        </form>
      </div>
    </div>
  );
};
