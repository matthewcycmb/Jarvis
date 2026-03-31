import { useState, useEffect, useRef, useCallback } from 'react';
import { ClapDetector } from './audio/detector';
import { VoiceDetector } from './audio/voiceDetector';
import { calibrateNoiseFloor } from './audio/calibration';
import { loadConfig, saveConfig } from './store';
import type { AppConfig, Action, DetectionConfig, DetectionStatus, TriggerMode } from './shared/types';
import { DEFAULT_DETECTION } from './shared/types';
import { JarvisOrb } from './JarvisOrb';

export function App() {
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [status, setStatus] = useState<DetectionStatus>('paused');
  const [amplitude, setAmplitude] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const detectorRef = useRef<ClapDetector | null>(null);
  const voiceRef = useRef<VoiceDetector | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => { saveConfig(config); }, [config]);

  const updateConfig = useCallback((patch: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const fireActions = useCallback(() => {
    const cfg = configRef.current;

    // Jarvis speaks back
    if (cfg.responseText) {
      speak(cfg.responseText, cfg.voiceName);
    }

    // Open links after a short delay so the voice starts first
    setTimeout(() => {
      const enabled = cfg.actions.filter((a) => a.enabled);
      for (const action of enabled) {
        window.open(action.value, '_blank');
      }
    }, 500);

    setTriggered(true);
    setTimeout(() => setTriggered(false), 2000);
  }, []);

  // Stop all detectors
  const stopAll = useCallback(() => {
    detectorRef.current?.stop();
    detectorRef.current = null;
    voiceRef.current?.stop();
    voiceRef.current = null;
  }, []);

  // Voice detector lifecycle
  useEffect(() => {
    if (!config.listeningEnabled || config.triggerMode !== 'voice') {
      voiceRef.current?.stop();
      voiceRef.current = null;
      return;
    }

    const voice = new VoiceDetector();
    voice.onTranscript((text) => {
      setTranscript(text);
      // Clear after a bit
      setTimeout(() => setTranscript(''), 3000);
    });
    voice.onTrigger(() => {
      fireActions();
      setStatus('triggered');
      setTimeout(() => setStatus('listening'), 2000);
    });
    voice.start();
    voiceRef.current = voice;
    setStatus('listening');

    return () => { voice.stop(); };
  }, [config.listeningEnabled, config.triggerMode, fireActions]);

  // Clap detector lifecycle
  useEffect(() => {
    if (!config.listeningEnabled || config.triggerMode !== 'clap' || config.noiseFloorAmplitude === null) {
      detectorRef.current?.stop();
      detectorRef.current = null;
      return;
    }

    const detector = new ClapDetector(config.detection, config.noiseFloorAmplitude);
    detector.onAmplitude(setAmplitude);
    detector.onTrigger(() => {
      fireActions();
      setStatus('triggered');
      setTimeout(() => setStatus('listening'), 2000);
    });
    detector.start().then(() => setStatus('listening'));
    detectorRef.current = detector;
    return () => { detector.stop(); };
  }, [config.listeningEnabled, config.triggerMode, config.noiseFloorAmplitude, config.detection, fireActions]);

  // Set paused status when disabled
  useEffect(() => {
    if (!config.listeningEnabled) setStatus('paused');
  }, [config.listeningEnabled]);

  // Calibrate (for clap mode)
  const handleCalibrate = async () => {
    setIsCalibrating(true);
    setStatus('calibrating');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext({ sampleRate: 44100 });
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const noiseFloor = await calibrateNoiseFloor(analyser, 3000);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      updateConfig({ noiseFloorAmplitude: noiseFloor });
    } catch (err) {
      console.error('Calibration failed:', err);
    }
    setIsCalibrating(false);
  };

  const needsCalibration = config.triggerMode === 'clap' && config.noiseFloorAmplitude === null;
  const isListening = status === 'listening';
  const isVoice = config.triggerMode === 'voice';
  const threshold = (config.noiseFloorAmplitude ?? 0) * config.detection.thresholdMultiplier;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden select-none">

      {/* Ambient glow on trigger */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${triggered ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-cyan-500/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan-400/15 blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-4">

        {/* JARVIS Orb */}
        {needsCalibration ? (
          <button onClick={handleCalibrate} disabled={isCalibrating} className="cursor-pointer">
            <JarvisOrb amplitude={0} triggered={false} isListening={false} isCalibrating={isCalibrating} />
          </button>
        ) : (
          <JarvisOrb amplitude={isVoice ? 0 : amplitude} triggered={triggered} isListening={isListening} isCalibrating={isCalibrating} />
        )}

        {/* Status under orb */}
        {needsCalibration && !isCalibrating && (
          <p className="text-sm text-cyan-400/60">Click to calibrate microphone</p>
        )}
        {isCalibrating && (
          <p className="text-sm text-yellow-400/80 animate-pulse">Calibrating... stay quiet</p>
        )}

        {/* Mode hint */}
        {!needsCalibration && isListening && !triggered && (
          <p className="text-[11px] text-neutral-600">
            {isVoice ? 'Say "Jarvis" to trigger' : 'Clap twice to trigger'}
          </p>
        )}
      </div>

      {/* Settings gear - bottom right */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="fixed bottom-6 right-6 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/60 border border-neutral-700/50 transition-colors"
        title="Settings"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Settings Slide-over */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSettingsOpen(false)} />
          <div className="relative w-full max-w-sm bg-neutral-900 border-l border-neutral-800 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="text-neutral-400 hover:text-white text-xl">✕</button>
            </div>

            {/* Trigger Mode Toggle */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-300">Trigger Mode</h3>
              <div className="flex rounded-lg overflow-hidden border border-neutral-700">
                <button
                  onClick={() => updateConfig({ triggerMode: 'voice' })}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    config.triggerMode === 'voice'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-300'
                  }`}
                >
                  🎙 Voice
                </button>
                <button
                  onClick={() => updateConfig({ triggerMode: 'clap' })}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    config.triggerMode === 'clap'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-300'
                  }`}
                >
                  👏 Clap
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                {config.triggerMode === 'voice'
                  ? 'Say "Jarvis" to open your links. Uses browser speech recognition.'
                  : 'Clap twice to open your links. Requires noise calibration.'}
              </p>
            </div>

            <hr className="border-neutral-800" />

            {/* Jarvis Response */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-neutral-300">Jarvis Response</h3>
              <p className="text-[11px] text-neutral-500">What Jarvis says when triggered. Leave empty to stay silent.</p>
              <textarea
                value={config.responseText}
                onChange={(e) => updateConfig({ responseText: e.target.value })}
                rows={2}
                className="w-full bg-neutral-800 text-sm rounded px-3 py-2 placeholder:text-neutral-500 resize-none border border-neutral-700 focus:border-cyan-600 focus:outline-none"
                placeholder="Right away sir. Opening your presentation now."
              />
              <VoicePicker
                responseText={config.responseText}
                voiceName={config.voiceName}
                onVoiceChange={(v) => updateConfig({ voiceName: v })}
              />
            </div>

            <hr className="border-neutral-800" />

            {/* Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-neutral-300">Actions</h3>
              <p className="text-[11px] text-neutral-500">URLs opened on trigger. Allow popups for this site.</p>
              <ActionList actions={config.actions} onUpdate={(actions) => updateConfig({ actions })} />
              <button
                onClick={fireActions}
                className="w-full py-2 text-sm bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
              >
                Test All Actions
              </button>
            </div>

            {/* Clap-only settings */}
            {config.triggerMode === 'clap' && (
              <>
                <hr className="border-neutral-800" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-300">Clap Sensitivity</h3>
                    <button onClick={() => updateConfig({ detection: DEFAULT_DETECTION })} className="text-xs text-neutral-500 hover:text-neutral-300">Reset</button>
                  </div>
                  <Slider label="Threshold" value={config.detection.thresholdMultiplier} min={1} max={10} step={0.5} unit="x" onChange={(v) => updateConfig({ detection: { ...config.detection, thresholdMultiplier: v } })} />
                  <Slider label="Min Gap" value={config.detection.clapWindowMinMs} min={50} max={400} step={10} unit="ms" onChange={(v) => updateConfig({ detection: { ...config.detection, clapWindowMinMs: v } })} />
                  <Slider label="Max Gap" value={config.detection.clapWindowMaxMs} min={300} max={1500} step={50} unit="ms" onChange={(v) => updateConfig({ detection: { ...config.detection, clapWindowMaxMs: v } })} />
                  <Slider label="Cooldown" value={config.detection.cooldownMs} min={500} max={5000} step={100} unit="ms" onChange={(v) => updateConfig({ detection: { ...config.detection, cooldownMs: v } })} />
                </div>

                <hr className="border-neutral-800" />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-neutral-300">Calibration</h3>
                  <div className="text-xs text-neutral-500">
                    Noise floor: {config.noiseFloorAmplitude !== null ? `${(config.noiseFloorAmplitude * 100).toFixed(1)}%` : 'Not set'} ·
                    Threshold: {(threshold * 100).toFixed(1)}%
                  </div>
                  <button
                    onClick={handleCalibrate}
                    disabled={isCalibrating}
                    className="w-full py-2 text-sm bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded transition-colors"
                  >
                    {isCalibrating ? 'Calibrating...' : 'Recalibrate Noise Floor'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Action List ---
function ActionList({ actions, onUpdate }: { actions: Action[]; onUpdate: (a: Action[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const toggle = (id: string) => onUpdate(actions.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  const remove = (id: string) => onUpdate(actions.filter((a) => a.id !== id));
  const add = () => {
    if (!label || !url) return;
    onUpdate([...actions, { id: Date.now().toString(), type: 'url', label, value: url, enabled: true }]);
    setAdding(false);
    setLabel('');
    setUrl('');
  };

  return (
    <div className="space-y-1">
      {actions.map((action) => (
        <div key={action.id} className="flex items-center gap-2 p-2 bg-neutral-800 rounded group">
          <input type="checkbox" checked={action.enabled} onChange={() => toggle(action.id)} className="accent-green-500" />
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{action.label}</div>
            <div className="text-xs text-neutral-500 truncate">{action.value}</div>
          </div>
          <button onClick={() => remove(action.id)} className="px-1 text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100">✕</button>
        </div>
      ))}
      {adding ? (
        <div className="p-2 bg-neutral-800 rounded space-y-2">
          <input type="text" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full bg-neutral-700 text-sm rounded px-2 py-1.5 placeholder:text-neutral-500" />
          <input type="text" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} className="w-full bg-neutral-700 text-sm rounded px-2 py-1.5 placeholder:text-neutral-500" />
          <div className="flex gap-2">
            <button onClick={add} className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 rounded">Add</button>
            <button onClick={() => setAdding(false)} className="px-3 py-1 text-xs bg-neutral-600 hover:bg-neutral-500 rounded">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="w-full py-1.5 text-sm text-neutral-500 border border-dashed border-neutral-700 rounded hover:border-neutral-500 transition-colors">+ Add</button>
      )}
    </div>
  );
}

// --- Speak helper ---
function speak(text: string, voiceName: string | null) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 0.9;
  const voices = speechSynthesis.getVoices();
  if (voiceName) {
    const match = voices.find((v) => v.name === voiceName);
    if (match) utterance.voice = match;
  } else {
    const fallback = voices.find((v) => v.lang === 'en-GB') || voices.find((v) => v.lang.startsWith('en'));
    if (fallback) utterance.voice = fallback;
  }
  speechSynthesis.speak(utterance);
}

// --- Voice Picker ---
function VoicePicker({ responseText, voiceName, onVoiceChange }: { responseText: string; voiceName: string | null; onVoiceChange: (v: string | null) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const load = () => {
      const v = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
      setVoices(v);
    };
    load();
    speechSynthesis.onvoiceschanged = load;
  }, []);

  return (
    <div className="space-y-2">
      <select
        value={voiceName || ''}
        onChange={(e) => onVoiceChange(e.target.value || null)}
        className="w-full bg-neutral-800 text-sm rounded px-2 py-2 border border-neutral-700"
      >
        <option value="">Auto (British English)</option>
        {voices.map((v) => (
          <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
        ))}
      </select>
      <button
        onClick={() => speak(responseText || 'Hello, I am Jarvis.', voiceName)}
        className="w-full py-2 text-sm bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
      >
        Preview Voice
      </button>
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-neutral-400">{label}</span>
        <span className="text-neutral-300">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-green-500" />
    </div>
  );
}
