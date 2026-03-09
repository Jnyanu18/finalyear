import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});

const analyzePlantInputSchema = z.object({
  photoDataUri: z.string(),
  contentType: z.string(),
});

const plantAnalysisResultSchema = z.object({
  plantType: z.string(),
  summary: z.string(),
  stages: z.array(
    z.object({
      stage: z.string(),
      count: z.number(),
    })
  ),
});

const yieldForecastInputSchema = z.object({
  analysis: plantAnalysisResultSchema,
  controls: z.object({
    avgWeightG: z.number(),
    postHarvestLossPct: z.number(),
    numPlants: z.number(),
    forecastDays: z.number(),
    gddBaseC: z.number(),
    harvestCapacityKgDay: z.number(),
    useDetectionModel: z.boolean().optional(),
    useLiveWeather: z.boolean().optional(),
    includePriceForecast: z.boolean().optional(),
    district: z.string().optional(),
  }),
});

const yieldForecastOutputSchema = z.object({
  totalExpectedYieldKg: z.number(),
  yieldCurve: z.array(
    z.object({
      date: z.string(),
      yieldKg: z.number(),
    })
  ),
  confidence: z.number().min(0).max(1),
  notes: z.string(),
  reasoning: z.string(),
});

const marketInputSchema = z.object({
  district: z.string().optional(),
  daysAhead: z.number(),
  readyKg: z.number().optional(),
});

const marketOutputSchema = z.object({
  forecast: z.array(
    z.object({
      date: z.string(),
      price: z.number(),
    })
  ),
  bestDate: z.string(),
  bestPrice: z.number(),
  modelInfo: z.object({
    modelName: z.string(),
  }),
});

const chatInputSchema = z.object({
  query: z.string(),
  detectionResult: z.any().optional(),
  forecastResult: z.any().optional(),
  marketResult: z.any().optional(),
});

const chatOutputSchema = z.object({
  reply: z.string(),
});

const analysisPrompt = ai.definePrompt({
  name: 'plantAnalysisPromptExpress',
  input: { schema: analyzePlantInputSchema },
  output: { schema: plantAnalysisResultSchema, format: 'json' },
  prompt: `
You are an agricultural vision assistant.
Analyze the uploaded crop image and return:
- plantType
- summary
- stages: [{stage,count}]

Use realistic stage names and integer counts.
Photo: {{media url=photoDataUri contentType=contentType}}
`,
});

const yieldPrompt = ai.definePrompt({
  name: 'yieldForecastPromptExpress',
  input: { schema: yieldForecastInputSchema },
  output: { schema: yieldForecastOutputSchema, format: 'json' },
  prompt: `
You are an expert agricultural AI specializing in yield forecasting.
Use the analysis and farm controls to estimate:
- totalExpectedYieldKg
- yieldCurve over forecastDays
- confidence (0-1)
- notes
- reasoning

Analysis: {{json analysis}}
Controls: {{json controls}}
Return valid JSON only.
`,
});

const marketPrompt = ai.definePrompt({
  name: 'marketPromptExpress',
  input: { schema: marketInputSchema },
  output: { schema: marketOutputSchema, format: 'json' },
  prompt: `
Forecast tomato market prices for district {{{district}}} for next {{{daysAhead}}} days.
Return JSON:
{
  "forecast":[{"date":"YYYY-MM-DD","price":number}],
  "bestDate":"YYYY-MM-DD",
  "bestPrice":number,
  "modelInfo":{"modelName":"string"}
}
Use realistic values.
`,
});

const chatPrompt = ai.definePrompt({
  name: 'chatPromptExpress',
  input: { schema: chatInputSchema },
  output: { schema: chatOutputSchema, format: 'json' },
  prompt: `
You are an agriculture assistant for farmers.
User query: {{{query}}}

Context:
Detection: {{json detectionResult}}
Forecast: {{json forecastResult}}
Market: {{json marketResult}}

Provide a short, practical answer in plain language.
`,
});

export async function analyzePlant(input) {
  const { output } = await analysisPrompt(input);
  if (!output) throw new Error('Analysis failed');
  return output;
}

export async function forecastYield(input) {
  const { output } = await yieldPrompt(input);
  if (!output) throw new Error('Yield forecast failed');
  return output;
}

export async function forecastMarket(input) {
  const { output } = await marketPrompt(input);
  if (!output) throw new Error('Market forecast failed');
  return output;
}

export async function chatAssistant(input) {
  const { output } = await chatPrompt(input);
  if (!output) throw new Error('Assistant failed');
  return output;
}
