// Web Speech API and Sound Effects utility

let synth: SpeechSynthesis | null = null;
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  synth = window.speechSynthesis;
}

// Get best available English voice
export function getEnglishVoice(): SpeechSynthesisVoice | null {
  if (!synth) return null;
  const voices = synth.getVoices();
  
  // Prefer natural English US or UK voices
  const preferred = voices.find(
    (v) =>
      (v.lang.includes("en-US") || v.lang.includes("en-GB") || v.lang.startsWith("en")) &&
      (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Daniel"))
  );
  
  if (preferred) return preferred;
  return voices.find((v) => v.lang.startsWith("en")) || null;
}

export interface SpeakOptions {
  rate?: number; // 0.7 to 1.2
  pitch?: number;
  onEnd?: () => void;
  onBoundary?: (charIndex: number) => void;
}

export function playEnglishAudio(
  text: string,
  options: SpeakOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    if (!synth || typeof window === "undefined") {
      resolve();
      return;
    }

    try {
      synth.cancel(); // Stop ongoing speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;

      const voice = getEnglishVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        if (options.onEnd) options.onEnd();
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        if (options.onEnd) options.onEnd();
        resolve();
      };

      if (options.onBoundary) {
        utterance.onboundary = (e) => {
          if (options.onBoundary) options.onBoundary(e.charIndex);
        };
      }

      // Small delay fix for Chrome speech bug
      setTimeout(() => {
        synth?.speak(utterance);
      }, 50);
    } catch (err) {
      console.warn("Audio speech error:", err);
      resolve();
    }
  });
}

export function stopEnglishAudio(): void {
  if (synth) {
    try {
      synth.cancel();
    } catch (e) {
      console.warn("Error stopping audio:", e);
    }
  }
}

// Sound effects generator using Web Audio API
class SoundFX {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playSuccess() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.35); // C6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      // ignore
    }
  }

  playClick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      // ignore
    }
  }

  playEncouragement() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.12); // C#5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.25); // E5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      // ignore
    }
  }
}

export const soundFX = new SoundFX();

// Browser Speech Recognition Helper
export function createSpeechRecognizer(
  onResult: (transcript: string) => void,
  onError: (error: string) => void,
  onEnd: () => void
) {
  if (typeof window === "undefined") return null;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        finalTranscript += event.results[i][0].transcript;
      }
      onResult(finalTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      onError(event.error || "خطأ في التعرف على الصوت");
    };

    recognition.onend = () => {
      onEnd();
    };

    return recognition;
  } catch (err) {
    console.warn("Failed to init SpeechRecognition:", err);
    return null;
  }
}
