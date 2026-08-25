export type LearningMode = 
  | "conversations" 
  | "flashcards" 
  | "tutor" 
  | "live_voice" 
  | "pronunciation" 
  | "media_studio";

export interface DialogueLine {
  id: number;
  speaker: string;
  speakerRoleAr?: string;
  avatar?: string;
  english: string;
  arabic: string;
  phonetics: string; // e.g. "كود آي هاف أ كابوتشينو بليز؟"
  ipa?: string;
}

export interface Character {
  name: string;
  roleAr: string;
  avatar: string;
  color?: string;
}

export interface VocabWord {
  id?: string;
  word: string;
  partOfSpeech?: string;
  phonetic: string;
  arabicMeaning: string;
  example: string;
  exampleAr?: string;
  imageUrl?: string;
  category?: string;
}

export interface Scenario {
  id: string;
  titleEn: string;
  titleAr: string;
  category: "daily" | "travel" | "work" | "food" | "shopping" | "health" | "social";
  difficulty: "beginner" | "intermediate" | "advanced";
  imageUrl: string;
  iconName: string;
  sceneDescriptionAr: string;
  sceneDescriptionEn?: string;
  characters: Character[];
  dialogue: DialogueLine[];
  vocabulary: VocabWord[];
  speakingTipAr: string;
  isCustom?: boolean;
}

export interface GroundingSource {
  title: string;
  url: string;
  type: "search" | "maps";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  arabicTranslation?: string;
  arabicPhonetics?: string;
  feedbackOnUser?: string;
  suggestedReplies?: { english: string; arabic: string }[];
  keyVocabulary?: VocabWord[];
  groundingSources?: GroundingSource[];
  timestamp: number;
}

export interface FlashcardItem {
  id: string;
  word: string;
  partOfSpeech: string;
  ipa: string;
  arabicPhonetics: string;
  arabicMeaning: string;
  category: string;
  imageUrl: string;
  exampleEn: string;
  exampleAr: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface PronunciationChallenge {
  id: string;
  phrase: string;
  phonetics: string;
  arabicMeaning: string;
  focusSoundAr: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  tipAr: string;
}

export interface UserProgress {
  xp: number;
  streakDays: number;
  completedScenarios: string[];
  masteredWords: string[];
  conversationsCount: number;
  lastActiveDate: string;
  savedCreations?: number;
}

export interface GeneratedMediaItem {
  id: string;
  type: "image" | "video" | "audio_transcription";
  prompt: string;
  url?: string;
  transcription?: string;
  createdAt: number;
  status: "completed" | "processing" | "failed";
}

export interface LiveChallengeTargetWord {
  word: string;
  arabicMeaning: string;
  phoneticAr: string;
}

export interface LiveChallengeQuestion {
  id: string;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  questionEn: string;
  questionAr: string;
  questionPhonetics: string;
  contextDescriptionAr: string;
  targetKeywords: LiveChallengeTargetWord[];
  sampleGoodAnswerEn: string;
  sampleGoodAnswerAr: string;
  sampleGoodAnswerPhonetic: string;
  speakingTimeLimitSeconds?: number;
}

export interface MispronouncedWordDetail {
  word: string;
  userSoundAr: string;
  correctPhoneticAr: string;
  ipa?: string;
  phoneticTip: string;
}

export interface GrammarCorrectionDetail {
  original: string;
  improved: string;
  explanationAr: string;
}

export interface LiveChallengeEvaluationReport {
  overallScore: number; // 0-100
  pronunciationScore: number; // 0-100
  fluencyScore: number; // 0-100
  grammarScore: number; // 0-100
  vocabularyScore: number; // 0-100
  isPassed: boolean;
  userTranscript: string;
  summaryFeedbackAr: string;
  mispronouncedWords: MispronouncedWordDetail[];
  grammarCorrections: GrammarCorrectionDetail[];
  strengths: string[];
  areasToImprove: string[];
  suggestedNativeResponseEn: string;
  suggestedNativeResponseAr: string;
  xpEarned: number;
  createdAt?: number;
}
