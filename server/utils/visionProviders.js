import axios from "axios";
import { env } from "../config/env.js";
import { extractJsonObject } from "./gemini.js";

function normalizeBase64(imageData) {
  if (!imageData) return "";
  return imageData.includes(",") ? imageData.split(",")[1] : imageData;
}

export async function callGroqVision(promptText, imageData, mimeType = "image/jpeg") {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const base64 = normalizeBase64(imageData);
  const imageUrl = `data:${mimeType};base64,${base64}`;
  const payload = {
    model: env.groqVisionModel,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    temperature: 0.2,
    max_tokens: 900
  };

  const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, {
    timeout: 30000,
    headers: {
      Authorization: `Bearer ${env.groqApiKey}`,
      "Content-Type": "application/json"
    },
    validateStatus: () => true
  });

  if (response.status === 429) {
    throw new Error("Groq quota exceeded.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("Groq API key is invalid or unauthorized.");
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Groq returned HTTP ${response.status}`);
  }

  const content = response.data?.choices?.[0]?.message?.content || "";
  if (!content) {
    throw new Error("Groq returned empty output.");
  }

  return extractJsonObject(content);
}

export async function callOllamaVision(promptText, imageData) {
  const base64 = normalizeBase64(imageData);
  if (!base64) {
    throw new Error("Image data is required for Ollama vision.");
  }

  const payload = {
    model: env.ollamaVisionModel,
    stream: false,
    messages: [
      {
        role: "user",
        content: promptText,
        images: [base64]
      }
    ]
  };

  const response = await axios.post(`${env.ollamaUrl}/api/chat`, payload, {
    timeout: 45000,
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Ollama returned HTTP ${response.status}`);
  }

  const content = response.data?.message?.content || "";
  if (!content) {
    throw new Error("Ollama returned empty output.");
  }

  return extractJsonObject(content);
}
