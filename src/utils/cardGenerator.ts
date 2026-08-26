import { FlashcardItem } from "../types";

// Common category image mappings
const CATEGORY_IMAGES: Record<string, string> = {
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
  travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
  work: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
  health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80",
  emotions: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=600&q=80",
  general: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
};

// Built-in lexical knowledge for common terms & transliteration
const COMMON_DICTIONARY: Record<
  string,
  {
    word: string;
    partOfSpeech: string;
    ipa: string;
    arabicPhonetics: string;
    arabicMeaning: string;
    category: string;
    exampleEn: string;
    exampleAr: string;
    imageUrl?: string;
  }
> = {
  water: {
    word: "Water",
    partOfSpeech: "noun",
    ipa: "/ˈwɔː.tər/",
    arabicPhonetics: "ووتَر",
    arabicMeaning: "ماء / مياه",
    category: "food",
    exampleEn: "Drink plenty of water every day to stay healthy.",
    exampleAr: "اشرب الكثير من الماء يومياً للحفاظ على صحتك.",
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80",
  },
  ماء: {
    word: "Water",
    partOfSpeech: "noun",
    ipa: "/ˈwɔː.tər/",
    arabicPhonetics: "ووتَر",
    arabicMeaning: "ماء / مياه",
    category: "food",
    exampleEn: "Water is essential for all living creatures.",
    exampleAr: "الماء ضروري لجميع الكائنات الحية.",
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80",
  },
  كعبة: {
    word: "Kaaba",
    partOfSpeech: "noun",
    ipa: "/ˈkɑː.bə/",
    arabicPhonetics: "كَابَا / الكَعْبَة",
    arabicMeaning: "الكعبة المشرفة في مكة المكرمة",
    category: "travel",
    exampleEn: "Millions of Muslims visit the holy Kaaba every year.",
    exampleAr: "يزور ملايين المسلمين الكعبة المشرفة كل عام.",
    imageUrl: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=600&q=80",
  },
  kaaba: {
    word: "Kaaba",
    partOfSpeech: "noun",
    ipa: "/ˈkɑː.bə/",
    arabicPhonetics: "كَابَا / الكَعْبَة",
    arabicMeaning: "الكعبة المشرفة",
    category: "travel",
    exampleEn: "The Kaaba is the holiest site in Islam.",
    exampleAr: "الكعبة هي أقدس مكان في الإسلام.",
    imageUrl: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=600&q=80",
  },
  sun: {
    word: "Sun",
    partOfSpeech: "noun",
    ipa: "/sʌn/",
    arabicPhonetics: "صَن",
    arabicMeaning: "شمس",
    category: "general",
    exampleEn: "The sun rises in the east every morning.",
    exampleAr: "تشرق الشمس في الشرق كل صباح.",
  },
  book: {
    word: "Book",
    partOfSpeech: "noun",
    ipa: "/bʊk/",
    arabicPhonetics: "بُوك",
    arabicMeaning: "كتاب",
    category: "work",
    exampleEn: "I love reading a good book before bedtime.",
    exampleAr: "أحب قراءة كتاب جيد قبل النوم.",
  },
  coffee: {
    word: "Coffee",
    partOfSpeech: "noun",
    ipa: "/ˈkɒf.i/",
    arabicPhonetics: "كُوفِي",
    arabicMeaning: "قهوة",
    category: "food",
    exampleEn: "I start my morning with a fresh cup of coffee.",
    exampleAr: "أبدأ صباحي بكوب من القهوة الطازجة.",
  },
  hospitality: {
    word: "Hospitality",
    partOfSpeech: "noun",
    ipa: "/ˌhɒs.pɪˈtæl.ə.ti/",
    arabicPhonetics: "هُوسْبِيتَالِتِي",
    arabicMeaning: "حُسن الضيافة / الكرم",
    category: "emotions",
    exampleEn: "Arab cultures are well known for generous hospitality.",
    exampleAr: "تشتهر الثقافات العربية بكرم الضيافة وحسن الاستقبال.",
  },
  resilience: {
    word: "Resilience",
    partOfSpeech: "noun",
    ipa: "/rɪˈzɪl.jəns/",
    arabicPhonetics: "رِيزِيلِيَنَس",
    arabicMeaning: "المرونة والقدرة على التكيف والتحدي",
    category: "emotions",
    exampleEn: "She showed great resilience during difficult times.",
    exampleAr: "أظهرت مرونة وقوة تحمل كبيرة في الأوقات الصعبة.",
  },
};

// Simple phonetic transliterator for English to Arabic
function generateArabicPhonetics(word: string): string {
  const map: Record<string, string> = {
    th: "ث",
    sh: "ش",
    ch: "تش",
    ph: "ف",
    kh: "خ",
    gh: "غ",
    a: "أ",
    b: "ب",
    c: "ك",
    d: "د",
    e: "ي",
    f: "ف",
    g: "ج",
    h: "هـ",
    i: "ي",
    j: "ج",
    k: "ك",
    l: "ل",
    m: "م",
    n: "ن",
    o: "و",
    p: "ب",
    q: "ك",
    r: "ر",
    s: "س",
    t: "ت",
    u: "يو",
    v: "ف",
    w: "و",
    x: "كس",
    y: "ي",
    z: "ز",
  };

  let clean = word.toLowerCase().trim();
  let result = "";
  for (let i = 0; i < clean.length; i++) {
    if (i < clean.length - 1 && map[clean.substr(i, 2)]) {
      result += map[clean.substr(i, 2)];
      i++;
    } else if (map[clean[i]]) {
      result += map[clean[i]];
    } else {
      result += clean[i];
    }
  }
  return result || word;
}

/**
 * Robust Client-Side Educational Flashcard Builder
 * Used when backend network is unreachable, missing GEMINI_API_KEY on external hosts (Render/Vercel), or as an instant backup.
 */
export async function createClientFallbackFlashcard(query: string): Promise<FlashcardItem> {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct dictionary match
  if (COMMON_DICTIONARY[lower]) {
    const item = COMMON_DICTIONARY[lower];
    return {
      id: "fc-ai-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      word: item.word,
      partOfSpeech: item.partOfSpeech,
      ipa: item.ipa,
      arabicPhonetics: item.arabicPhonetics,
      arabicMeaning: item.arabicMeaning,
      category: item.category,
      imageUrl: item.imageUrl || CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES.general,
      exampleEn: item.exampleEn,
      exampleAr: item.exampleAr,
      difficulty: "intermediate",
      isAiGenerated: true,
      createdAt: Date.now(),
    };
  }

  // 2. Query free public dictionary if Latin word
  const isEnglishWord = /^[a-zA-Z\s-]+$/.test(trimmed);
  let canonicalWord = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  let ipa = `/${lower}/`;
  let partOfSpeech = "noun";
  let definition = isEnglishWord ? `المعنى والدلالة الخاصة بـ ${canonicalWord}` : trimmed;
  let arabicPhonetics = isEnglishWord ? generateArabicPhonetics(lower) : trimmed;

  if (isEnglishWord) {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lower)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          const entry = data[0];
          canonicalWord = entry.word ? entry.word.charAt(0).toUpperCase() + entry.word.slice(1) : canonicalWord;
          if (entry.phonetic) ipa = entry.phonetic;
          else if (entry.phonetics && entry.phonetics[0]?.text) ipa = entry.phonetics[0].text;

          if (entry.meanings && entry.meanings[0]) {
            partOfSpeech = entry.meanings[0].partOfSpeech || "noun";
            const firstDef = entry.meanings[0].definitions?.[0];
            if (firstDef?.definition) {
              definition = `${canonicalWord}: ${firstDef.definition}`;
            }
          }
        }
      }
    } catch {
      // Continue to heuristic generation
    }
  }

  // Choose appropriate category
  let category = "general";
  const foodKeywords = ["eat", "drink", "food", "tea", "water", "apple", "bread", "طعام", "شراب", "ماء", "أكل"];
  const travelKeywords = ["go", "flight", "hotel", "travel", "car", "city", "سفر", "سياحة", "فندق", "كعبة", "مكة"];
  const workKeywords = ["work", "office", "meeting", "job", "email", "business", "عمل", "وظيفة", "مكتب"];
  const techKeywords = ["tech", "computer", "phone", "app", "screen", "code", "تقنية", "حاسوب", "هاتف"];

  if (foodKeywords.some((k) => lower.includes(k))) category = "food";
  else if (travelKeywords.some((k) => lower.includes(k))) category = "travel";
  else if (workKeywords.some((k) => lower.includes(k))) category = "work";
  else if (techKeywords.some((k) => lower.includes(k))) category = "tech";

  const fallbackImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.general;

  return {
    id: "fc-ai-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    word: canonicalWord,
    partOfSpeech,
    ipa,
    arabicPhonetics,
    arabicMeaning: definition,
    category,
    imageUrl: fallbackImage,
    exampleEn: `We frequently use "${canonicalWord}" in daily spoken English.`,
    exampleAr: `نستخدم كلمة "${canonicalWord}" بشكل متكرر في المحادثات اليومية.`,
    difficulty: "intermediate",
    isAiGenerated: true,
    createdAt: Date.now(),
  };
}
