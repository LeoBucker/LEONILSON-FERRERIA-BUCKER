import React from 'react';
import { Activity, Clock, Mic, Sparkles, Sliders } from 'lucide-react';
import { ToneAnalysis, RhythmAnalysis, TimbreAnalysis, LinguisticStyle } from '../types.ts';

interface VocalMetricsCardProps {
  tone: ToneAnalysis;
  rhythm: RhythmAnalysis;
  timbre: TimbreAnalysis;
  linguisticStyle: LinguisticStyle;
  suggestedVoice?: string;
}

export function VocalMetricsCard({
  tone,
  rhythm,
  timbre,
  linguisticStyle,
  suggestedVoice,
}: VocalMetricsCardProps) {
  return (
    <div className="space-y-6">
      {/* 3 Acoustic Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: Tom (Tone / Pitch) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Tom (Pitch)</h4>
                <p className="text-xs text-slate-400">Frequência & Entonação</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-bold text-cyan-400">
                {tone.pitchHzEstimate || 140}
                <span className="text-xs font-normal text-slate-400 ml-0.5">Hz</span>
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Classificação</div>
              <p className="text-xs font-medium text-slate-200 mt-0.5">{tone.classification}</p>
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Expressividade Emocional</div>
              <p className="text-xs text-slate-300 mt-0.5">{tone.emotionalQuality}</p>
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Modulação Melódica</div>
              <p className="text-xs text-slate-300 mt-0.5">{tone.melodyDescription}</p>
            </div>

            <div className="pt-1">
              <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                <span>Estabilidade de Altura</span>
                <span className="font-mono text-cyan-400">{tone.score || 85}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, tone.score || 85))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 2: Ritmo (Rhythm / Tempo) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-emerald-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Ritmo (Cadence)</h4>
                <p className="text-xs text-slate-400">Velocidade & Pausas</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-bold text-emerald-400">
                {rhythm.estimatedWpm || 130}
                <span className="text-xs font-normal text-slate-400 ml-0.5">PPM</span>
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Cadência de Fala</div>
              <p className="text-xs font-medium text-slate-200 mt-0.5">{rhythm.cadence}</p>
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Padrão de Respiração & Pausas</div>
              <p className="text-xs text-slate-300 mt-0.5">{rhythm.pauseStyle}</p>
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Categoria de Tempo</div>
              <p className="text-xs text-slate-300 mt-0.5">{rhythm.tempoCategory}</p>
            </div>

            <div className="pt-1">
              <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                <span>Fluidez Rítmica</span>
                <span className="font-mono text-emerald-400">{rhythm.score || 88}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, rhythm.score || 88))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 3: Timbre (Timbre / Vocal Texture) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-indigo-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">Timbre (Texture)</h4>
                <p className="text-xs text-slate-400">Ressonância & Corpo</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-medium text-indigo-400">
                {timbre.vocalWeight || 'Médio'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Ressonância Acústica</div>
              <p className="text-xs font-medium text-slate-200 mt-0.5">{timbre.resonance}</p>
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Textura Vocal</div>
              <p className="text-xs text-slate-300 mt-0.5">{timbre.texture}</p>
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Brilho Espectral</div>
              <p className="text-xs text-slate-300 mt-0.5">{timbre.brightness}</p>
            </div>

            <div className="pt-1">
              <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                <span>Calor & Presença Harmônica</span>
                <span className="font-mono text-indigo-400">{timbre.score || 90}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, timbre.score || 90))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linguistic & Persona Style Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Perfil Verbal & Marcadores de Persona
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-400">Nível de Formalidade: </span>
            <span className="font-medium text-slate-200">{linguisticStyle.formality}</span>
          </div>
          <div>
            <span className="text-slate-400">Sotaque & Dialeto: </span>
            <span className="font-medium text-slate-200">{linguisticStyle.accentAndIdiom}</span>
          </div>
          <div>
            <span className="text-slate-400">Maneirismos: </span>
            <span className="font-medium text-slate-200">{linguisticStyle.mannerisms}</span>
          </div>
        </div>
        {suggestedVoice && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Voz Gemini TTS associada: <strong className="text-slate-200">{suggestedVoice}</strong></span>
            <span className="text-[11px] text-slate-500 font-mono">Modulação prosódica ativa</span>
          </div>
        )}
      </div>
    </div>
  );
}
