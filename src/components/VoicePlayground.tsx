import React, { useState } from 'react';
import { Send, Volume2, Loader2, Sparkles } from 'lucide-react';
import { AudioPlayerCustom } from './AudioPlayerCustom.tsx';

interface VoicePlaygroundProps {
  voiceUsed: string;
  stylePrompt: string;
  personaSummary: string;
}

export function VoicePlayground({
  voiceUsed,
  stylePrompt,
  personaSummary,
}: VoicePlaygroundProps) {
  const [customText, setCustomText] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: customText.trim(),
          voiceName: voiceUsed || 'Charon',
          style: stylePrompt || 'Brazilian Portuguese natural speaker',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.audioData) {
        throw new Error(data.error || 'Erro ao gerar fala com a voz replicada');
      }

      setAudioUrl(data.audioData);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Falha na síntese');
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'Agradeço imensamente por você ter testado essa replicação vocal!',
    'A tecnologia de áudio multimodal permite capturar cadência e tom com precisão.',
    'Tenha um excelente dia de trabalho e até a próxima!',
  ];

  return (
    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-semibold text-slate-100">
            Playground da Voz Clonada
          </h4>
        </div>
        <span className="text-xs text-slate-400">
          Voz configurada: <span className="font-mono text-cyan-400">{voiceUsed}</span>
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Digite qualquer novo texto para ouvir a réplica vocal falando com o mesmo tom, ritmo e timbre analisados.
      </p>

      {/* Quick chip buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCustomText(p)}
            className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors border border-slate-700/50"
          >
            "{p}"
          </button>
        ))}
      </div>

      <form onSubmit={handleGenerate} className="space-y-3">
        <div className="relative">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={2}
            placeholder="Digite o que deseja que sua réplica vocal fale agora..."
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Modulação: {personaSummary || stylePrompt}
          </span>

          <button
            type="submit"
            disabled={loading || !customText.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sintetizando...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Falar com esta Voz</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300">
          {error}
        </div>
      )}

      {audioUrl && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <AudioPlayerCustom
            src={audioUrl}
            title="Nova Frase da Voz Clonada"
            subtitle={customText}
            badge="Gemini TTS"
            theme="cyan"
            downloadFilename="frase-clonada.wav"
          />
        </div>
      )}
    </div>
  );
}
