import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Upload,
  Sparkles,
  Play,
  Square,
  RefreshCw,
  HelpCircle,
  FileAudio,
  Radio,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  Wand2,
  Volume2,
  Zap,
  Ear
} from 'lucide-react';
import { AudioVisualizer } from './components/AudioVisualizer.tsx';
import { AudioPlayerCustom } from './components/AudioPlayerCustom.tsx';
import { VocalMetricsCard } from './components/VocalMetricsCard.tsx';
import { VoicePlayground } from './components/VoicePlayground.tsx';
import { VoiceAnalysisResult, PresetSample } from './types.ts';

export default function App() {
  // Automatic mode (enabled by default)
  const [autoMode, setAutoMode] = useState(true);
  const autoModeRef = useRef(autoMode);
  useEffect(() => {
    autoModeRef.current = autoMode;
  }, [autoMode]);

  // Input mode: 'record' | 'upload' | 'preset'
  const [inputMode, setInputMode] = useState<'record' | 'upload' | 'preset'>('record');

  // Microphone recording states
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Voice Activity & Silence Detection (VAD)
  const [vadState, setVadState] = useState<'idle' | 'listening' | 'speaking' | 'silence_countdown'>('idle');
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const vadAnimRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Audio source data
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [audioFileName, setAudioFileName] = useState<string>('');

  // Presets
  const [presets, setPresets] = useState<PresetSample[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [loadingPresetAudio, setLoadingPresetAudio] = useState(false);

  // Question to answer in replicated voice
  const [question, setQuestion] = useState(
    'Como você se apresentaria e o que você acha sobre clonagem e síntese de voz?'
  );
  const questionRef = useRef(question);
  useEffect(() => {
    questionRef.current = question;
  }, [question]);

  // Analysis & Replication execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<VoiceAnalysisResult | null>(null);
  const [replicatedAudioUrl, setReplicatedAudioUrl] = useState<string | null>(null);
  const [voiceUsed, setVoiceUsed] = useState<string>('Charon');
  const [stylePrompt, setStylePrompt] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoPlayedNotification, setAutoPlayedNotification] = useState<boolean>(false);

  // Active view comparison tab: 'results' | 'comparison' | 'playground'
  const [activeTab, setActiveTab] = useState<'results' | 'comparison' | 'playground'>('results');

  // Load sample presets on mount
  useEffect(() => {
    fetch('/api/sample-presets')
      .then((res) => res.json())
      .then((data) => {
        if (data.presets) {
          setPresets(data.presets);
        }
      })
      .catch((err) => console.error('Failed to load presets:', err));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (vadAnimRef.current) cancelAnimationFrame(vadAnimRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [micStream]);

  // Convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Execute Analysis and Replication Core
  const executeAnalysisAndReplication = async (
    sourceBlob: Blob | null,
    mime: string,
    targetQuestion: string
  ) => {
    if (!sourceBlob && !audioUrl) {
      setErrorMessage('Por favor, forneça um áudio para análise.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setAutoPlayedNotification(false);
    setProcessingStep('Preparando áudio...');

    try {
      let rawBase64 = '';
      if (sourceBlob) {
        rawBase64 = await blobToBase64(sourceBlob);
      } else if (audioUrl && audioUrl.startsWith('data:')) {
        rawBase64 = audioUrl;
      }

      // Extract clean base64 data and mimeType
      let cleanData = rawBase64;
      let detectedMime = mime || audioMimeType || 'audio/webm';
      if (cleanData.startsWith('data:')) {
        const commaIdx = cleanData.indexOf(',');
        if (commaIdx !== -1) {
          const header = cleanData.slice(5, commaIdx);
          const mimePart = header.split(';')[0];
          if (mimePart) detectedMime = mimePart;
          cleanData = cleanData.slice(commaIdx + 1);
        }
      }
      const cleanMime = detectedMime.split(';')[0].trim();

      setProcessingStep('Analisando Tom (F0), Ritmo (Cadência) e Timbre (Harmônicos)...');

      const response = await fetch('/api/analyze-and-replicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: cleanData,
          mimeType: cleanMime,
          question: targetQuestion.trim() || 'Como você se apresentaria mantendo seu estilo vocal?',
        }),
      });

      setProcessingStep('Sintetizando resposta falada no seu estilo vocal...');

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar análise e replicação.');
      }

      setAnalysisResult(result.analysis);
      setReplicatedAudioUrl(result.responseAudio);
      setVoiceUsed(result.voiceUsed || 'Charon');
      setStylePrompt(result.stylePrompt || '');
      setActiveTab('results');
      setAutoPlayedNotification(true);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro ao processar áudio. Verifique se a chave de API está configurada.'
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Start microphone recording with automated silence detection
  const startRecording = async () => {
    setErrorMessage(null);
    setAutoPlayedNotification(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      setAudioMimeType(mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(recordedBlob);
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);
        setAudioFileName('Gravacao_Microfone.webm');
        stream.getTracks().forEach((t) => t.stop());
        setMicStream(null);
        setVadState('idle');
        setSilenceCountdown(null);

        // AUTO-TRIGGER: If autoMode is active, immediately start analysis and speak answer!
        if (autoModeRef.current) {
          await executeAnalysisAndReplication(recordedBlob, mimeType, questionRef.current);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingDuration(0);
      setVadState('listening');

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Setup VAD (Voice Activity Detection) via Web Audio API
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const buffer = new Uint8Array(analyser.frequencyBinCount);
        let hasSpoken = false;
        let silenceStartTime: number | null = null;
        const SILENCE_TIMEOUT_MS = 1800; // 1.8 seconds of silence to auto-finish
        const SPEECH_THRESHOLD = 18; // Average frequency amplitude threshold

        const checkAudioLevels = () => {
          if (!isRecordingRef.current) return;

          (analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i];
          }
          const avgLevel = sum / buffer.length;
          const now = Date.now();

          if (avgLevel > SPEECH_THRESHOLD) {
            hasSpoken = true;
            silenceStartTime = null;
            setVadState('speaking');
            setSilenceCountdown(null);
          } else if (hasSpoken) {
            if (!silenceStartTime) {
              silenceStartTime = now;
              setVadState('silence_countdown');
            }
            const silenceElapsed = now - silenceStartTime;
            const remainingSecs = Math.max(0, Math.ceil((SILENCE_TIMEOUT_MS - silenceElapsed) / 1000));
            setSilenceCountdown(remainingSecs);

            // If silence exceeded and autoMode is enabled, automatically stop recording!
            if (silenceElapsed >= SILENCE_TIMEOUT_MS && autoModeRef.current) {
              stopRecording();
              return;
            }
          } else {
            setVadState('listening');
          }

          vadAnimRef.current = requestAnimationFrame(checkAudioLevels);
        };

        vadAnimRef.current = requestAnimationFrame(checkAudioLevels);
      } catch (vadErr) {
        console.warn('VAD AudioContext setup skipped:', vadErr);
      }
    } catch (err: unknown) {
      console.error('Microphone access denied:', err);
      setErrorMessage(
        'Acesso ao microfone negado ou não suportado no navegador. Você pode carregar um arquivo de áudio ou utilizar os presets brasileiros abaixo.'
      );
    }
  };

  // Stop microphone recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (vadAnimRef.current) cancelAnimationFrame(vadAnimRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      mediaRecorderRef.current.stop();
    }
  };

  // Discard recorded audio
  const discardAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioFileName('');
    setAnalysisResult(null);
    setReplicatedAudioUrl(null);
    setAutoPlayedNotification(false);
  };

  // Handle file upload with automatic processing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const mime = file.type || 'audio/wav';

    setAudioMimeType(mime);
    setAudioFileName(file.name);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setSelectedPresetId(null);

    // AUTO-TRIGGER: If autoMode is active, automatically analyze and speak response!
    if (autoMode) {
      await executeAnalysisAndReplication(file, mime, question);
    }
  };

  // Load a preset sample with automatic processing
  const handleSelectPreset = async (preset: PresetSample) => {
    setSelectedPresetId(preset.id);
    setLoadingPresetAudio(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/sample-audio/${preset.id}`);
      const data = await res.json();
      if (!res.ok || !data.audioData) {
        throw new Error(data.error || 'Erro ao carregar amostra.');
      }

      setAudioUrl(data.audioData);
      setAudioMimeType('audio/wav');
      setAudioFileName(`${preset.title}.wav`);
      const targetQuestion = preset.sampleQuestion || question;
      setQuestion(targetQuestion);

      const fetchBlob = await fetch(data.audioData).then((r) => r.blob());
      setAudioBlob(fetchBlob);

      // AUTO-TRIGGER: If autoMode is active, automatically process and speak response!
      if (autoMode) {
        await executeAnalysisAndReplication(fetchBlob, 'audio/wav', targetQuestion);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar amostra');
    } finally {
      setLoadingPresetAudio(false);
    }
  };

  const sampleQuestions = [
    'Como você se apresentaria e o que você acha sobre clonagem de voz?',
    'Explique de forma simples como funciona a inteligência artificial.',
    'Dê uma dica valiosa para começar bem o dia de trabalho.',
    'O que torna a voz humana tão expressiva e única?',
  ];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-950/50">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">VocalCloner AI</span>
                <span className="text-[11px] font-mono text-cyan-400">Gemini 3.8</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Análise Acústica & Réplica Vocal Automatizada
              </p>
            </div>
          </div>

          {/* Auto-Mode Toggle Header */}
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setAutoMode(!autoMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                autoMode
                  ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-950/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Ativar/desativar resposta e reprodução automática"
            >
              <Zap className={`w-3.5 h-3.5 ${autoMode ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="font-medium">Resposta Automática:</span>
              <span className="font-bold">{autoMode ? 'LIGADA' : 'MANUAL'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Automatic Mode Notification Banner */}
        {autoMode && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-slate-900/60 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-cyan-200">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Modo Automático Ativo:</strong> Basta falar no microfone (ou escolher uma amostra). Ao parar de falar, o app detecta o fim da fala, analisa seu tom/ritmo/timbre e <strong>fala a resposta automaticamente na sua voz</strong> sem precisar clicar em nenhum botão!
              </span>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-3 text-rose-200 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Atenção</p>
              <p className="text-xs text-rose-300 mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-rose-200 underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Step 1 & 2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column Left (Input Audio & Question) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Input Mode Selector */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono text-xs flex items-center justify-center font-bold">
                    1
                  </span>
                  <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                    Sua Voz (Grave ou Escolha)
                  </h2>
                </div>
                {audioUrl && (
                  <button
                    onClick={discardAudio}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Gravar novamente</span>
                  </button>
                )}
              </div>

              {/* Segmented control for input mode */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setInputMode('record')}
                  className={`py-2 px-3 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    inputMode === 'record'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Gravar Microfone</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`py-2 px-3 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    inputMode === 'upload'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Enviar Arquivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('preset')}
                  className={`py-2 px-3 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    inputMode === 'preset'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Amostras Prontas</span>
                </button>
              </div>

              {/* Mode: Microphone Recording */}
              {inputMode === 'record' && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center">
                    {isRecording ? (
                      <div className="space-y-4 w-full">
                        <div className="flex items-center justify-center gap-3">
                          <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                          <span className="font-mono text-xl font-bold text-rose-400">
                            {formatTimer(recordingDuration)}
                          </span>

                          {/* Live VAD feedback state */}
                          {vadState === 'speaking' && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/40 flex items-center gap-1 animate-pulse">
                              <Volume2 className="w-3 h-3" />
                              Voz detectada
                            </span>
                          )}
                          {vadState === 'silence_countdown' && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/40 flex items-center gap-1 animate-pulse">
                              <Ear className="w-3 h-3" />
                              Silêncio... respondendo em {silenceCountdown}s
                            </span>
                          )}
                          {vadState === 'listening' && (
                            <span className="text-xs text-slate-400">
                              Ouvindo... comece a falar
                            </span>
                          )}
                        </div>

                        {/* Real-time Visualizer */}
                        <AudioVisualizer
                          mediaStream={micStream}
                          isPlaying={true}
                          color="cyan"
                          height={54}
                          barCount={48}
                        />

                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Fale sua mensagem ou pergunta. Ao fazer uma pausa, o sistema finalizará e responderá <strong>automaticamente</strong>!
                        </p>

                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 mx-auto shadow-lg shadow-rose-950/50 transition-colors"
                        >
                          <Square className="w-4 h-4 fill-current" />
                          <span>Concluir Agora & Responder</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
                          <Mic className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-slate-100">
                            Clique para falar
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm mt-1">
                            Fale por alguns segundos com seu tom e ritmo naturais. O app responde e fala a réplica de forma 100% automática ao final da fala!
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={startRecording}
                          className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 mx-auto shadow-md transition-all active:scale-95"
                        >
                          <Mic className="w-4 h-4" />
                          <span>Iniciar & Falar Agora</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode: File Upload */}
              {inputMode === 'upload' && (
                <div className="space-y-3 pt-2">
                  <label className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 hover:border-slate-700 cursor-pointer text-center transition-colors">
                    <FileAudio className="w-10 h-10 text-cyan-400/80 mb-2" />
                    <p className="text-sm font-medium text-slate-200">Clique para enviar seu arquivo de áudio</p>
                    <p className="text-xs text-slate-400 mt-1">Formatos: WAV, MP3, M4A, WEBM, OGG</p>
                    {autoMode && (
                      <p className="text-[11px] text-cyan-400 mt-2 font-medium">
                        ⚡ O áudio será analisado e respondido automaticamente ao enviar!
                      </p>
                    )}
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Mode: Presets */}
              {inputMode === 'preset' && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-slate-400">
                    Clique em qualquer amostra para carregar e disparar a resposta automática instantaneamente:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {presets.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cyan-950/30 border-cyan-500/60 shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-semibold text-slate-100">{preset.title}</h4>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{preset.description}</p>
                          <div className="mt-2 text-[10px] text-cyan-400 font-mono">
                            Voz: {preset.voice}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {loadingPresetAudio && (
                    <div className="text-center py-2 text-xs text-cyan-400 animate-pulse">
                      Carregando e processando automaticamente...
                    </div>
                  )}
                </div>
              )}

              {/* Audio Player for the selected/recorded audio */}
              {audioUrl && !isRecording && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium text-slate-300">Áudio de Entrada Analisado</span>
                    <span className="font-mono text-[11px] text-slate-400">{audioFileName}</span>
                  </div>
                  <AudioPlayerCustom
                    src={audioUrl}
                    title="Sua Voz de Referência"
                    subtitle={audioFileName || 'Gravação do Usuário'}
                    badge="Entrada"
                    theme="emerald"
                    showDownload={true}
                    downloadFilename="audio-original.wav"
                  />
                </div>
              )}
            </div>

            {/* Step 2: Question & Vocal Replication Prompt */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                  Pergunta a ser respondida
                </h2>
              </div>

              <p className="text-xs text-slate-400">
                Se você fizer uma pergunta diretamente no áudio gravado, a IA responderá a ela! Ou escolha/edite o tópico abaixo:
              </p>

              {/* Suggested Questions */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-slate-400">Sugestões de tópicos:</div>
                <div className="flex flex-wrap gap-1.5">
                  {sampleQuestions.map((sq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuestion(sq)}
                      className={`text-left text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                        question === sq
                          ? 'bg-slate-800 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Text Area */}
              <div>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={2}
                  placeholder="Escreva a pergunta que a voz clonada deve responder..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors resize-none"
                />
              </div>

              {/* Manual action button (optional fallback if autoMode is off or to rerun) */}
              <button
                type="button"
                onClick={() => executeAnalysisAndReplication(audioBlob, audioMimeType, question)}
                disabled={isProcessing || (!audioBlob && !audioUrl)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition-all active:scale-[0.99]"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                    <span>{processingStep || 'Processando automaticamente...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-cyan-200" />
                    <span>{autoMode ? 'Re-executar Análise & Resposta' : 'Analisar & Gerar Resposta'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Column Right (Results & Output) */}
          <div className="lg:col-span-5 space-y-6">
            {isProcessing ? (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-cyan-500/30 text-center space-y-4 h-full flex flex-col items-center justify-center min-h-[380px]">
                <div className="w-16 h-16 rounded-full bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 animate-spin">
                  <RefreshCw className="w-8 h-8" />
                </div>
                <div className="max-w-xs space-y-2">
                  <h3 className="text-base font-bold text-slate-100">
                    Processando Automaticamente
                  </h3>
                  <p className="text-xs text-cyan-300 animate-pulse">
                    {processingStep || 'Analisando características da voz e gerando fala...'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    A voz replicada falará assim que terminar!
                  </p>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="space-y-6">
                {/* Result Navigation Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setActiveTab('results')}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                      activeTab === 'results'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Réplica & Resposta
                  </button>
                  <button
                    onClick={() => setActiveTab('comparison')}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                      activeTab === 'comparison'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Comparador A/B
                  </button>
                  <button
                    onClick={() => setActiveTab('playground')}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                      activeTab === 'playground'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Playground
                  </button>
                </div>

                {activeTab === 'results' && (
                  <div className="space-y-6">
                    {/* Auto-play badge notification */}
                    {autoPlayedNotification && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Resposta gerada e reproduzida automaticamente no seu estilo vocal!</span>
                      </div>
                    )}

                    {/* Replicated Audio Player with autoPlay enabled */}
                    {replicatedAudioUrl && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Volume2 className="w-4 h-4" />
                            Áudio da Réplica Vocal Gerada
                          </span>
                          <span className="font-mono text-slate-400">Gemini 3.8 Flash TTS</span>
                        </div>
                        <AudioPlayerCustom
                          src={replicatedAudioUrl}
                          title="Resposta na Sua Voz Replicada"
                          subtitle="Síntese com modulação de tom, ritmo e timbre"
                          badge="Réplica IA"
                          theme="cyan"
                          autoPlay={true}
                          downloadFilename="resposta-voz-replicada.wav"
                        />
                      </div>
                    )}

                    {/* Replicated Text Answer */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-slate-200 uppercase tracking-wider">
                          Texto da Resposta Replicada
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Estilo: {analysisResult.linguisticStyle?.formality}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed italic bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                        "{analysisResult.replicatedResponseText}"
                      </p>
                    </div>

                    {/* Original Transcription Card */}
                    {analysisResult.transcription && (
                      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Transcrição do Áudio Original
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          "{analysisResult.transcription}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'comparison' && (
                  <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      Comparador Direto (Original vs Replicada)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ouça alternadamente ambos os áudios para comparar a similaridade do tom melódico, cadência das pausas e corpo tímbrico:
                    </p>

                    <div className="space-y-4">
                      {audioUrl && (
                        <div>
                          <div className="text-xs font-semibold text-emerald-400 mb-1.5">
                            Áudio Original (Gravação Fornecida)
                          </div>
                          <AudioPlayerCustom
                            src={audioUrl}
                            title="Amostra de Referência"
                            badge="Original"
                            theme="emerald"
                            showDownload={false}
                          />
                        </div>
                      )}

                      {replicatedAudioUrl && (
                        <div>
                          <div className="text-xs font-semibold text-cyan-400 mb-1.5">
                            Voz Replicada (Síntese da Resposta)
                          </div>
                          <AudioPlayerCustom
                            src={replicatedAudioUrl}
                            title="Síntese Vocal da Resposta"
                            badge="Replicada"
                            theme="cyan"
                            showDownload={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'playground' && (
                  <VoicePlayground
                    voiceUsed={voiceUsed}
                    stylePrompt={stylePrompt}
                    personaSummary={analysisResult.linguisticStyle?.summary || ''}
                  />
                )}
              </div>
            ) : (
              /* Empty state before running analysis */
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-4 h-full flex flex-col items-center justify-center min-h-[380px]">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                  <Sliders className="w-7 h-7" />
                </div>
                <div className="max-w-xs">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Aguardando Entrada de Voz
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Com o <strong>Modo Automático ativo</strong>, assim que você terminar de falar no microfone ou escolher uma amostra, o aplicativo iniciará o processo e responderá com sua voz clonada de forma automática!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Acoustic Breakdown (Tom, Ritmo, Timbre) */}
        {analysisResult && (
          <section className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Relatório Acústico: Tom, Ritmo & Timbre
                </h3>
                <p className="text-xs text-slate-400">
                  Parâmetros extraídos pelo modelo de áudio Gemini a partir das ondas e inflexões do seu áudio.
                </p>
              </div>
            </div>

            <VocalMetricsCard
              tone={analysisResult.tone}
              rhythm={analysisResult.rhythm}
              timbre={analysisResult.timbre}
              linguisticStyle={analysisResult.linguisticStyle}
              suggestedVoice={voiceUsed}
            />
          </section>
        )}
      </main>
    </div>
  );
}
