'use server';

/**
 * @fileOverview A chat assistant for providing insights about tomato yield, forecasts, and market prices.
 *
 * - chatAssistantForInsights - A function that handles the chat assistant interaction.
 * - ChatAssistantForInsightsInput - The input type for the chatAssistantForInsights function.
 * - ChatAssistantForInsightsOutput - The return type for the chatAssistantForinsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatAssistantForInsightsInputSchema = z.object({
  query: z.string().describe('The user query about tomato yield, forecasts, or market prices.'),
  detectionResult: z.any().optional().describe('The JSON object containing the results from the tomato detection model.'),
  forecastResult: z.any().optional().describe('The JSON object containing the yield forecast results.'),
  marketResult: z.any().optional().describe('The JSON object containing the market price forecast results.'),
});
export type ChatAssistantForInsightsInput = z.infer<typeof ChatAssistantForInsightsInputSchema>;

const ChatAssistantForInsightsOutputSchema = z.object({
  reply: z.string().describe('The reply from the chat assistant.'),
});
export type ChatAssistantForInsightsOutput = z.infer<typeof ChatAssistantForInsightsOutputSchema>;

export async function chatAssistantForInsights(input: ChatAssistantForInsightsInput): Promise<ChatAssistantForInsightsOutput> {
  return chatAssistantForInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatAssistantForInsightsPrompt',
  input: {schema: ChatAssistantForInsightsInputSchema},
  output: {schema: ChatAssistantForInsightsOutputSchema},
  prompt: `You are an expert agricultural chat assistant for the AgriVisionAI platform. Your role is to provide clear, concise, and helpful insights based on the data provided.

  Here is the context for the user's current session. Use this data to answer their question.

  {{#if detectionResult}}
  **Tomato Detection Analysis:**
  \`\`\`json
  {{detectionResult}}
  \`\`\`
  {{/if}}

  {{#if forecastResult}}
  **Yield Forecast Analysis:**
  \`\`\`json
  {{forecastResult}}
  \`\`\`
  {{/if}}

  {{#if marketResult}}
  **Market Price & Profit Analysis:**
  \`\`\`json
  {{marketResult}}
  \`\`\`
  {{/if}}

  **User's Question:** "{{query}}"

  **Instructions:**
  1.  Answer the user's question directly using the provided JSON data.
  2.  If the data needed to answer the question is not present in the context, politely state that the information is not available and suggest running the required analysis (e.g., "Please run a market forecast to get price predictions.").
  3.  When mentioning numbers, format them to two decimal places and include relevant units (e.g., kg, ₹, ₹/kg).
  4.  Keep your answers brief and to the point.
`,
});

const chatAssistantForInsightsFlow = ai.defineFlow(
  {
    name: 'chatAssistantForInsightsFlow',
    inputSchema: ChatAssistantForInsightsInputSchema,
    outputSchema: ChatAssistantForInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI assistant failed to generate a reply.");
    }
    return output;
  }
);
