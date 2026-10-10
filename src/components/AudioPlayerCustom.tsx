import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, Download, Gauge } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer.tsx';

interface AudioPlayerCustomProps {
  src: string;
  title: string;
  subtitle?: string;
  badge?: string;
  theme?: 'emerald' | 'cyan' | 'indigo' | 'amber';
  onEnded?: () => void;
  showDownload?: boolean;
  downloadFilename?: string;
  autoPlay?: boolean;
}

export function AudioPlayerCustom({
  src,
  title,
  subtitle,
  badge,
  theme = 'cyan',
  onEnded,
  showDownload = true,
  downloadFilename = 'audio-replica.wav',
  autoPlay = false,
}: AudioPlayerCustomProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      if (autoPlay) {
        audio.play().then(() => setIsPlaying(true)).catch((e) => console.log('Autoplay request:', e));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onEnded) onEnded();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    if (autoPlay && src) {
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.log('Autoplay:', e));
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src, autoPlay, onEnded]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const changeRate = () => {
    const rates = [1, 1.25, 1.5, 0.8];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const themeColors = {
    cyan: {
      button: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30',
      progress: 'accent-cyan-400',
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-950/40',
      text: 'text-cyan-400',
    },
    emerald: {
      button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30',
      progress: 'accent-emerald-400',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-950/40',
      text: 'text-emerald-400',
    },
    indigo: {
      button: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30',
      progress: 'accent-indigo-400',
      border: 'border-indigo-500/30',
      glow: 'shadow-indigo-950/40',
      text: 'text-indigo-400',
    },
    amber: {
      button: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30',
      progress: 'accent-amber-400',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-950/40',
      text: 'text-amber-400',
    },
  }[theme];

  return (
    <div className={`p-4 rounded-xl bg-slate-900/90 border ${themeColors.border} shadow-lg ${themeColors.glow}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-100 truncate">{title}</h4>
            {badge && (
              <span className={`text-[11px] font-medium ${themeColors.text}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={changeRate}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono font-medium rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            title="Alterar velocidade de reprodução"
          >
            <Gauge className="w-3 h-3" />
            <span>{playbackRate}x</span>
          </button>

          {showDownload && (
            <a
              href={src}
              download={downloadFilename}
              className="p-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              title="Baixar arquivo de áudio"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Visualizer */}
      <div className="mb-3">
        <AudioVisualizer
          isPlaying={isPlaying}
          color={theme}
          height={48}
          barCount={40}
        />
      </div>

      {/* Timeline & Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-md ${themeColors.button}`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={restart}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            title="Reiniciar áudio"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex-1 flex flex-col justify-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer ${themeColors.progress}`}
            />
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
