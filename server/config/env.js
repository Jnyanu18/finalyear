import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8080),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/agrinexus",
  jwtSecret: process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqVisionModel: process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct",
  ollamaUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
  ollamaVisionModel: process.env.OLLAMA_VISION_MODEL || "llava:latest",
  aiMode: process.env.AI_MODE || "gemini",
  postgresUrl: process.env.POSTGRES_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  influxUrl: process.env.INFLUX_URL || "",
  influxToken: process.env.INFLUX_TOKEN || "",
  influxOrg: process.env.INFLUX_ORG || "",
  influxBucket: process.env.INFLUX_BUCKET || "agrosense",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "alerts@agronexus.local",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || "",
  matlabExecutable: process.env.MATLAB_EXECUTABLE || "",
  matlabBridgeMode: process.env.MATLAB_BRIDGE_MODE || "hybrid",
  pythonInferenceUrl: process.env.PYTHON_INFERENCE_URL || "http://localhost:8001",
  agrosenseReportBaseUrl: process.env.AGROSENSE_REPORT_BASE_URL || "",
  agrosenseDataMode: process.env.AGROSENSE_DATA_MODE || "hybrid"
};

export const isProduction = env.nodeEnv === "production";
