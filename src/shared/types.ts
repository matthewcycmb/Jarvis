export interface Action {
  id: string;
  type: 'url';
  label: string;
  value: string;
  enabled: boolean;
}

export interface DetectionConfig {
  thresholdMultiplier: number;
  clapWindowMinMs: number;
  clapWindowMaxMs: number;
  cooldownMs: number;
  requiredClaps: number;
}

export type TriggerMode = 'clap' | 'voice';

export interface AppConfig {
  actions: Action[];
  detection: DetectionConfig;
  noiseFloorAmplitude: number | null;
  listeningEnabled: boolean;
  triggerMode: TriggerMode;
  responseText: string;
  voiceName: string | null;
}

export const DEFAULT_DETECTION: DetectionConfig = {
  thresholdMultiplier: 3,
  clapWindowMinMs: 200,
  clapWindowMaxMs: 600,
  cooldownMs: 2000,
  requiredClaps: 2,
};

export const DEFAULT_ACTIONS: Action[] = [
  {
    id: '1',
    type: 'url',
    label: 'Instagram Reels',
    value: 'https://www.instagram.com/reels/',
    enabled: true,
  },
  {
    id: '2',
    type: 'url',
    label: 'YouTube',
    value: 'https://www.youtube.com',
    enabled: true,
  },
];

export type DetectionStatus = 'listening' | 'paused' | 'calibrating' | 'triggered';
