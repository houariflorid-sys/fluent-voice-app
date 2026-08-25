import React from "react";
import {
  MessageSquare,
  Image,
  Bot,
  Mic,
  Flame,
  Award,
  Volume2,
  Sparkles,
  Radio,
  Video,
  LogIn,
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
} from "lucide-react";
import { LearningMode, UserProgress } from "../types";
import { User, signInWithPopup, signOut, auth, googleProvider } from "../lib/firebase";

interface NavbarProps {
  currentMode: LearningMode;
  onSelectMode: (mode: LearningMode) => void;
  progress: UserProgress;
  onOpenCustomScenario: () => void;
  currentUser: User | null;
  onUserAuthChange?: (user: User | null) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onSelectMode,
  progress,
  onOpenCustomScenario,
  currentUser,
  theme,
  onToggleTheme,
}) => {
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.warn("Auth popup:", e?.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e: any) {
      console.warn("Sign out:", e?.message);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Branding */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => onSelectMode("conversations")}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
              <Volume2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">FluentVoice</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Gemini & Live Voice
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">تعلم الإنجليزية بالصوت والصورة والمحادثة الحية</p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700">
            <button
              id="nav-conversations-btn"
              onClick={() => onSelectMode("conversations")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentMode === "conversations"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>محادثات قصيرة</span>
            </button>

            <button
              id="nav-live-voice-btn"
              onClick={() => onSelectMode("live_voice")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentMode === "live_voice"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>المحادثة الحية (Live Voice)</span>
            </button>

            <button
              id="nav-flashcards-btn"
              onClick={() => onSelectMode("flashcards")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentMode === "flashcards"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              <Image className="w-4 h-4" />
              <span>كلمات مصورة</span>
            </button>

            <button
              id="nav-pronunciation-btn"
              onClick={() => onSelectMode("pronunciation")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentMode === "pronunciation"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>مختبر النطق</span>
            </button>

            <button
              id="nav-tutor-btn"
              onClick={() => onSelectMode("tutor")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentMode === "tutor"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>المعلم الذكي</span>
            </button>

            <button
              id="nav-media-studio-btn"
              onClick={() => onSelectMode("media_studio")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentMode === "media_studio"
                  ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>استوديو الوسائط (Veo 3)</span>
            </button>
          </nav>

          {/* User Auth, XP, Streak, Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Custom AI Scenario Action */}
            <button
              id="ai-create-scenario-btn"
              onClick={onOpenCustomScenario}
              className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 hover:bg-blue-100 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>سيناريو مخصص</span>
            </button>

            {/* Streak */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-xs">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
              <span>{progress.streakDays || 1} يوم</span>
            </div>

            {/* XP */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold shadow-xs">
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{progress.xp} XP</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer flex items-center justify-center"
              title={theme === "dark" ? "التحويل للوضع الفاتح" : "التحويل للوضع المظلم"}
              aria-label="تبديل وضع الألوان"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400 rotate-0 hover:rotate-90 transition-transform duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 -rotate-12 hover:rotate-0 transition-transform duration-300" />
              )}
            </button>

            {/* Firebase User Auth */}
            {currentUser ? (
              <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-700">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {currentUser.displayName?.[0] || <UserIcon className="w-4 h-4" />}
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all text-xs font-bold cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>حفظ التقدم</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto gap-1 text-[11px]">
          <button
            onClick={() => onSelectMode("conversations")}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg font-bold shrink-0 ${
              currentMode === "conversations"
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>محادثات</span>
          </button>

          <button
            onClick={() => onSelectMode("live_voice")}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg font-bold shrink-0 ${
              currentMode === "live_voice"
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Radio className="w-4 h-4 text-rose-500" />
            <span>محادثة حية</span>
          </button>

          <button
            onClick={() => onSelectMode("flashcards")}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg font-bold shrink-0 ${
              currentMode === "flashcards"
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Image className="w-4 h-4" />
            <span>كلمات مصورة</span>
          </button>

          <button
            onClick={() => onSelectMode("pronunciation")}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg font-bold shrink-0 ${
              currentMode === "pronunciation"
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>نطق</span>
          </button>

          <button
            onClick={() => onSelectMode("tutor")}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg font-bold shrink-0 ${
              currentMode === "tutor"
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>المعلم الذكي</span>
          </button>

          <button
            onClick={() => onSelectMode("media_studio")}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg font-bold shrink-0 ${
              currentMode === "media_studio"
                ? "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-slate-800"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>استوديو Veo 3</span>
          </button>
        </div>
      </div>
    </header>
  );
};
