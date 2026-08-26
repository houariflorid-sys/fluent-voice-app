import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Type, Modality, GenerateVideosOperation } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Server-side Google GenAI initialization with User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// -------------------------------------------------------------
// 1. Multi-turn AI English Tutor Chat with Roles & Grounding
// Uses:
// - gemini-3.1-pro-preview for complex tasks (exam prep, academic, advanced grammar)
// - gemini-3.5-flash for general tasks & Search/Maps grounding
// - gemini-3.1-flash-lite for fast / speed-focused chat
// -------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const {
      messages,
      userLevel = "beginner",
      topic = "general",
      tutorRole = "sara_supportive", // "sara_supportive", "ielts_examiner", "native_friend", "business_coach"
      enableSearch = false,
      enableMaps = false,
      modelChoice = "auto", // "pro", "flash", "lite", "auto"
    } = req.body;

    // Determine Model selection based on user requirements
    let selectedModel = "gemini-3.5-flash";
    if (modelChoice === "pro" || tutorRole === "ielts_examiner" || tutorRole === "business_coach") {
      selectedModel = "gemini-3.1-pro-preview";
    } else if (modelChoice === "lite") {
      selectedModel = "gemini-3.1-flash-lite";
    } else {
      selectedModel = "gemini-3.5-flash";
    }

    // Role personas
    const roleInstructions: Record<string, string> = {
      sara_supportive: "You are Sara (سارة), a warm, supportive, and patient English tutor for Arabic speakers.",
      ielts_examiner: "You are an official IELTS Speaking & Academic English examiner. You provide accurate band-score criteria feedback, lexical variety tips, and cohesive phrasing.",
      native_friend: "You are Alex, a friendly native English speaker from London/New York chatting casually. You introduce natural idioms, slang, and modern cultural references.",
      business_coach: "You are Robert, a corporate executive English communications coach specializing in negotiations, boardroom presentations, and formal emails.",
    };

    const rolePrompt = roleInstructions[tutorRole] || roleInstructions.sara_supportive;

    const systemInstruction = `${rolePrompt}
Your primary mission is to teach and practice English with an Arabic speaker.

Guidelines:
1. Speak in natural, engaging English suitable for level: ${userLevel}.
2. Keep replies conversational (1-3 clear sentences).
3. If search or maps grounding is enabled, provide up-to-date real-world English context, places, or facts.
4. Output JSON containing:
   - "english": The reply in English.
   - "arabicTranslation": Translation in Arabic.
   - "arabicPhonetics": Simplified Arabic phonetics for pronunciation guide (e.g. "هاو آر يو توداي؟").
   - "feedbackOnUser": Constructive, encouraging feedback on the learner's previous turn in Arabic.
   - "suggestedReplies": 2-3 quick helpful replies the learner can say next with English & Arabic.
   - "keyVocabulary": 1-3 useful vocabulary words with phonetics, Arabic meaning, and example.
5. Topic: ${topic}.`;

    const formattedHistory = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // Setup Tools for Grounding (Search or Maps)
    const tools: any[] = [];
    if (enableMaps) {
      // Maps Grounding using gemini-3.5-flash
      selectedModel = "gemini-3.5-flash";
      tools.push({ googleMaps: {} });
    } else if (enableSearch) {
      // Search Grounding using gemini-3.5-flash
      selectedModel = "gemini-3.5-flash";
      tools.push({ googleSearch: {} });
    }

    const config: any = {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          english: { type: Type.STRING, description: "Conversational English response." },
          arabicTranslation: { type: Type.STRING, description: "Arabic translation." },
          arabicPhonetics: { type: Type.STRING, description: "Phonetic pronunciation guide in Arabic." },
          feedbackOnUser: { type: Type.STRING, description: "Feedback on user language in Arabic." },
          suggestedReplies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                english: { type: Type.STRING },
                arabic: { type: Type.STRING },
              },
              required: ["english", "arabic"],
            },
          },
          keyVocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                arabicMeaning: { type: Type.STRING },
                example: { type: Type.STRING },
              },
              required: ["word", "arabicMeaning"],
            },
          },
        },
        required: ["english", "arabicTranslation", "feedbackOnUser", "suggestedReplies"],
      },
    };

    if (tools.length > 0) {
      config.tools = tools;
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: formattedHistory.length > 0 ? formattedHistory : [{ role: "user", parts: [{ text: "Hello! Let's start practice." }] }],
      config,
    });

    const parsed = JSON.parse(response.text || "{}");

    // Extract Grounding Chunks if present
    const groundingSources: any[] = [];
    const chunks = (response.candidates?.[0]?.groundingMetadata as any)?.groundingChunks;
    if (chunks && Array.isArray(chunks)) {
      for (const chunk of chunks) {
        if (chunk.web?.uri) {
          groundingSources.push({
            title: chunk.web.title || "Web Source",
            url: chunk.web.uri,
            type: "search",
          });
        }
        if (chunk.maps?.sourceUri || chunk.maps?.uri) {
          groundingSources.push({
            title: chunk.maps.title || "Google Maps Location",
            url: chunk.maps.sourceUri || chunk.maps.uri || "",
            type: "maps",
          });
        }
      }
    }

    parsed.groundingSources = groundingSources;
    parsed.modelUsed = selectedModel;
    res.json(parsed);
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Failed to generate conversation response",
      details: error?.message || "Unknown error",
    });
  }
});

// -------------------------------------------------------------
// 2. Audio Transcription using gemini-3.5-flash
// -------------------------------------------------------------
app.post("/api/transcribe-audio", async (req, res) => {
  try {
    const { audioData, mimeType = "audio/webm" } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: "audioData base64 is required" });
    }

    const base64Clean = audioData.replace(/^data:audio\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Clean,
              mimeType: mimeType || "audio/webm",
            },
          },
          {
            text: `You are an expert English phonetics and speech transcriber.
1. Transcribe the user's spoken audio accurately into English text.
2. Provide a simplified Arabic phonetic transcription (النطق بالحروف العربية).
3. Provide the Arabic translation of what was said.
4. Highlight any pronunciation inaccuracies and provide tips for Arabic speakers.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING, description: "Transcribed English speech" },
            arabicTranslation: { type: Type.STRING, description: "Translation of the speech in Arabic" },
            arabicPhonetics: { type: Type.STRING, description: "Pronunciation in Arabic letters" },
            accuracyScore: { type: Type.INTEGER, description: "Speech clarity score 0-100" },
            pronunciationTipsAr: { type: Type.STRING, description: "Pronunciation feedback for Arabic speakers" },
          },
          required: ["transcript", "arabicTranslation", "arabicPhonetics", "accuracyScore"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({
      error: "Failed to transcribe audio",
      details: error?.message || "Unknown error",
    });
  }
});

// -------------------------------------------------------------
// 3. Create & Edit Images using gemini-3.1-flash-image-preview
// Supports Text-to-Image and Image Editing with Text Prompts
// -------------------------------------------------------------
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio = "1:1", imageSize = "1K", baseImage = null } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    let parts: any[] = [];
    if (baseImage) {
      const cleanBase64 = baseImage.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/png",
        },
      });
      parts.push({
        text: `Edit this educational visual illustration: ${prompt}. Keep it clear, vivid, high-quality, and culturally friendly for learners.`,
      });
    } else {
      parts.push({
        text: `High quality educational visual flashcard illustration for English vocabulary learning: ${prompt}. Detailed, photorealistic or polished 3D digital art style, crisp lighting.`,
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
          imageSize: imageSize || "1K",
        },
      },
    });

    let imageUrl: string | null = null;
    let descriptionText = "";

    const candidates = response.candidates?.[0]?.content?.parts || [];
    for (const part of candidates) {
      if (part.inlineData?.data) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
        descriptionText += part.text;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "No image was returned by the model", details: descriptionText });
    }

    res.json({ imageUrl, description: descriptionText, prompt });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({
      error: "Failed to generate or edit image",
      details: error?.message || "Unknown error",
    });
  }
});

// -------------------------------------------------------------
// 4. Veo 3 Video Generation (Text to Video & Image to Video)
// Uses model: veo-3.1-fast-generate-preview
// Aspect ratios: 16:9 or 9:16
// -------------------------------------------------------------
app.post("/api/generate-video", async (req, res) => {
  try {
    const { prompt, aspectRatio = "16:9", baseImage = null } = req.body;

    const payload: any = {
      model: "veo-3.1-fast-generate-preview",
      prompt: prompt || "A cinematic educational scene showing an English conversational interaction in a lively cafe",
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
      },
    };

    if (baseImage) {
      const cleanBase64 = baseImage.replace(/^data:image\/\w+;base64,/, "");
      payload.image = {
        imageBytes: cleanBase64,
        mimeType: "image/png",
      };
    }

    const operation = await ai.models.generateVideos(payload);
    res.json({ operationName: operation.name });
  } catch (error: any) {
    console.error("Video generation start error:", error);
    res.status(500).json({
      error: "Failed to start video generation",
      details: error?.message || "Unknown error",
    });
  }
});

// Video Status Poll
app.post("/api/video-status", async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: "operationName is required" });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    res.json({ done: updated.done, metadata: updated.metadata });
  } catch (error: any) {
    console.error("Video status error:", error);
    res.status(500).json({
      error: "Failed to fetch video status",
      details: error?.message || "Unknown error",
    });
  }
});

// Video Download & Stream
app.post("/api/video-download", async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: "operationName is required" });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: "Video URI not available yet" });
    }

    const videoRes = await fetch(uri, {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "" },
    });

    res.setHeader("Content-Type", "video/mp4");
    if (videoRes.body) {
      videoRes.body.pipeTo(
        new WritableStream({
          write(chunk) {
            res.write(chunk);
          },
          close() {
            res.end();
          },
        })
      );
    } else {
      res.status(500).json({ error: "No video body received" });
    }
  } catch (error: any) {
    console.error("Video download error:", error);
    res.status(500).json({
      error: "Failed to download video",
      details: error?.message || "Unknown error",
    });
  }
});

// -------------------------------------------------------------
// 5. Existing Roleplay Scenario, Pronunciation, and Explanations
// -------------------------------------------------------------
app.post("/api/generate-scenario", async (req, res) => {
  try {
    const { topicPrompt, difficulty = "beginner" } = req.body;

    const systemInstruction = `You are a curriculum designer for English learners whose native language is Arabic.
Create an engaging, realistic short conversation scenario based on the user's requested topic: "${topicPrompt || "Ordering at a coffee shop"}".
Difficulty level: ${difficulty}.

Requirements:
1. Scenario Title in English & Arabic.
2. Short Scene Setting / Background description in Arabic & English.
3. Realistic dialogue between 2 characters (4 to 6 alternating lines total).
4. For every dialogue line:
   - speaker: Name of the speaker (e.g., "Alex", "Barista", "Sarah").
   - english: Natural, everyday phrase.
   - arabic: Accurate Arabic translation.
   - phonetics: Arabic-based phonetic pronunciation guide (نطق مبسط بالعربية).
5. 4 essential vocabulary words from the dialogue with Arabic meanings and example sentences.
6. 1 cultural / practical speaking tip in Arabic.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `Create a dialogue scenario for: ${topicPrompt || "Coffee Shop"} (${difficulty} level)`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            titleEn: { type: Type.STRING },
            titleAr: { type: Type.STRING },
            category: { type: Type.STRING },
            icon: { type: Type.STRING },
            sceneDescriptionAr: { type: Type.STRING },
            sceneDescriptionEn: { type: Type.STRING },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  roleAr: { type: Type.STRING },
                  avatar: { type: Type.STRING },
                },
                required: ["name", "roleAr"],
              },
            },
            dialogue: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  speaker: { type: Type.STRING },
                  english: { type: Type.STRING },
                  arabic: { type: Type.STRING },
                  phonetics: { type: Type.STRING },
                },
                required: ["id", "speaker", "english", "arabic", "phonetics"],
              },
            },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  phonetic: { type: Type.STRING },
                  arabicMeaning: { type: Type.STRING },
                  example: { type: Type.STRING },
                },
                required: ["word", "arabicMeaning"],
              },
            },
            speakingTipAr: { type: Type.STRING },
          },
          required: ["titleEn", "titleAr", "sceneDescriptionAr", "dialogue", "vocabulary"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Scenario error:", error);
    res.status(500).json({
      error: "Failed to generate scenario",
      details: error?.message || "Unknown error",
    });
  }
});

app.post("/api/analyze-pronunciation", async (req, res) => {
  try {
    const { targetText, userSpokenText, targetPhonetic } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `Target sentence: "${targetText}"
Target phonetic guide: "${targetPhonetic || ""}"
What the user pronounced/speech-to-text recognized: "${userSpokenText}"

Evaluate the pronunciation and accuracy for an Arabic speaker learning English.
Give score (0-100), detailed feedback in Arabic, which words were missed or mispronounced, and a pronunciation tip.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "Pronunciation score 0 to 100" },
            isSuccess: { type: Type.BOOLEAN },
            feedbackAr: { type: Type.STRING, description: "Feedback in Arabic praising or correcting" },
            mispronouncedWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  correctSoundAr: { type: Type.STRING, description: "How to pronounce correctly in Arabic letters" },
                  commonMistakeAr: { type: Type.STRING, description: "Common mistake by Arabic speakers" },
                },
                required: ["word", "correctSoundAr"],
              },
            },
            encouragementAr: { type: Type.STRING },
          },
          required: ["score", "isSuccess", "feedbackAr"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Pronunciation analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze pronunciation",
      details: error?.message || "Unknown error",
    });
  }
});

// -------------------------------------------------------------
// Live Challenge Mode: AI Educational Speaking Questions & Evaluation
// -------------------------------------------------------------
app.post("/api/live-challenge/generate-question", async (req, res) => {
  try {
    const {
      topic = "travel",
      difficulty = "intermediate",
      challengeType = "conversational_question",
      previousQuestions = [],
    } = req.body;

    const topicDescriptions: Record<string, string> = {
      travel: "Travel, airport, hotel booking, directions, and tourist situations",
      job_interview: "Professional job interviews, self-introduction, career aspirations, and workplace problem-solving",
      daily_life: "Ordering food at a restaurant, grocery shopping, talking about daily routines and hobbies",
      ielts: "IELTS Speaking Part 1 & Part 2 style prompts requiring structured multi-sentence spoken response",
      debate_opinions: "Expressing opinions, advantages vs disadvantages, discussing modern technology or lifestyle",
      pronunciation_drills: "Challenging English phonemes (P/B, TH sounds, V/F, vowel contrasts, tongue twisters)",
    };

    const topicContext = topicDescriptions[topic] || topicDescriptions.travel;

    const systemInstruction = `You are an expert English Speaking Examiner and ESL Coach for native Arabic speakers.
Your goal is to generate an interactive, engaging speaking challenge question.
Topic: ${topicContext}.
Difficulty Level: ${difficulty}.
Challenge Format: ${challengeType}.
Do NOT repeat these questions: ${JSON.stringify(previousQuestions.slice(-5))}.

Requirements:
1. "questionEn": A clear, spoken-style English prompt/question that requires speaking 1-4 sentences.
2. "questionAr": Accurate Arabic translation.
3. "questionPhonetics": Simplified Arabic phonetic pronunciation guide for the question (نطق مبسط بالعربية).
4. "contextDescriptionAr": A 1-sentence scenario setting in Arabic explaining the speaking context.
5. "targetKeywords": 2 to 4 recommended vocabulary words/phrases the user should try to pronounce and use in their answer, with Arabic meaning and Arabic phonetic guide.
6. "sampleGoodAnswerEn": An exemplary natural, native English answer.
7. "sampleGoodAnswerAr": Arabic translation of the model answer.
8. "sampleGoodAnswerPhonetic": Arabic phonetic guide for the model answer.
9. "speakingTimeLimitSeconds": Recommended speaking duration (e.g., 30 for beginner, 45 for intermediate, 60 for advanced).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `Generate a speaking challenge for ${topic} at ${difficulty} level.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            topic: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            questionEn: { type: Type.STRING },
            questionAr: { type: Type.STRING },
            questionPhonetics: { type: Type.STRING },
            contextDescriptionAr: { type: Type.STRING },
            targetKeywords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  arabicMeaning: { type: Type.STRING },
                  phoneticAr: { type: Type.STRING },
                },
                required: ["word", "arabicMeaning", "phoneticAr"],
              },
            },
            sampleGoodAnswerEn: { type: Type.STRING },
            sampleGoodAnswerAr: { type: Type.STRING },
            sampleGoodAnswerPhonetic: { type: Type.STRING },
            speakingTimeLimitSeconds: { type: Type.INTEGER },
          },
          required: [
            "questionEn",
            "questionAr",
            "questionPhonetics",
            "contextDescriptionAr",
            "targetKeywords",
            "sampleGoodAnswerEn",
            "sampleGoodAnswerAr",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    if (!parsed.id) {
      parsed.id = "q_" + Date.now();
    }
    parsed.topic = topic;
    parsed.difficulty = difficulty;
    res.json(parsed);
  } catch (error: any) {
    console.error("Live challenge question generation error:", error);
    res.status(500).json({
      error: "Failed to generate challenge question",
      details: error?.message || "Unknown error",
    });
  }
});

app.post("/api/live-challenge/evaluate-response", async (req, res) => {
  try {
    const {
      questionEn,
      userTranscript,
      targetKeywords = [],
      difficulty = "intermediate",
      topic = "general",
    } = req.body;

    if (!userTranscript || userTranscript.trim().length === 0) {
      return res.status(400).json({
        error: "لم يتم استقبال أي صوت أو نص للكلام.",
      });
    }

    const systemInstruction = `You are a master ESL Speaking Examiner and Speech Phonetics Specialist assessing an Arabic native speaker's spoken English response.

Challenge Question asked: "${questionEn}"
Target recommended keywords: ${JSON.stringify(targetKeywords)}
Learner's Spoken Utterance (recognized by speech-to-text): "${userTranscript}"
Topic: ${topic}, Level: ${difficulty}.

Perform an in-depth, supportive, and rigorous pedagogical analysis:
1. Scores (0 to 100):
   - overallScore: weighted composite
   - pronunciationScore: phonetic clarity, word stress, sound accuracy
   - fluencyScore: continuity, sentence structure, flow
   - grammarScore: tense consistency, prepositions, subject-verb agreement
   - vocabularyScore: lexical variety, appropriateness
2. summaryFeedbackAr: A clear, encouraging 2-3 sentence overview in Arabic summarizing performance.
3. mispronouncedWords:
   - Identify 1 to 4 specific words from what the user said that Arabic speakers typically mispronounce (e.g., P vs B, TH, vowel lengths, silent letters, ending sounds).
   - "word": the English word
   - "userSoundAr": how it likely sounded incorrectly
   - "correctPhoneticAr": exact Arabic letters to pronounce it correctly (e.g. "ثينك" وليس "سينك")
   - "ipa": IPA phonetic transcription
   - "phoneticTip": actionable sound placement tip (e.g., ضع طرف لسانك بين أسنانك لنطق Th)
4. grammarCorrections:
   - Analyze grammatical errors or awkward phrasing in the learner's transcript.
   - "original": user's phrase
   - "improved": natural, native English alternative
   - "explanationAr": concise explanation of the grammar rule in Arabic
5. strengths: 2-3 specific positive things the learner did well in Arabic.
6. areasToImprove: 2-3 targeted recommendations for future speaking practice in Arabic.
7. suggestedNativeResponseEn: A natural, high-level native answer the user can learn from.
8. suggestedNativeResponseAr: Arabic translation of the native response.
9. xpEarned: Calculate XP reward (30-60 XP based on effort and score).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `Evaluate this spoken response: "${userTranscript}" for question: "${questionEn}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER },
            pronunciationScore: { type: Type.INTEGER },
            fluencyScore: { type: Type.INTEGER },
            grammarScore: { type: Type.INTEGER },
            vocabularyScore: { type: Type.INTEGER },
            isPassed: { type: Type.BOOLEAN },
            userTranscript: { type: Type.STRING },
            summaryFeedbackAr: { type: Type.STRING },
            mispronouncedWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  userSoundAr: { type: Type.STRING },
                  correctPhoneticAr: { type: Type.STRING },
                  ipa: { type: Type.STRING },
                  phoneticTip: { type: Type.STRING },
                },
                required: ["word", "correctPhoneticAr", "phoneticTip"],
              },
            },
            grammarCorrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  improved: { type: Type.STRING },
                  explanationAr: { type: Type.STRING },
                },
                required: ["original", "improved", "explanationAr"],
              },
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            areasToImprove: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedNativeResponseEn: { type: Type.STRING },
            suggestedNativeResponseAr: { type: Type.STRING },
            xpEarned: { type: Type.INTEGER },
          },
          required: [
            "overallScore",
            "pronunciationScore",
            "fluencyScore",
            "grammarScore",
            "vocabularyScore",
            "isPassed",
            "summaryFeedbackAr",
            "strengths",
            "areasToImprove",
            "suggestedNativeResponseEn",
            "suggestedNativeResponseAr",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    parsed.userTranscript = userTranscript;
    parsed.createdAt = Date.now();
    res.json(parsed);
  } catch (error: any) {
    console.error("Live challenge evaluation error:", error);
    res.status(500).json({
      error: "Failed to evaluate challenge response",
      details: error?.message || "Unknown error",
    });
  }
});

// -------------------------------------------------------------
// 6. AI Flashcard Generator & Word Lookup
// -------------------------------------------------------------
app.post("/api/generate-flashcard", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Word or search query is required" });
    }

    const trimmedQuery = query.trim();

    // Built-in server dictionary for instant accurate fallback when API key is missing or model busy
    const SERVER_DICT: Record<string, { word: string; pos: string; ipa: string; arPhon: string; meaning: string; cat: string; exEn: string; exAr: string; img: string }> = {
      "كعبة": { word: "Kaaba", pos: "noun", ipa: "/ˈkɑː.bə/", arPhon: "كَابَا / الكَعْبَة", meaning: "الكعبة المشرفة في مكة المكرمة", cat: "travel", exEn: "Millions of Muslims visit the holy Kaaba every year.", exAr: "يزور ملايين المسلمين الكعبة المشرفة كل عام.", img: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=600&q=80" },
      "الكعبة": { word: "Kaaba", pos: "noun", ipa: "/ˈkɑː.bə/", arPhon: "كَابَا / الكَعْبَة", meaning: "الكعبة المشرفة في مكة المكرمة", cat: "travel", exEn: "The Kaaba is the sacred house of worship in Mecca.", exAr: "الكعبة المشرفة هي بيت الله الحرام في مكة المكرمة.", img: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=600&q=80" },
      "kaaba": { word: "Kaaba", pos: "noun", ipa: "/ˈkɑː.bə/", arPhon: "كَابَا / الكَعْبَة", meaning: "الكعبة المشرفة", cat: "travel", exEn: "The Kaaba is the holiest site in Islam.", exAr: "الكعبة هي أقدس مكان في الإسلام.", img: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=600&q=80" },
      "ماء": { word: "Water", pos: "noun", ipa: "/ˈwɔː.tər/", arPhon: "ووتَر", meaning: "ماء / مياه", cat: "food", exEn: "Water is essential for all living creatures.", exAr: "الماء ضروري لجميع الكائنات الحية.", img: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80" },
      "water": { word: "Water", pos: "noun", ipa: "/ˈwɔː.tər/", arPhon: "ووتَر", meaning: "ماء / مياه", cat: "food", exEn: "Drink plenty of water every day to stay hydrated.", exAr: "اشرب الكثير من الماء يومياً للبقاء منتعشاً.", img: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80" },
      "قهوة": { word: "Coffee", pos: "noun", ipa: "/ˈkɒf.i/", arPhon: "كُوفِي", meaning: "قهوة", cat: "food", exEn: "I start my morning with a fresh cup of coffee.", exAr: "أبدأ صباحي بكوب من القهوة الطازجة.", img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80" },
      "كتاب": { word: "Book", pos: "noun", ipa: "/bʊk/", arPhon: "بُوك", meaning: "كتاب", cat: "work", exEn: "Reading a book opens your mind to new ideas.", exAr: "قراءة كتاب تفتح عقلك لأفكار جديدة.", img: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80" },
      "سيارة": { word: "Car", pos: "noun", ipa: "/kɑːr/", arPhon: "كَار", meaning: "سيارة", cat: "travel", exEn: "He drives his car to work every day.", exAr: "يقود سيارته إلى العمل كل يوم.", img: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=600&q=80" },
      "شمس": { word: "Sun", pos: "noun", ipa: "/sʌn/", arPhon: "صَن", meaning: "الشمس", cat: "general", exEn: "The sun rises in the east every morning.", exAr: "تشرق الشمس في الشرق كل صباح.", img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80" },
    };

    const directLookup = SERVER_DICT[trimmedQuery.toLowerCase()];
    if (directLookup) {
      return res.json({
        id: "fc-ai-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        word: directLookup.word,
        partOfSpeech: directLookup.pos,
        ipa: directLookup.ipa,
        arabicPhonetics: directLookup.arPhon,
        arabicMeaning: directLookup.meaning,
        category: directLookup.cat,
        imageUrl: directLookup.img,
        exampleEn: directLookup.exEn,
        exampleAr: directLookup.exAr,
        difficulty: "intermediate",
        isAiGenerated: true,
        createdAt: Date.now(),
      });
    }

    const systemInstruction = `You are a world-class English language lexicographer and educational curriculum creator for native Arabic speakers.
Given a word, concept, or search term (in English or Arabic: "${trimmedQuery}"):
1. Identify the canonical English word or common phrase (e.g. if the user typed "كعبة", the English word is "Kaaba").
2. Determine the Part of Speech ("noun", "verb", "adjective", "adverb", "phrase").
3. Provide the accurate IPA phonetic transcription (e.g., "/ˈkɑː.bə/").
4. Provide a crystal-clear, simplified Arabic phonetic pronunciation guide in Arabic letters (e.g., "كَعْبَة / كَابَا").
5. Provide a clear, natural Arabic translation and definition suitable for learning.
6. Choose the best matching category from: ["food", "travel", "work", "tech", "health", "emotions", "general"].
7. Create a natural, memorable everyday English example sentence illustrating the word.
8. Provide the Arabic translation of the example sentence.
9. Assign the difficulty level: "beginner", "intermediate", or "advanced".
10. Provide an English visual keyword query suitable for finding an educational photo (e.g., "kaaba mecca", "coffee cup").`;

    let response;
    if (process.env.GEMINI_API_KEY) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Generate a comprehensive English learning flashcard for the search term: "${trimmedQuery}"`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING, description: "Canonical English word (Capitalized)" },
                partOfSpeech: { type: Type.STRING },
                ipa: { type: Type.STRING, description: "IPA transcription with slashes" },
                arabicPhonetics: { type: Type.STRING, description: "Arabic letters phonetics guide" },
                arabicMeaning: { type: Type.STRING, description: "Arabic meaning" },
                category: { type: Type.STRING },
                exampleEn: { type: Type.STRING, description: "Everyday English example sentence" },
                exampleAr: { type: Type.STRING, description: "Arabic translation of the example sentence" },
                difficulty: { type: Type.STRING, enum: ["beginner", "intermediate", "advanced"] },
                imageQuery: { type: Type.STRING, description: "1-3 English keywords for photo search" },
              },
              required: [
                "word",
                "partOfSpeech",
                "ipa",
                "arabicPhonetics",
                "arabicMeaning",
                "category",
                "exampleEn",
                "exampleAr",
                "difficulty",
              ],
            },
          },
        });
      } catch (modelErr) {
        console.warn("Retrying flashcard with gemini-2.5-flash...", modelErr);
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a comprehensive English learning flashcard in JSON for: "${trimmedQuery}" with word, partOfSpeech, ipa, arabicPhonetics, arabicMeaning, category, exampleEn, exampleAr, difficulty.`,
          });
        } catch (e) {
          console.warn("Fallback to lexical dictionary synthesis:", e);
        }
      }
    }

    let parsed: any = {};
    if (response?.text) {
      try {
        parsed = JSON.parse(response.text);
      } catch {
        parsed = {};
      }
    }

    const cleanWord = parsed.word || (trimmedQuery.charAt(0).toUpperCase() + trimmedQuery.slice(1));

    // Specific high-quality images based on category or custom keywords
    const categoryImages: Record<string, string> = {
      food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
      travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
      work: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
      tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
      health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80",
      emotions: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=600&q=80",
      general: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
    };

    const selectedCategory = (parsed.category || "general").toLowerCase();
    const fallbackImage = categoryImages[selectedCategory] || categoryImages.general;

    const flashcardItem = {
      id: "fc-ai-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      word: cleanWord,
      partOfSpeech: parsed.partOfSpeech || "noun",
      ipa: parsed.ipa || `/${cleanWord.toLowerCase()}/`,
      arabicPhonetics: parsed.arabicPhonetics || cleanWord,
      arabicMeaning: parsed.arabicMeaning || trimmedQuery,
      category: selectedCategory,
      imageUrl: fallbackImage,
      exampleEn: parsed.exampleEn || `We use ${cleanWord} in daily conversations.`,
      exampleAr: parsed.exampleAr || `نستخدم ${parsed.arabicMeaning || cleanWord} في المحادثات اليومية.`,
      difficulty: parsed.difficulty || "intermediate",
      isAiGenerated: true,
      createdAt: Date.now(),
    };

    res.json(flashcardItem);
  } catch (error: any) {
    console.error("Flashcard generation error:", error);
    // Even in severe errors, return a functional educational flashcard
    const trimmed = (req.body?.query || "Word").trim();
    res.json({
      id: "fc-ai-" + Date.now(),
      word: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
      partOfSpeech: "noun",
      ipa: `/${trimmed.toLowerCase()}/`,
      arabicPhonetics: trimmed,
      arabicMeaning: trimmed,
      category: "general",
      imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
      exampleEn: `Let's practice the word "${trimmed}" in English.`,
      exampleAr: `دعونا نتدرب على كلمة "${trimmed}" في الإنجليزية.`,
      difficulty: "intermediate",
      isAiGenerated: true,
      createdAt: Date.now(),
    });
  }
});

// -------------------------------------------------------------
// 7. HTTP & WebSocket Server Setup (Gemini Live API)
// Model: gemini-3.1-flash-live-preview for low-latency Realtime Voice
// -------------------------------------------------------------
async function startServer() {
  const server = http.createServer(app);

  // WebSocket Server for Live Voice API on path /live
  const wss = new WebSocketServer({ server, path: "/live" });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("Client connected to Gemini Live Voice WS");
    let session: any = null;

    try {
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are "Sara", a friendly, natural English conversation tutor.
Speak in short, encouraging English sentences. Speak clearly and help the learner practice natural dialogues. Keep each spoken turn short and conversational.`,
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "audio", audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }
          },
          onclose: () => {
            console.log("Gemini Live session closed");
          },
        },
      });

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "ready", message: "Connected to Gemini Live voice" }));
      }
    } catch (err: any) {
      console.error("Failed to connect to Gemini Live:", err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "error", error: err?.message || "Live API connection error" }));
      }
    }

    clientWs.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.audio && session) {
          session.sendRealtimeInput({
            audio: { data: data.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
        if (data.text && session) {
          session.sendRealtimeInput({
            text: data.text,
          });
        }
      } catch (err) {
        console.error("WS message handling error:", err);
      }
    });

    clientWs.on("close", () => {
      console.log("Client disconnected from Live Voice WS");
      if (session) {
        try {
          session.close();
        } catch (e) {}
      }
    });
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`FluentVoice English App running on http://localhost:${PORT}`);
  });
}

startServer();