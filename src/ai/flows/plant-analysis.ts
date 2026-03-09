
'use server';
/**
 * @fileOverview An AI flow for analyzing plant images to identify the plant and classify its fruit/flowers.
 *
 * - analyzePlant - A function that handles the plant analysis process.
 * - AnalyzePlantInput - The input type for the analyzePlant function.
 * - PlantAnalysisResult - The return type for the analyzePlant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { AnalyzePlantInputSchema, PlantAnalysisResultSchema, type AnalyzePlantInput, type PlantAnalysisResult } from '@/lib/types';


// Define the prompt for the AI model
const analysisPrompt = ai.definePrompt({
  name: 'plantAnalysisPrompt',
  input: { schema: AnalyzePlantInputSchema },
  output: { schema: PlantAnalysisResultSchema, format: "json" },
  prompt: `
You are an agricultural vision assistant. 
Your task is to analyze an image of a plant (like a tomato, lemon, or orange plant).

Follow these steps:
1.  **Identify the Plant:** Determine the type of plant shown in the image (e.g., "Tomato", "Lemon").
2.  **Count and Classify:** Count all visible fruits and flowers. Classify them into appropriate growth stages for the identified plant. For example, for a tomato plant, you might use 'flower', 'immature', 'breaker', 'ripening', 'pink', 'mature', and 'overripened'. For a lemon, you might use 'flower', 'fruitlet', 'immature', and 'mature'.
3.  **Return JSON:** Respond with a JSON object that includes:
    -   \`plantType\`: The identified name of the plant.
    -   \`summary\`: A short, one-sentence summary of your findings.
    -   \`stages\`: An array of objects, where each object has a 'stage' (string) and 'count' (number).

**Example for a Lemon Plant:**
\`\`\`json
{
  "plantType": "Lemon",
  "summary": "The image shows a lemon plant with several fruits in various stages of development.",
  "stages": [
    { "stage": "flower", "count": 5 },
    { "stage": "fruitlet", "count": 10 },
    { "stage": "immature", "count": 8 },
    { "stage": "mature", "count": 3 }
  ]
}
\`\`\`

Do not include the backticks in your response.

Photo: {{media url=photoDataUri contentType=contentType}}`,
});

// Define the main flow
const analyzePlantFlow = ai.defineFlow(
  {
    name: 'analyzePlantFlow',
    inputSchema: AnalyzePlantInputSchema,
    outputSchema: PlantAnalysisResultSchema,
  },
  async (input) => {
    const { output } = await analysisPrompt(input);
    if (!output) {
      throw new Error('Analysis failed: No output from model.');
    }
    return output;
  }
);


export async function analyzePlant(input: AnalyzePlantInput): Promise<PlantAnalysisResult> {
  return analyzePlantFlow(input);
}
