import React, { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Video,
  Mic,
  MicOff,
  Sparkles,
  Upload,
  Loader2,
  Play,
  Download,
  Wand2,
  Layers,
  FileAudio,
  CheckCircle2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { GeneratedMediaItem } from "../types";
import { soundFX } from "../utils/audio";

interface MediaStudioViewProps {
  onAddXp: (amount: number) => void;
}

export const MediaStudioView: React.FC<MediaStudioViewProps> = ({ onAddXp }) => {
  const [activeTab, setActiveTab] = useState<"image" | "video" | "transcribe">("image");

  // Image Generation & Editing State (gemini-3.1-flash-image-preview)
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [imageAspectRatio, setImageAspectRatio] = useState<string>("1:1");
  const [imageSize, setImageSize] = useState<string>("1K");
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [imageDescription, setImageDescription] = useState<string>("");

  // Video Generation State (veo-3.1-fast-generate-preview)
  const [videoPrompt, setVideoPrompt] = useState<string>("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [videoBaseImage, setVideoBaseImage] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoProgressText, setVideoProgressText] = useState<string>("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Audio Transcription State (gemini-3.5-flash)
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionResult, setTranscriptionResult] = useState<any | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 1. Handle Image Generation & Editing (gemini-3.1-flash-image-preview)
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;
    setIsGeneratingImage(true);
    soundFX.playClick();

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          aspectRatio: imageAspectRatio,
          imageSize,
          baseImage,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await res.json();
      setGeneratedImage(data.imageUrl);
      setImageDescription(data.description || "");
      soundFX.playSuccess();
      onAddXp(25);
    } catch (err: any) {
      console.error(err);
      alert("حدث خطأ أثناء توليد الصورة: " + (err?.message || "يرجى المحاولة مجدداً"));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 2. Handle Video Generation (veo-3.1-fast-generate-preview)
  const handleGenerateVideo = async () => {
    if ((!videoPrompt.trim() && !videoBaseImage) || isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    setVideoProgressText("جارِ بدء معالجة الفيديو بنموذج Veo 3...");
    setGeneratedVideoUrl(null);
    soundFX.playClick();

    try {
      // Step 1: Start operation
      const startRes = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt.trim(),
          aspectRatio: videoAspectRatio,
          baseImage: videoBaseImage,
        }),
      });

      if (!startRes.ok) {
        throw new Error("فشل بدء عملية توليد الفيديو");
      }

      const { operationName } = await startRes.json();
      setVideoProgressText("جارِ إنشاء مشاهد الفيديو التفاعلية بدقة عالية...");

      // Step 2: Poll operation until done
      let isDone = false;
      let attempts = 0;

      while (!isDone && attempts < 60) {
        await new Promise((r) => setTimeout(r, 6000));
        attempts++;
        setVideoProgressText(`جارِ تحريك المشاهد التعليمية... (${attempts * 6} ثوانٍ)`);

        const pollRes = await fetch("/api/video-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName }),
        });

        if (pollRes.ok) {
          const pollData = await pollRes.json();
          if (pollData.done) {
            isDone = true;
            break;
          }
        }
      }

      if (!isDone) {
        throw new Error("استغرقت المعالجة وقتاً أطول من المتوقع، يرجى المحاولة لاحقاً.");
      }

      // Step 3: Download video
      setVideoProgressText("جارِ تحميل واستعراض الفيديو النهائي...");
      const downloadRes = await fetch("/api/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName }),
      });

      if (!downloadRes.ok) {
        throw new Error("فشل تنزيل ملف الفيديو الناتج");
      }

      const blob = await downloadRes.blob();
      const videoObjectUrl = URL.createObjectURL(blob);
      setGeneratedVideoUrl(videoObjectUrl);
      soundFX.playSuccess();
      onAddXp(50);
    } catch (err: any) {
      console.error(err);
      alert("حدث خطأ أثناء توليد الفيديو: " + (err?.message || "يرجى المحاولة مجدداً"));
    } finally {
      setIsGeneratingVideo(false);
      setVideoProgressText("");
    }
  };

  // 3. Audio Recording & Transcription (gemini-3.5-flash)
  const handleToggleRecordAudio = async () => {
    if (isRecordingAudio) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingAudio(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecordingAudio(true);
      setTranscriptionResult(null);
      soundFX.playClick();
    } catch (err) {
      console.error("Mic error:", err);
      alert("يرجى إعطاء صلاحية الميكروفون لتسجيل الصوت.");
    }
  };

  const handleTranscribeRecordedAudio = async () => {
    if (!audioBlob || isTranscribing) return;
    setIsTranscribing(true);
    soundFX.playClick();

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const res = await fetch("/api/transcribe-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioData: base64Audio,
            mimeType: "audio/webm",
          }),
        });

        if (!res.ok) {
          throw new Error("فشل التفريغ الصوتي");
        }

        const data = await res.json();
        setTranscriptionResult(data);
        soundFX.playSuccess();
        onAddXp(20);
        setIsTranscribing(false);
      };
    } catch (err: any) {
      console.error(err);
      alert("خطأ في التفريغ الصوتي: " + (err?.message || "يرجى المحاولة مجدداً"));
      setIsTranscribing(false);
    }
  };

  // Image Upload helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === "image") {
        setBaseImage(reader.result as string);
      } else {
        setVideoBaseImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-pink-500/10 space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-white/20 backdrop-blur-md text-xs font-black flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>استوديو الوسائط الذكي (AI Media Studio)</span>
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          توليد وتعديل الصور التعليمية، وفيديوهات Veo 3، والتفريغ الصوتي
        </h2>
        <p className="text-xs sm:text-sm text-pink-100/90 leading-relaxed font-medium max-w-2xl">
          أدوات إبداعية تفاعلية مدعومة بأحدث نماذج Google GenAI: تحويل النصوص والصور إلى بطاقات مرئية، تحريك الصور إلى فيديوهات، وتفريغ نطقك الصوتي بدقة.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("image")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "image"
              ? "bg-slate-900 dark:bg-pink-600 text-white shadow-md"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>توليد وتعديل الصور (Gemini 3.1 Flash Image)</span>
        </button>

        <button
          onClick={() => setActiveTab("video")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "video"
              ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-md"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>توليد فيديوهات المشاهد (Veo 3)</span>
        </button>

        <button
          onClick={() => setActiveTab("transcribe")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "transcribe"
              ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-md"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <FileAudio className="w-4 h-4" />
          <span>التفريغ والتحليل الصوتي (Gemini 3.5 Flash)</span>
        </button>
      </div>

      {/* TAB 1: IMAGE GENERATION & EDITING */}
      {activeTab === "image" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Side */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <span>إنشاء وتعديل بطاقة مصورة للكلمات الإنجليزية</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                نموذج <strong>gemini-3.1-flash-image-preview</strong> يدعم إنشاء صور جديدة وتعديل الصور المرفوعة.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">وصف الصورة المطلوبة بالإنجليزية أو العربية:</label>
                <textarea
                  rows={3}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="مثال: A cozy English coffee shop with a friendly barista serving a cappuccino..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">أبعاد الصورة (Aspect Ratio):</label>
                <div className="grid grid-cols-4 gap-2">
                  {["1:1", "16:9", "9:16", "4:3"].map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setImageAspectRatio(ratio)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        imageAspectRatio === ratio
                          ? "bg-pink-600 text-white border-pink-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Base Image for Editing */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>صورة للبدء أو التعديل عليها (اختياري):</span>
                  {baseImage && (
                    <button
                      onClick={() => setBaseImage(null)}
                      className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                    >
                      إلغاء الصورة
                    </button>
                  )}
                </label>

                {baseImage ? (
                  <div className="relative h-36 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img src={baseImage} alt="Base for edit" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-pink-400 dark:hover:border-pink-500 rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800/60 transition-all">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">اختر صورة لتعديلها</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "image")}
                    />
                  </label>
                )}
              </div>

              <button
                onClick={handleGenerateImage}
                disabled={!imagePrompt.trim() || isGeneratingImage}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-sm shadow-md shadow-pink-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جارِ معالجة وتوليد الصورة بدقة 1K...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>{baseImage ? "تعديل الصورة بالذكاء الاصطناعي" : "توليد الصورة الآن"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Side */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">معاينة النتيجة</h3>
            {generatedImage ? (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 shadow-md">
                  <img
                    src={generatedImage}
                    alt="Generated English learning visual"
                    className="w-full h-auto max-h-[420px] object-contain mx-auto"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم التوليد بنجاح (+25 XP)</span>
                  </span>
                  <a
                    href={generatedImage}
                    download="fluentvoice_image.png"
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل الصورة</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="h-80 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2 p-6 text-center">
                <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold">ستظهر الصورة التوضيحية المولدة هنا بدقة فائقة</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VEO 3 VIDEO GENERATION */}
      {activeTab === "video" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>توليد فيديو تعليمي تفاعلي مع Veo 3</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                نموذج <strong>veo-3.1-fast-generate-preview</strong> لتحويل الأفكار أو الصور الثابتة إلى مشاهد فيديو حية.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">وصف المشهد المراد تحريكه أو توليده:</label>
                <textarea
                  rows={3}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="مثال: Two people greeting each other in London and talking enthusiastically..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Video Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">أبعاد الفيديو:</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "16:9", label: "أفقي (16:9 Landscape)" },
                    { id: "9:16", label: "عمودي (9:16 Portrait)" },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setVideoAspectRatio(ratio.id as any)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        videoAspectRatio === ratio.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload image to animate */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>تحريك صورة ثابتة إلى فيديو (Image-to-Video):</span>
                  {videoBaseImage && (
                    <button
                      onClick={() => setVideoBaseImage(null)}
                      className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                    >
                      إلغاء الصورة
                    </button>
                  )}
                </label>

                {videoBaseImage ? (
                  <div className="relative h-36 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img src={videoBaseImage} alt="Base for video" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-800/60 transition-all">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">اختر صورة لتحويلها إلى فيديو</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "video")}
                    />
                  </label>
                )}
              </div>

              <button
                onClick={handleGenerateVideo}
                disabled={(!videoPrompt.trim() && !videoBaseImage) || isGeneratingVideo}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingVideo ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جارِ المعالجة بواسطة Veo 3...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    <span>توليد فيديو المشهد التعليمي (+50 XP)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Video Preview */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">معاينة فيديو Veo 3</h3>

            {isGeneratingVideo && (
              <div className="p-8 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{videoProgressText}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">
                    تستغرق عملية بناء وتحريك المشاهد بضع لحظات لضمان أعلى جودة في الحركة.
                  </p>
                </div>
              </div>
            )}

            {generatedVideoUrl ? (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden bg-black shadow-lg">
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-auto max-h-[420px]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم إنشاء الفيديو بنجاح بواسطة Veo 3!</span>
                  </span>
                  <a
                    href={generatedVideoUrl}
                    download="veo_fluentvoice.mp4"
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل الفيديو MP4</span>
                  </a>
                </div>
              </div>
            ) : !isGeneratingVideo ? (
              <div className="h-80 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2 p-6 text-center">
                <Video className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold">سيتم استعراض فيديو Veo 3 التفاعلي فور اكتماله</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIO TRANSCRIPTION */}
      {activeTab === "transcribe" && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>تفريغ وتحليل النطق الصوتي (Audio Transcription)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              تحدث بأي جملة إنجليزية وسيقوم نموذج <strong>gemini-3.5-flash</strong> بتحويلها لنص مكتوب مع النطق بالعربية والترجمة والتقييم.
            </p>
          </div>

          {/* Recording Control */}
          <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-4">
            <button
              onClick={handleToggleRecordAudio}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all mx-auto cursor-pointer ${
                isRecordingAudio
                  ? "bg-rose-600 ring-8 ring-rose-200 dark:ring-rose-900 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
              }`}
            >
              {isRecordingAudio ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {isRecordingAudio ? "جارِ تسجيل صوتك الآن... اضغط لإيقاف التسجيل" : "اضغط المايك وتحدث بجملة إنجليزية"}
              </p>
            </div>

            {audioBlob && !isRecordingAudio && (
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleTranscribeRecordedAudio}
                  disabled={isTranscribing}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارِ تفريغ الصوت بنموذج Gemini 3.5 Flash...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>تفريغ وتحليل الصوت المسجل</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Transcription Results Card */}
          {transcriptionResult && (
            <div className="p-6 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">نتيجة التفريغ الصوتي الذكي:</span>
                <span className="px-3 py-1 rounded-full bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-xs font-black">
                  دقة النطق: {transcriptionResult.accuracyScore}%
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-base font-black text-slate-900 dark:text-white dir-ltr">
                  "{transcriptionResult.transcript}"
                </div>
                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 p-2 rounded-xl">
                  <span>النطق بالحروف العربية: </span>
                  <span>{transcriptionResult.arabicPhonetics}</span>
                </div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span>المعنى بالعربية: </span>
                  <span>{transcriptionResult.arabicTranslation}</span>
                </div>
              </div>

              {transcriptionResult.pronunciationTipsAr && (
                <div className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  💡 {transcriptionResult.pronunciationTipsAr}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
