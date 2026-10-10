import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  mediaStream?: MediaStream | null;
  audioElement?: HTMLAudioElement | null;
  isPlaying?: boolean;
  color?: 'emerald' | 'cyan' | 'indigo' | 'amber';
  height?: number;
  barCount?: number;
}

export function AudioVisualizer({
  mediaStream,
  audioElement,
  isPlaying = false,
  color = 'cyan',
  height = 64,
  barCount = 48,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Setup Web Audio Analyser if stream or element is provided
  useEffect(() => {
    let active = true;

    if (mediaStream) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;

        const source = ctx.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
      } catch (err) {
        console.warn('Could not create AudioContext for stream:', err);
      }
    }

    return () => {
      active = false;
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch {}
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch {}
        audioContextRef.current = null;
      }
    };
  }, [mediaStream]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      const analyser = analyserRef.current;
      let dataArray: Uint8Array | null = null;

      if (analyser && mediaStream) {
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        (analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(dataArray);
      }

      const barWidth = Math.max(2, (width / barCount) - 2);

      // Colors
      const colorGradients: Record<string, [string, string]> = {
        emerald: ['#10b981', '#059669'],
        cyan: ['#06b6d4', '#0284c7'],
        indigo: ['#6366f1', '#4f46e5'],
        amber: ['#f59e0b', '#d97706'],
      };
      const [startColor, endColor] = colorGradients[color] || colorGradients.cyan;

      for (let i = 0; i < barCount; i++) {
        let value = 0;

        if (dataArray && dataArray.length > 0) {
          const index = Math.floor((i / barCount) * dataArray.length);
          value = dataArray[index] / 255;
        } else if (isPlaying) {
          // Synthetic dynamic wave based on trigonometric synthesis
          const freq1 = Math.sin(phase + i * 0.3) * 0.5 + 0.5;
          const freq2 = Math.cos(phase * 1.4 + i * 0.15) * 0.5 + 0.5;
          const noise = (Math.sin(i * 13.37 + phase * 2) * 0.2 + 0.8);
          value = ((freq1 * 0.6 + freq2 * 0.4) * noise) * 0.85 + 0.15;
        } else {
          // Idle ambient state
          value = 0.08 + Math.sin(i * 0.4 + phase * 0.2) * 0.04;
        }

        const barHeight = Math.max(3, value * (h - 8));
        const x = i * (barWidth + 2);
        const y = (h - barHeight) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, startColor);
        grad.addColorStop(1, endColor);

        ctx.fillStyle = grad;
        // Rounded bars
        const radius = Math.min(barWidth / 2, 2);
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      phase += isPlaying || mediaStream ? 0.08 : 0.02;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mediaStream, isPlaying, color, barCount]);

  return (
    <div className="w-full overflow-hidden rounded-lg bg-slate-950/40 p-2 border border-slate-800/80">
      <canvas
        ref={canvasRef}
        width={480}
        height={height}
        className="w-full h-full block"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
