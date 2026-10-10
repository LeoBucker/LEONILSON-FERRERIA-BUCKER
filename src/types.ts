export interface ToneAnalysis {
  pitchHzEstimate: number;
  classification: string;
  emotionalQuality: string;
  melodyDescription: string;
  score: number;
}

export interface RhythmAnalysis {
  estimatedWpm: number;
  cadence: string;
  pauseStyle: string;
  tempoCategory: string;
  score: number;
}

export interface TimbreAnalysis {
  resonance: string;
  texture: string;
  brightness: string;
  vocalWeight: string;
  score: number;
}

export interface LinguisticStyle {
  formality: string;
  accentAndIdiom: string;
  mannerisms: string;
  summary: string;
}

export interface VoiceAnalysisResult {
  transcription: string;
  tone: ToneAnalysis;
  rhythm: RhythmAnalysis;
  timbre: TimbreAnalysis;
  linguisticStyle: LinguisticStyle;
  suggestedVoice: string;
  vocalStylePrompt: string;
  replicatedResponseText: string;
}

export interface PresetSample {
  id: string;
  title: string;
  description: string;
  transcript: string;
  voice: string;
  style: string;
  sampleQuestion: string;
}
