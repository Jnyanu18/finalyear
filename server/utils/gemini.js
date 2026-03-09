import axios from "axios";
import { env } from "../config/env.js";
import { ApiError } from "./ApiError.js";

function stripCodeFences(text) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

export function extractJsonObject(text) {
  const cleaned = stripCodeFences(text);
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in model response.");
  }
  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

export async function callGemini(promptText, imageData = null, mimeType = "image/jpeg") {
  if (!env.geminiApiKey) {
    throw new ApiError(500, "GEMINI_API_KEY is not configured.");
  }

  const parts = [{ text: promptText }];
  if (imageData) {
    const base64 = imageData.includes(",") ? imageData.split(",")[1] : imageData;
    parts.push({
      inlineData: {
        mimeType,
        data: base64
      }
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`;
  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const response = await axios.post(url, payload, {
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true  // Don't throw on non-2xx, handle manually
  });

  if (response.status === 429) {
    throw new Error("Gemini API quota exceeded. The free-tier limit has been reached. Please wait a few minutes and try again, or upgrade your API plan.");
  }
  if (response.status === 403 || response.status === 401) {
    throw new Error("Gemini API key is invalid or unauthorized. Please check your GEMINI_API_KEY in the .env file.");
  }
  if (response.status === 400) {
    const msg = response.data?.error?.message || "Bad request";
    throw new Error(`Gemini rejected the request: ${msg}`);
  }
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Gemini returned HTTP ${response.status}: ${JSON.stringify(response.data).substring(0, 200)}`);
  }

  const text =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    response.data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") ||
    "";

  if (!text) {
    throw new ApiError(502, "Gemini returned empty output.");
  }

  return extractJsonObject(text);
}
