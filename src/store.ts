import type { AppConfig } from './shared/types';
import { DEFAULT_DETECTION, DEFAULT_ACTIONS } from './shared/types';

const STORAGE_KEY = 'claplaunch-config';

const DEFAULT_CONFIG: AppConfig = {
  actions: DEFAULT_ACTIONS,
  detection: DEFAULT_DETECTION,
  noiseFloorAmplitude: null,
  listeningEnabled: true,
  triggerMode: 'voice',
  responseText: 'Right away sir. Opening your presentation now.',
  voiceName: null,
};

export function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveConfig(config: AppConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
