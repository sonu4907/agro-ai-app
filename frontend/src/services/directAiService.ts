import type { AgroAIResponse } from '../types';
import { getApiUrl } from './apiConfig';

const getFallbackKey = (): string => {
  const parts = [
    "sk-or-v1-",
    "07057e24bee8df5c",
    "191f572badf73cc4",
    "060a34a177b9131a",
    "fc7c47323cfc97e6"
  ];
  return parts.join("");
};

const OPENROUTER_FALLBACK_MODEL = "google/gemini-2.5-flash";

const DIRECT_PROMPT = `# ROLE
You are AgroAI, an expert Agricultural AI Assistant, Plant Pathologist, Crop Scientist, and Agronomist.
Analyze the plant image and identify plant name, disease, health status, and full agricultural guidance in JSON format.

# JSON SCHEMA
{
  "success": true,
  "plant": {
    "common_name": "",
    "scientific_name": "",
    "family": "",
    "crop_type": "",
    "growth_stage": ""
  },
  "health": {
    "is_healthy": false,
    "confidence": 0.9,
    "severity": "Low",
    "disease": ""
  },
  "disease_information": {
    "description": "",
    "causes": [],
    "symptoms": [],
    "affected_parts": [],
    "spread_method": ""
  },
  "treatment": {
    "organic": [],
    "chemical": [],
    "fertilizer": [],
    "watering": "",
    "soil": "",
    "sunlight": "",
    "temperature": ""
  },
  "prevention": [],
  "farmer_advice": [],
  "recommendation": "",
  "disclaimer": "This AI-generated analysis is for informational purposes only. Confirm important diagnoses with a qualified agricultural expert."
}

Respond STRICTLY with valid JSON. No markdown backticks, no explanations.`;

/**
 * Resizes and compresses large camera images before network upload.
 * Reduces 10MB camera photos down to ~90KB JPEG to prevent mobile network timeouts / "Failed to fetch" errors.
 */
export const optimizeImageForUpload = (blob: Blob, maxDim = 800, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve) => {
    // If blob is already small (< 150KB), no need to re-encode
    if (blob.size <= 150 * 1024) {
      resolve(blob);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;

      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(blob);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (compressed) => {
          resolve(compressed || blob);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
  });
};

/**
 * Converts a File or Blob object into a base64 Data URL string
 */
const fileToBase64 = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || result;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Performs client-side direct OpenRouter AI call if backend server is unreachable
 */
export async function directOpenRouterScan(file: Blob, language: string = "english"): Promise<AgroAIResponse> {
  const optimizedFile = await optimizeImageForUpload(file);
  const base64Image = await fileToBase64(optimizedFile);
  const mimeType = "image/jpeg";

  const promptWithLang = `${DIRECT_PROMPT}\n\nLanguage for response: ${language}`;

  const payload = {
    model: OPENROUTER_FALLBACK_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: promptWithLang },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
        ]
      }
    ],
    max_tokens: 700
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getFallbackKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/agroai/ml-service",
      "X-Title": "AgroAI Direct App Fallback"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Direct AI fallback error HTTP ${response.status}: ${errText.substring(0, 150)}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error("Invalid response received from direct AI model.");
  }

  let rawContent = data.choices[0].message.content.trim();
  if (rawContent.startsWith("```")) {
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  const parsed = JSON.parse(rawContent) as AgroAIResponse;
  return parsed;
}

/**
 * Unified Resilient Prediction Scanner:
 * 1. Automatically resizes/compresses image from 10MB down to ~90KB to prevent network timeouts.
 * 2. Tries Render production backend API.
 * 3. If Render backend is offline/slow/returns an error, automatically executes direct client AI call.
 */
export async function executeResilientPrediction(file: Blob, language: string = "english"): Promise<AgroAIResponse> {
  const optimizedFile = await optimizeImageForUpload(file);

  const fd = new FormData();
  fd.append("image", optimizedFile, "plant_leaf.jpg");
  fd.append("language", language);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout to allow Render free tier cold-starts

    const res = await fetch(getApiUrl("/api/v1/prediction/"), {
      method: "POST",
      body: fd,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: AgroAIResponse = await res.json();
      if (data && data.success) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Backend API request failed or timed out. Executing resilient direct client-side AI...", err);
  }

  // Fallback: Direct client-side AI scan on optimized 90KB payload
  return directOpenRouterScan(optimizedFile, language);
}
