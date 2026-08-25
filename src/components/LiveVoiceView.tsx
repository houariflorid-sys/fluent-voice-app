import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  Bot,
  Zap,
  Activity,
  AlertCircle,
  Headphones,
  RotateCcw,
  Trophy,
  Target,
  Flame,
} from "lucide-react";
import { soundFX } from "../utils/audio";
import { LiveChallengeView } from "./LiveChallengeView";

interface LiveVoiceViewProps {
  onAddXp: (amount: number) => void;
}

// Convert Float32Array PCM to 16-bit PCM little-endian Base64
function floatTo16BitPCMBase64(float32Array: Float32Array): string {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode base64 PCM 24kHz to AudioBuffer
function base64ToAudioBuffer(base64: string, ctx: AudioContext): AudioBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const dataView = new DataView(bytes.buffer);
  const numSamples = Math.floor(len / 2);
  const audioBuffer = ctx.createBuffer(1, numSamples, 24000);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < numSamples; i++) {
    const sample = dataView.getInt16(i * 2, true);
    channelData[i] = sample / 32768;
  }
  return audioBuffer;
}

export const LiveVoiceView: React.FC<LiveVoiceViewProps> = ({ onAddXp }) => {
  const [activeVoiceMode, setActiveVoiceMode] = useState<"challenge" | "live_stream">("challenge");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isModelTalking, setIsModelTalking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [sessionDuration, setSessionDuration] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const timerRef = useRef<any>(null);

  // Timer for duration
  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setSessionDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectLive();
    };
  }, []);

  const stopAllAudioPlayback = () => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    setIsModelTalking(false);
  };

  const playAudioChunk = (base64Audio: string) => {
    if (!outputAudioCtxRef.current) {
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }

    const ctx = outputAudioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    try {
      const audioBuffer = base64ToAudioBuffer(base64Audio, ctx);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

      activeSourcesRef.current.push(source);
      setIsModelTalking(true);

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setIsModelTalking(false);
        }
      };
    } catch (err) {
      console.warn("Failed to play audio chunk:", err);
    }
  };

  const connectLive = async () => {
    try {
      setIsConnecting(true);
      setErrorMessage("");
      soundFX.playClick();

      // 1. Request Mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Audio Contexts
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;

      // 3. Connect WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to Live WebSocket");
        setIsConnected(true);
        setIsConnecting(false);
        soundFX.playSuccess();
        onAddXp(20);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "audio" && data.audio) {
            playAudioChunk(data.audio);
          } else if (data.type === "interrupted") {
            stopAllAudioPlayback();
          } else if (data.type === "error") {
            setErrorMessage(data.error || "خطأ في اتصال المحادثة المباشرة");
          }
        } catch (e) {
          console.warn(e);
        }
      };

      ws.onerror = (e) => {
        console.error("Live WS error:", e);
        setErrorMessage("تعذر الاتصال بخادم المحادثة الصوتية الحية.");
        setIsConnecting(false);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        stopAllAudioPlayback();
      };

      // 4. Capture Mic Audio & Stream to WS
      const source = inputAudioCtxRef.current.createMediaStreamSource(stream);
      const processor = inputAudioCtxRef.current.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Simple volume calculation for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const avg = sum / inputData.length;
        setAudioLevel(Math.min(100, Math.round(avg * 400)));
        setIsSpeaking(avg > 0.02);

        if (ws.readyState === WebSocket.OPEN) {
          const base64PCM = floatTo16BitPCMBase64(inputData);
          ws.send(JSON.stringify({ audio: base64PCM }));
        }
      };

      source.connect(processor);
      processor.connect(inputAudioCtxRef.current.destination);
    } catch (err: any) {
      console.error("Error setting up live audio:", err);
      setErrorMessage(err?.message || "يرجى السماح بالوصول إلى الميكروفون للبدء بالمحادثة الحية.");
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  const disconnectLive = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    stopAllAudioPlayback();
    setIsConnected(false);
    setIsConnecting(false);
    setAudioLevel(0);
    setIsSpeaking(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center">
        <div className="bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center gap-1">
          <button
            onClick={() => {
              if (isConnected) disconnectLive();
              setActiveVoiceMode("challenge");
              soundFX.playClick();
            }}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeVoiceMode === "challenge"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>وضع التحدي التفاعلي وتقارير الأخطاء</span>
            <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded-md">
              جديد
            </span>
          </button>

          <button
            onClick={() => {
              setActiveVoiceMode("live_stream");
              soundFX.playClick();
            }}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeVoiceMode === "live_stream"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Radio className="w-4 h-4 text-indigo-500" />
            <span>المحادثة الحرة المباشرة (Live Stream)</span>
          </button>
        </div>
      </div>

      {activeVoiceMode === "challenge" ? (
        <LiveChallengeView onAddXp={onAddXp} />
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-white/20 backdrop-blur-md text-xs font-black flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>محادثة صوتية حية فورية (Live Voice API)</span>
                </span>
                <span className="text-xs font-semibold text-indigo-100">
                  استجابة فائقة السرعة
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                تحدث مباشرة مع الذكاء الاصطناعي كأنك تجري مكالمة هاتفية
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-medium">
                تحدث بصوتك باللغة الإنجليزية في أي موضوع وستسمع الإجابة الفورية بصوت طبيعي بدون أي تأخير، مع دعم المقاطعة الحية!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center min-w-[120px]">
                <p className="text-[11px] text-indigo-200 font-bold">مدة المكالمة</p>
                <p className="text-xl font-black font-mono dir-ltr">{formatDuration(sessionDuration)}</p>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Main Interactive Stage */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-lg p-8 sm:p-12 text-center space-y-8 relative overflow-hidden">
            {/* Background Visual Ring Animation */}
            <div className="flex justify-center items-center py-6">
              <div className="relative flex items-center justify-center">
                {/* Pulsing Aura Rings */}
                {isConnected && (
                  <>
                    <div
                      className={`absolute w-56 h-56 rounded-full border-2 border-indigo-400/30 animate-ping duration-1000 ${
                        isModelTalking ? "scale-125 border-cyan-400/50" : ""
                      }`}
                    />
                    <div
                      className={`absolute w-44 h-44 rounded-full bg-gradient-to-tr from-indigo-500/10 to-cyan-500/20 blur-xl ${
                        isSpeaking || isModelTalking ? "scale-150" : "scale-100"
                      } transition-transform duration-300`}
                    />
                  </>
                )}

                {/* Central Circle Button */}
                <button
                  id="live-voice-main-btn"
                  disabled={isConnecting}
                  onClick={isConnected ? disconnectLive : connectLive}
                  className={`relative z-10 w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center gap-2 text-white shadow-2xl transition-all duration-300 cursor-pointer ${
                    isConnected
                      ? isModelTalking
                        ? "bg-gradient-to-tr from-cyan-500 to-blue-600 ring-8 ring-cyan-200 dark:ring-cyan-900 animate-pulse"
                        : "bg-gradient-to-tr from-rose-500 to-red-600 ring-8 ring-rose-200 dark:ring-rose-900"
                      : isConnecting
                      ? "bg-slate-700 animate-pulse cursor-wait"
                      : "bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-600 hover:scale-105 shadow-indigo-500/30"
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <Activity className="w-10 h-10 animate-spin" />
                      <span className="text-xs font-bold">جارِ الاتصال...</span>
                    </>
                  ) : isConnected ? (
                    <>
                      {isModelTalking ? (
                        <Volume2 className="w-12 h-12 animate-bounce" />
                      ) : (
                        <Mic className="w-12 h-12" />
                      )}
                      <span className="text-xs font-black">
                        {isModelTalking ? "سارة تتحدث..." : "إنهاء المكالمة"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Radio className="w-12 h-12" />
                      <span className="text-xs sm:text-sm font-black">ابدأ المحادثة الحية</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status indicator bar */}
            <div className="space-y-3 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-ping" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                />
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  {isConnected
                    ? isModelTalking
                      ? "الذكاء الاصطناعي يتحدث الآن بصوت طبيعي..."
                      : isSpeaking
                      ? "يتم الاستماع إلى صوتك..."
                      : "الميكروفون مفتوح - تحدث بالإنجليزية في أي وقت"
                    : "جاهز للبدء - اضغط على الدائرة لبدء مكالمة صوتية فورية"}
                </h3>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                يعتمد هذا الوضع على نموذج <strong>gemini-3.1-flash-live-preview</strong> للمحادثة الصوتية المباشرة في الزمن الحقيقي.
              </p>
            </div>

            {/* Audio Live Level Meter */}
            {isConnected && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-w-sm mx-auto space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span>مستوى إشارة الصوت:</span>
                  <span className="font-mono">{audioLevel}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 transition-all duration-75 rounded-full"
                    style={{ width: `${Math.max(5, audioLevel)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Helpful conversation prompts */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-right space-y-3">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>موضوعات مقترحة لبدء الحديث:</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">"Can we practice travel vocabulary?"</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">ممارسة مفردات السفر والمطارات</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">"Ask me 3 questions about my hobbies."</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">أسئلة وأجوبة عن الهوايات والاهتمامات</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">"Teach me 2 cool English idioms today."</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">تعلم مصطلحات إنجليزية شائعة</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
