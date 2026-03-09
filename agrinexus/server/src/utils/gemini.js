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
    timeout: 12000,
    headers: {
      "Content-Type": "application/json"
    }
  });

  const text =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    response.data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") ||
    "";

  if (!text) {
    throw new ApiError(502, "Gemini returned empty output.");
  }

  return extractJsonObject(text);
}
