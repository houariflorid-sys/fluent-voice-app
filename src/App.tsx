import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { ConversationView } from "./components/ConversationView";
import { FlashcardsView } from "./components/FlashcardsView";
import { PronunciationView } from "./components/PronunciationView";
import { TutorChatView } from "./components/TutorChatView";
import { LiveVoiceView } from "./components/LiveVoiceView";
import { MediaStudioView } from "./components/MediaStudioView";
import { ScenarioCreatorModal } from "./components/ScenarioCreatorModal";
import { SCENARIOS, FLASHCARDS, PRONUNCIATION_CHALLENGES } from "./data/lessonsData";
import { LearningMode, Scenario, UserProgress } from "./types";
import { auth, onAuthStateChanged, User, db } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const INITIAL_PROGRESS: UserProgress = {
  xp: 150,
  streakDays: 3,
  completedScenarios: ["cafe-order"],
  masteredWords: ["fc-1", "fc-2"],
  conversationsCount: 5,
  lastActiveDate: new Date().toISOString().slice(0, 10),
};

export default function App() {
  const [currentMode, setCurrentMode] = useState<LearningMode>("conversations");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = localStorage.getItem("fluent_theme");
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Apply theme class to <html> and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("fluent_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    const saved = localStorage.getItem("fluent_scenarios");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed : SCENARIOS;
      } catch (e) {
        return SCENARIOS;
      }
    }
    return SCENARIOS;
  });

  const [selectedScenario, setSelectedScenario] = useState<Scenario>(scenarios[0] || SCENARIOS[0]);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem("fluent_progress");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_PROGRESS;
      }
    }
    return INITIAL_PROGRESS;
  });

  // Track Firebase Auth State & Cloud Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Load cloud progress from Firestore if available
        try {
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.progress) {
              setProgress(data.progress);
            }
          } else {
            // First time login - save local progress to firestore
            await setDoc(userDocRef, {
              email: user.email,
              displayName: user.displayName,
              progress,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn("Firestore sync error:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Save progress locally & to Firestore if logged in
  useEffect(() => {
    localStorage.setItem("fluent_progress", JSON.stringify(progress));

    if (currentUser) {
      const saveToFirestore = async () => {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          await setDoc(
            userDocRef,
            {
              progress,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn("Firestore autosave error:", e);
        }
      };
      saveToFirestore();
    }
  }, [progress, currentUser]);

  // Save scenarios
  useEffect(() => {
    localStorage.setItem("fluent_scenarios", JSON.stringify(scenarios));
  }, [scenarios]);

  const handleAddXp = (amount: number) => {
    setProgress((prev) => ({
      ...prev,
      xp: prev.xp + amount,
    }));
  };

  const handleMarkScenarioCompleted = (scenarioId: string) => {
    setProgress((prev) => {
      if (prev.completedScenarios.includes(scenarioId)) return prev;
      return {
        ...prev,
        completedScenarios: [...prev.completedScenarios, scenarioId],
        conversationsCount: prev.conversationsCount + 1,
      };
    });
  };

  const handleToggleMasteredWord = (wordId: string) => {
    setProgress((prev) => {
      const exists = prev.masteredWords.includes(wordId);
      return {
        ...prev,
        masteredWords: exists
          ? prev.masteredWords.filter((id) => id !== wordId)
          : [...prev.masteredWords, wordId],
      };
    });
  };

  const handleScenarioCreated = (newScenario: Scenario) => {
    setScenarios((prev) => [newScenario, ...prev]);
    setSelectedScenario(newScenario);
    setCurrentMode("conversations");
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white flex flex-col transition-colors duration-200"
    >
      {/* Navbar with Auth & Navigation */}
      <Navbar
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        progress={progress}
        onOpenCustomScenario={() => setIsCustomModalOpen(true)}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentMode === "conversations" && (
          <ConversationView
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            onSelectScenario={setSelectedScenario}
            onOpenCustomModal={() => setIsCustomModalOpen(true)}
            onAddXp={handleAddXp}
            onMarkScenarioCompleted={handleMarkScenarioCompleted}
            completedScenarios={progress.completedScenarios}
          />
        )}

        {currentMode === "live_voice" && (
          <LiveVoiceView onAddXp={handleAddXp} />
        )}

        {currentMode === "flashcards" && (
          <FlashcardsView
            flashcards={FLASHCARDS}
            masteredWords={progress.masteredWords}
            onToggleMastered={handleToggleMasteredWord}
            onAddXp={handleAddXp}
          />
        )}

        {currentMode === "pronunciation" && (
          <PronunciationView
            challenges={PRONUNCIATION_CHALLENGES}
            onAddXp={handleAddXp}
          />
        )}

        {currentMode === "tutor" && <TutorChatView onAddXp={handleAddXp} />}

        {currentMode === "media_studio" && <MediaStudioView onAddXp={handleAddXp} />}
      </main>

      {/* Custom Scenario Modal */}
      <ScenarioCreatorModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onScenarioCreated={handleScenarioCreated}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 py-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">HOUARI PHD ADRAR OUAINNA</span>
            <span>- منصة تعلم الإنجليزية بالصوت والصورة والمحادثة الذكية الحية</span>
          </div>
          <p>مدعوم بـ Google GenAI (Live API, Veo 3, Flash Image, Pro) و Firebase</p>
        </div>
      </footer>
    </div>
  );
}
