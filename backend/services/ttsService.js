import { mkdir, writeFile } from "fs/promises";
import path from "path";

const HINGLISH_TTS_VOICE = {
  languageCode: "en-IN",
  name: "en-IN-Wavenet-D",
};

let ttsClientPromise = null;

function cleanHinglishText(text = "") {
  return String(text || "")
    .replace(/[*.\-/]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([?,])/g, "$1")
    .trim();
}

async function getTextToSpeechClient() {
  if (!ttsClientPromise) {
    ttsClientPromise = import("@google-cloud/text-to-speech")
      .then((module) => {
        const TextToSpeechClient = module.TextToSpeechClient || module.default?.TextToSpeechClient;
        if (!TextToSpeechClient) {
          throw new Error("Failed to load Google Cloud Text-to-Speech client.");
        }
        return new TextToSpeechClient();
      })
      .catch((error) => {
        ttsClientPromise = null;
        throw error;
      });
  }

  return ttsClientPromise;
}

async function requestHinglishSpeech({
  text,
  speakingRate = 1.05,
  pitch = 0,
  volumeGainDb = 0,
  client,
} = {}) {
  const cleanedText = cleanHinglishText(text);
  if (!cleanedText) {
    throw new Error("Text-to-Speech requires non-empty input after cleaning.");
  }

  const activeClient = client || (await getTextToSpeechClient());

  try {
    const [response] = await activeClient.synthesizeSpeech({
      input: { text: cleanedText },
      voice: HINGLISH_TTS_VOICE,
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: Math.min(1.1, Math.max(1.0, Number(speakingRate) || 1.05)),
        pitch: Number.isFinite(Number(pitch)) ? Number(pitch) : 0,
        volumeGainDb: Number.isFinite(Number(volumeGainDb)) ? Number(volumeGainDb) : 0,
      },
    });

    if (!response?.audioContent) {
      throw new Error("Google Cloud TTS returned no audio content.");
    }

    return {
      cleanedText,
      audioContent: response.audioContent,
      voice: HINGLISH_TTS_VOICE,
    };
  } catch (error) {
    const details =
      error?.details ||
      error?.message ||
      "Unknown Google Cloud Text-to-Speech failure.";
    throw new Error(`Google Cloud TTS failed: ${details}`);
  }
}

async function synthesizeHinglishSpeechToFile({
  text,
  outputFilePath,
  speakingRate = 1.05,
  pitch = 0,
  volumeGainDb = 0,
  client,
} = {}) {
  if (!outputFilePath) {
    throw new Error("outputFilePath is required for MP3 generation.");
  }

  const { cleanedText, audioContent, voice } = await requestHinglishSpeech({
    text,
    speakingRate,
    pitch,
    volumeGainDb,
    client,
  });

  const resolvedOutputPath = path.resolve(outputFilePath);
  await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, audioContent, "binary");

  return {
    outputFilePath: resolvedOutputPath,
    cleanedText,
    voice,
  };
}

export {
  HINGLISH_TTS_VOICE,
  cleanHinglishText,
  requestHinglishSpeech,
  synthesizeHinglishSpeechToFile,
};
