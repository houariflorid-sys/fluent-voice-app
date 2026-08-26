import { FlashcardItem } from "../types";

// Common category image mappings (reliable Unsplash images with direct keywords)
export const CATEGORY_IMAGES: Record<string, string> = {
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
  travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
  work: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
  health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80",
  emotions: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=600&q=80",
  general: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
};

// Built-in lexical dictionary for common Arabic & English terms
export const COMMON_DICTIONARY: Record<
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
    imageUrl: string;
  }
> = {
  كعبة: {
    word: "Kaaba",
    partOfSpeech: "noun",
    ipa: "/ˈkɑː.bə/",
    arabicPhonetics: "كَابَا / الكَعْبَة",
    arabicMeaning: "الكعبة المشرفة في مكة المكرمة",
    category: "travel",
    exampleEn: "Millions of Muslims visit the holy Kaaba in Mecca every year.",
    exampleAr: "يزور ملايين المسلمين الكعبة المشرفة في مكة المكرمة كل عام.",
    imageUrl: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=600&q=80",
  },
  الكعبة: {
    word: "Kaaba",
    partOfSpeech: "noun",
    ipa: "/ˈkɑː.bə/",
    arabicPhonetics: "كَابَا / الكَعْبَة",
    arabicMeaning: "الكعبة المشرفة في مكة المكرمة",
    category: "travel",
    exampleEn: "The Kaaba is the sacred center of Islamic pilgrimage.",
    exampleAr: "الكعبة المشرفة هي قبلة ومركز الحج في العالم الإسلامي.",
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
    arabicMeaning: "ماء / مياه عذبة",
    category: "food",
    exampleEn: "Pure water is essential for all living creatures.",
    exampleAr: "الماء النقي ضروري لجميع الكائنات الحية.",
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80",
  },
  sun: {
    word: "Sun",
    partOfSpeech: "noun",
    ipa: "/sʌn/",
    arabicPhonetics: "صَن",
    arabicMeaning: "الشمس",
    category: "general",
    exampleEn: "The sun rises in the east every morning.",
    exampleAr: "تشرق الشمس في الشرق كل صباح.",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
  },
  شمس: {
    word: "Sun",
    partOfSpeech: "noun",
    ipa: "/sʌn/",
    arabicPhonetics: "صَن",
    arabicMeaning: "الشمس",
    category: "general",
    exampleEn: "The warm sun gives light and energy to the earth.",
    exampleAr: "تمنح الشمس الدافئة الضوء والطاقة للأرض.",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
  },
  book: {
    word: "Book",
    partOfSpeech: "noun",
    ipa: "/bʊk/",
    arabicPhonetics: "بُوك",
    arabicMeaning: "كتاب",
    category: "work",
    exampleEn: "I love reading an inspiring book before sleep.",
    exampleAr: "أحب قراءة كتاب ملهم قبل النوم.",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
  },
  كتاب: {
    word: "Book",
    partOfSpeech: "noun",
    ipa: "/bʊk/",
    arabicPhonetics: "بُوك",
    arabicMeaning: "كتاب",
    category: "work",
    exampleEn: "A good book can open your mind to new ideas.",
    exampleAr: "يمكن للكتاب الجيد أن يفتح عقلك لأفكار جديدة.",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
  },
  coffee: {
    word: "Coffee",
    partOfSpeech: "noun",
    ipa: "/ˈkɒf.i/",
    arabicPhonetics: "كُوفِي",
    arabicMeaning: "قهوة",
    category: "food",
    exampleEn: "I start my morning with a warm cup of coffee.",
    exampleAr: "أبدأ صباحي بكوب دافئ من القهوة.",
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80",
  },
  قهوة: {
    word: "Coffee",
    partOfSpeech: "noun",
    ipa: "/ˈkɒf.i/",
    arabicPhonetics: "كُوفِي",
    arabicMeaning: "قهوة",
    category: "food",
    exampleEn: "Fresh coffee aroma fills the room every morning.",
    exampleAr: "رائحة القهوة الطازجة تملأ المكان كل صباح.",
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80",
  },
  car: {
    word: "Car",
    partOfSpeech: "noun",
    ipa: "/kɑːr/",
    arabicPhonetics: "كَار",
    arabicMeaning: "سيارة / مركبة",
    category: "travel",
    exampleEn: "Electric cars are becoming very popular worldwide.",
    exampleAr: "أصبحت السيارات الكهربائية شائعة جداً حول العالم.",
    imageUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=600&q=80",
  },
  سيارة: {
    word: "Car",
    partOfSpeech: "noun",
    ipa: "/kɑːr/",
    arabicPhonetics: "كَار",
    arabicMeaning: "سيارة / مركبة",
    category: "travel",
    exampleEn: "He drives his car to work every morning.",
    exampleAr: "يقود سيارته إلى العمل كل صباح.",
    imageUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=600&q=80",
  },
  travel: {
    word: "Travel",
    partOfSpeech: "verb",
    ipa: "/ˈtræv.əl/",
    arabicPhonetics: "ترَافِل",
    arabicMeaning: "سفر / يسافر",
    category: "travel",
    exampleEn: "Traveling allows you to discover new cultures and friends.",
    exampleAr: "السفر يتيح لك اكتشاف ثقافات وأصدقاء جدد.",
    imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
  },
  سفر: {
    word: "Travel",
    partOfSpeech: "noun",
    ipa: "/ˈtræv.əl/",
    arabicPhonetics: "ترَافِل",
    arabicMeaning: "سفر / رحلة",
    category: "travel",
    exampleEn: "Travel expands the mind and enriches life experiences.",
    exampleAr: "السفر يوسع الأفق ويثري تجارب الحياة.",
    imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
  },
  كرم: {
    word: "Generosity",
    partOfSpeech: "noun",
    ipa: "/ˌdʒen.əˈrɒs.ə.ti/",
    arabicPhonetics: "جِينِيرُوسِتِي",
    arabicMeaning: "الكرم والجود",
    category: "emotions",
    exampleEn: "True generosity comes from the heart.",
    exampleAr: "الكرم الحقيقي ينبع من القلب.",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
  },
};

// Simple phonetic transliterator for English to Arabic
export function generateArabicPhonetics(word: string): string {
  const map: Record<string, string> = {
    th: "ث",
    sh: "ش",
    ch: "تش",
    ph: "ف",
    kh: "خ",
    gh: "غ",
    ee: "ي",
    oo: "و",
    ea: "ي",
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
 * Free online translator fallback for Arabic to English words
 */
async function translateArabicToEnglish(arabicText: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(arabicText)}&langpair=ar|en`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.responseData?.translatedText) {
        const trans = data.responseData.translatedText.trim();
        // Remove punctuation
        return trans.replace(/[^a-zA-Z\s-]/g, "").trim();
      }
    }
  } catch (e) {
    console.warn("MyMemory translation fallback error:", e);
  }
  return "";
}

/**
 * Robust Client-Side Educational Flashcard Builder
 * Guaranteed to generate beautiful educational flashcards even offline or without external Gemini API keys on Render.
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

  // Check if query is in Arabic
  const isArabicQuery = /[\u0600-\u06FF]/.test(trimmed);
  let englishWord = isArabicQuery ? "" : trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  let arabicMeaning = isArabicQuery ? trimmed : `المعنى والدلالة الخاصة بـ ${englishWord}`;

  if (isArabicQuery) {
    // Attempt online translation
    const translated = await translateArabicToEnglish(trimmed);
    if (translated) {
      englishWord = translated.charAt(0).toUpperCase() + translated.slice(1).toLowerCase();
    } else {
      // Fallback transliteration
      englishWord = "Term";
    }
  }

  const cleanLower = englishWord.toLowerCase();
  let ipa = `/${cleanLower}/`;
  let partOfSpeech = "noun";
  let arabicPhonetics = generateArabicPhonetics(cleanLower);

  // Query free public English dictionary for precise IPA & definitions
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanLower)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        const entry = data[0];
        if (entry.word) {
          englishWord = entry.word.charAt(0).toUpperCase() + entry.word.slice(1);
        }
        if (entry.phonetic) ipa = entry.phonetic;
        else if (entry.phonetics && entry.phonetics[0]?.text) ipa = entry.phonetics[0].text;

        if (entry.meanings && entry.meanings[0]) {
          partOfSpeech = entry.meanings[0].partOfSpeech || "noun";
          const firstDef = entry.meanings[0].definitions?.[0];
          if (firstDef?.definition && !isArabicQuery) {
            arabicMeaning = `${englishWord}: ${firstDef.definition}`;
          }
        }
      }
    }
  } catch {
    // Continue
  }

  // Determine category
  let category = "general";
  const foodKeywords = ["eat", "drink", "food", "tea", "water", "coffee", "apple", "bread", "طعام", "شراب", "ماء", "أكل", "قهوة"];
  const travelKeywords = ["go", "flight", "hotel", "travel", "car", "city", "kaaba", "mecca", "سفر", "سياحة", "فندق", "كعبة", "مكة", "سيارة"];
  const workKeywords = ["work", "office", "meeting", "job", "email", "business", "عمل", "وظيفة", "مكتب", "كتاب", "book"];
  const techKeywords = ["tech", "computer", "phone", "app", "screen", "code", "تقنية", "حاسوب", "هاتف"];

  if (foodKeywords.some((k) => lower.includes(k) || cleanLower.includes(k))) category = "food";
  else if (travelKeywords.some((k) => lower.includes(k) || cleanLower.includes(k))) category = "travel";
  else if (workKeywords.some((k) => lower.includes(k) || cleanLower.includes(k))) category = "work";
  else if (techKeywords.some((k) => lower.includes(k) || cleanLower.includes(k))) category = "tech";

  const fallbackImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.general;

  return {
    id: "fc-ai-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    word: englishWord,
    partOfSpeech,
    ipa,
    arabicPhonetics,
    arabicMeaning,
    category,
    imageUrl: fallbackImage,
    exampleEn: `We use "${englishWord}" frequently in modern conversations.`,
    exampleAr: `نستخدم كلمة "${englishWord}" (${arabicMeaning}) كثيراً في المحادثات الإنجليزية.`,
    difficulty: "intermediate",
    isAiGenerated: true,
    createdAt: Date.now(),
  };
}