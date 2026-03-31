type Callback = () => void;

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export class VoiceDetector {
  private recognition: any = null;
  private onTriggerCb: Callback | null = null;
  private onTranscriptCb: ((text: string) => void) | null = null;
  private running = false;
  private triggerPhrase = 'jarvis';
  private cooldown = false;

  onTrigger(cb: Callback): void {
    this.onTriggerCb = cb;
  }

  onTranscript(cb: (text: string) => void): void {
    this.onTranscriptCb = cb;
  }

  start(): void {
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.running = true;

    this.recognition.onresult = (event: any) => {
      if (this.cooldown) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        this.onTranscriptCb?.(transcript);

        if (transcript.includes(this.triggerPhrase)) {
          this.cooldown = true;
          this.onTriggerCb?.();
          this.restart();
          // Prevent re-trigger for 3 seconds
          setTimeout(() => { this.cooldown = false; }, 3000);
          return;
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // Auto-restart on recoverable errors
      if (this.running && event.error !== 'not-allowed') {
        setTimeout(() => this.restart(), 500);
      }
    };

    this.recognition.onend = () => {
      // Auto-restart if we're supposed to be running
      if (this.running) {
        setTimeout(() => {
          try { this.recognition?.start(); } catch {}
        }, 200);
      }
    };

    try {
      this.recognition.start();
    } catch {}
  }

  private restart(): void {
    try {
      this.recognition?.stop();
    } catch {}
    // onend handler will auto-restart
  }

  stop(): void {
    this.running = false;
    try {
      this.recognition?.stop();
    } catch {}
    this.recognition = null;
  }
}
