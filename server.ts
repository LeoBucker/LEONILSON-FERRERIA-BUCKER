import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get GoogleGenAI client
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não encontrada nas variáveis de ambiente.');
  }
  return new GoogleGenAI({ apiKey });
}

// Helper to extract clean base64 data and sanitized MIME type
function parseAudioPayload(rawAudio: string, rawMimeType?: string): { base64Data: string; mimeType: string } {
  let base64Data = (rawAudio || '').trim();
  let detectedMime = (rawMimeType || '').trim();

  // If data URL scheme is present (e.g. data:audio/webm;codecs=opus;base64,XXXXX)
  if (base64Data.startsWith('data:')) {
    const commaIndex = base64Data.indexOf(',');
    if (commaIndex !== -1) {
      const header = base64Data.slice(5, commaIndex); // e.g. "audio/webm;codecs=opus;base64"
      base64Data = base64Data.slice(commaIndex + 1).trim();

      // Extract mime type before semicolon or parameters
      const parts = header.split(';');
      if (parts[0] && parts[0].includes('/')) {
        detectedMime = parts[0].trim();
      }
    }
  }

  // Strip any whitespace, linebreaks, or carriage returns from base64
  base64Data = base64Data.replace(/[\r\n\s]+/g, '');

  // Normalize mime type for Gemini API
  let cleanMime = (detectedMime || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (cleanMime === 'audio/x-m4a' || cleanMime === 'audio/m4a') {
    cleanMime = 'audio/mp4';
  } else if (cleanMime === 'audio/mpeg') {
    cleanMime = 'audio/mp3';
  } else if (!cleanMime.startsWith('audio/')) {
    cleanMime = 'audio/webm';
  }

  return { base64Data, mimeType: cleanMime };
}

// Map gender/vocal qualities to prebuilt voices
function mapToPrebuiltVoice(toneQuality: string = '', pitchHz: number = 150): 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' {
  const lower = toneQuality.toLowerCase();
  if (lower.includes('grave') || lower.includes('baixo') || pitchHz < 130) {
    return 'Fenrir'; // Deep masculine voice
  }
  if (lower.includes('feminina') || lower.includes('aguda') || pitchHz > 190) {
    return 'Kore'; // Clear feminine voice
  }
  if (lower.includes('calmo') || lower.includes('sereno') || lower.includes('suave')) {
    return 'Zephyr'; // Soft/calm voice
  }
  if (lower.includes('entusiasta') || lower.includes('energético') || lower.includes('jovem')) {
    return 'Puck'; // Energetic/bright voice
  }
  return 'Charon'; // Balanced, articulate voice
}

// API: Analyze audio and replicate voice style in response
app.post('/api/analyze-and-replicate', async (req, res) => {
  try {
    const { audioData, mimeType, question = 'Como você se apresentaria e o que você acha sobre clonagem de voz?' } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Nenhum dado de áudio recebido.' });
    }

    const { base64Data: cleanBase64, mimeType: cleanMimeType } = parseAudioPayload(audioData, mimeType);

    if (!cleanBase64) {
      return res.status(400).json({ error: 'Dados de áudio base64 vazios ou inválidos.' });
    }

    const ai = getGenAI();

    const promptText = `
Você é um especialista em fonética, acústica e réplica estilística vocal.
Analise detalhadamente o áudio fornecido, focando especialmente em três pilares fundamentais:
1. TOM (Tone / Pitch): tom médio (grave, médio, agudo, Hz aproximado), modulação melódica, entonação nas terminações das frases, expressividade e emoção subjacente.
2. RITMO (Rhythm / Cadence): velocidade de fala (ppm - palavras por minuto estimadas), cadência (fluida, pausada, enfática), distribuição de micropausas e respiração.
3. TIMBRE (Timbre / Vocal Texture): textura da voz (aveludada, metálica, rouca, brilhante, anasalada, peitoral, respiração audível), ressonância harmônica e peso vocal.
4. ESTILO VERBAL & LINGUÍSTICO: vocabulário, regionalismo / sotaque (ex: Português do Brasil - padrão, caipira, sulista, carioca, etc.), nível de formalidade e marcadores discursivos típicos.

Com base nessa análise profunda:
Se a pessoa no áudio fez uma pergunta direta ou questionamento durante a sua fala, responda diretamente a essa pergunta! Caso contrário, responda à seguinte pergunta:
PERGUNTA DO USUÁRIO: "${question}"
Responda RIGOROSAMENTE mantendo o mesmo estilo, persona, vocabulário, cadência, energia e entonação da voz original.

Retorne OBRIGATORIAMENTE um objeto JSON válido (sem tags markdown extras) no formato:
{
  "transcription": "transcrição fiel das palavras ditas no áudio fornecido",
  "tone": {
    "pitchHzEstimate": 140,
    "classification": "Médio-grave com entonação conclusiva firme",
    "emotionalQuality": "Confiante, caloroso e explicativo",
    "melodyDescription": "Variação melódica moderada com ênfase nas palavras-chave",
    "score": 88
  },
  "rhythm": {
    "estimatedWpm": 135,
    "cadence": "Cadência moderada, pausas didáticas bem marcadas",
    "pauseStyle": "Pausas curtas para respiração sem quebra de raciocínio",
    "tempoCategory": "Moderado / Fluido",
    "score": 90
  },
  "timbre": {
    "resonance": "Ressonância predominantemente peitoral e quente",
    "texture": "Textura levemente aveludada com bom corpo harmônico",
    "brightness": "Brilho balanceado, sem aspereza ou chiado",
    "vocalWeight": "Médio-pesado",
    "score": 85
  },
  "linguisticStyle": {
    "formality": "Semi-informal / Acessível",
    "accentAndIdiom": "Português Brasileiro natural e envolvente",
    "mannerisms": "Uso de conectivos fluidos e didática acessível",
    "summary": "Fala autêntica, segura e espontânea"
  },
  "suggestedVoice": "Charon", 
  "vocalStylePrompt": "Fala em português brasileiro com tom amigável, seguro, cadência natural com pausas didáticas",
  "replicatedResponseText": "Texto completo da resposta para a pergunta, escrito exatamente na voz, ritmo e estilo da pessoa."
}
`;

    // 1. Analyze with gemini-3.8-flash (multimodal audio reasoning)
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const analysisRaw = analysisResponse.text || '{}';
    let analysisData;
    try {
      analysisData = JSON.parse(analysisRaw);
    } catch {
      // In case of any wrapping
      const cleaned = analysisRaw.replace(/```json\n?|\n?```/g, '').trim();
      analysisData = JSON.parse(cleaned);
    }

    // Determine voice config based on analysis
    const voiceToUse = analysisData.suggestedVoice && ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(analysisData.suggestedVoice)
      ? analysisData.suggestedVoice
      : mapToPrebuiltVoice(analysisData.tone?.classification || '', analysisData.tone?.pitchHzEstimate || 150);

    const stylePrompt = analysisData.vocalStylePrompt ||
      `Fala natural em Português do Brasil com estilo ${analysisData.tone?.emotionalQuality || 'expressivo'}, ${analysisData.rhythm?.cadence || 'cadência ritmada'}`;

    const textToSpeak = analysisData.replicatedResponseText ||
      `Olá! Analisei sua voz e estou respondendo exatamente com a sua energia e características vocais. ${question}`;

    // 2. Synthesize audio with gemini-3.8-flash-lite-tts
    let synthesizedAudioBase64 = null;
    try {
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: textToSpeak,
                speechMetadata: {
                  style: stylePrompt,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceToUse },
            },
          },
        },
      });

      const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (audioPart?.data) {
        synthesizedAudioBase64 = audioPart.data;
      }
    } catch (ttsErr: unknown) {
      console.error('Error generating speech with TTS:', ttsErr);
      // We will still return analysis and response text even if TTS had an issue
    }

    return res.json({
      success: true,
      analysis: analysisData,
      responseAudio: synthesizedAudioBase64 ? `data:audio/wav;base64,${synthesizedAudioBase64}` : null,
      voiceUsed: voiceToUse,
      stylePrompt,
    });
  } catch (error: unknown) {
    console.error('Error in analyze-and-replicate:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno no processamento de voz';
    return res.status(500).json({ error: msg });
  }
});

// In-memory cache for generated sample audio
const sampleAudioCache = new Map<string, string>();

const PRESET_SAMPLES = [
  {
    id: 'professor-didatico',
    title: 'Educador Didático & Confiante',
    description: 'Tom médio-grave, ritmo compassado com pausas didáticas, timbre caloroso e acolhedor.',
    transcript: 'Olá pessoal, tudo bem? Hoje vamos descomplicar um tema fascinante. Respire fundo, preste bastante atenção na lógica e vamos passo a passo entender cada detalhe com muita calma.',
    voice: 'Charon',
    style: 'Tom professoral acolhedor, pausado, seguro e didático em português brasileiro',
    sampleQuestion: 'Como você explica a importância da curiosidade no aprendizado?',
  },
  {
    id: 'apresentador-tech',
    title: 'Apresentador Dinâmico de Tecnologia',
    description: 'Tom vibrante e entusiasmado, ritmo acelerado e fluido, timbre brilhante e jovem.',
    transcript: 'Fala galera, bem-vindos ao canal! Hoje nós temos uma novidade bombástica do mundo tech que vai mudar completamente como você interage com dispositivos inteligentes!',
    voice: 'Puck',
    style: 'Apresentador jovem muito animado, ritmo rápido e dinâmico, entusiasta em português brasileiro',
    sampleQuestion: 'O que você achou dos últimos lançamentos de inteligência artificial?',
  },
  {
    id: 'narradora-serena',
    title: 'Narradora Serena & Tranquila',
    description: 'Tom suave e aveludado, ritmo lento e meditativo, timbre com leve respiração e calmaria.',
    transcript: 'Seja muito bem-vindo a este momento de pausa. Permita-se relaxar os ombros, desacelerar o ritmo dos pensamentos e focar apenas na sua respiração consciente.',
    voice: 'Kore',
    style: 'Voz feminina muito suave, serena, calma e aveludada, cadência meditativa em português brasileiro',
    sampleQuestion: 'Como encontrar equilíbrio mental em uma rotina corrida?',
  },
  {
    id: 'mentor-motivacional',
    title: 'Mentor Enérgico & Assertivo',
    description: 'Tom firme e peitoral, ritmo cadenciado e enfático, timbre encorpado e motivacional.',
    transcript: 'Bom dia, time! Não importa o tamanho do desafio que você tem pela frente hoje. O que importa é a atitude, a disciplina diária e a vontade inabalável de fazer acontecer!',
    voice: 'Fenrir',
    style: 'Voz masculina encorpada, motivacional, firme e inspiradora em português brasileiro',
    sampleQuestion: 'Qual conselho você dá para quem está pensando em desistir de um projeto?',
  },
];

app.get('/api/sample-presets', (_req, res) => {
  res.json({ presets: PRESET_SAMPLES });
});

// Endpoint to get or generate audio for a sample preset
app.get('/api/sample-audio/:id', async (req, res) => {
  const { id } = req.params;
  const preset = PRESET_SAMPLES.find((p) => p.id === id);
  if (!preset) {
    return res.status(404).json({ error: 'Preset não encontrado' });
  }

  if (sampleAudioCache.has(id)) {
    return res.json({ audioData: sampleAudioCache.get(id), preset });
  }

  try {
    const ai = getGenAI();
    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: preset.transcript,
              speechMetadata: {
                style: preset.style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: preset.voice as 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' },
          },
        },
      },
    });

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      const fullData = `data:audio/wav;base64,${audioData}`;
      sampleAudioCache.set(id, fullData);
      return res.json({ audioData: fullData, preset });
    }
    return res.status(500).json({ error: 'Falha ao sintetizar áudio do preset.' });
  } catch (error: unknown) {
    console.error('Error synthesizing preset sample:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao gerar amostra';
    return res.status(500).json({ error: msg });
  }
});

// API: Synthesize text directly with custom voice persona
app.post('/api/synthesize', async (req, res) => {
  try {
    const { text, voiceName = 'Charon', style = 'Natural Brazilian Portuguese voice' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Texto não fornecido.' });
    }

    const ai = getGenAI();
    const validVoice = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceName) ? voiceName : 'Charon';

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: validVoice as 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' },
          },
        },
      },
    });

    const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!audioPart?.data) {
      return res.status(500).json({ error: 'Nenhum áudio gerado pelo modelo TTS.' });
    }

    return res.json({
      success: true,
      audioData: `data:audio/wav;base64,${audioPart.data}`,
      voiceUsed: validVoice,
    });
  } catch (error: unknown) {
    console.error('Error synthesizing audio:', error);
    const msg = error instanceof Error ? error.message : 'Erro na síntese de áudio';
    return res.status(500).json({ error: msg });
  }
});

// Start server and handle Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`VocalCloner server running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
