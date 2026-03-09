
'use server';
/**
 * @fileOverview An AI flow for forecasting the total yield of a plant based on its current state.
 *
 * - forecastYield - A function that handles the yield forecasting process.
 * - YieldForecastInput - The input type for the forecastYield function.
 * - YieldForecastOutput - The return type for the forecastYield function.
 */

import { ai } from '@/ai/genkit';
import { YieldForecastInputSchema, YieldForecastOutputSchema, type YieldForecastInput, type YieldForecastOutput } from '@/lib/types';


export async function forecastYield(input: YieldForecastInput): Promise<YieldForecastOutput> {
  return forecastYieldFlow(input);
}


const forecastPrompt = ai.definePrompt({
  name: 'yieldForecastPrompt',
  input: { schema: YieldForecastInputSchema },
  output: { schema: YieldForecastOutputSchema, format: "json" },
  prompt: `
You are an expert agricultural AI specializing in yield forecasting for various plants.
Your task is to predict the total yield and yield curve based on an initial analysis of a plant.

**Input Data:**
1.  **Plant Analysis:**
    -   Plant Type: {{{analysis.plantType}}}
    -   Summary: {{{analysis.summary}}}
    -   Stage Counts: {{json analysis.stages}}

2.  **Farming Controls:**
    -   Number of Plants: {{{controls.numPlants}}}
    -   Average Fruit Weight (grams): {{{controls.avgWeightG}}}
    -   Forecast Horizon (days): {{{controls.forecastDays}}}

**Your Goal:**
Generate a JSON object that forecasts the total yield from the current generation of fruits and flowers.

**Instructions:**
1.  **Estimate Total Potential:** Calculate the total number of potential fruits by summing all counts (flowers, fruitlets, immature, etc.).
2.  **Calculate Total Expected Yield (Kg):** Multiply the total potential fruit count by the average fruit weight and the number of plants. Convert grams to kilograms.
3.  **Model the Yield Curve:** Based on the plant type ('{{{analysis.plantType}}}') and the initial stage distribution, project how these fruits will mature over the next {{{controls.forecastDays}}} days. Create a series of data points (date, yieldKg) showing the cumulative harvestable (mature) yield over time. Assume standard growth cycles for the plant type.
4.  **Provide Confidence & Notes:** Assign a confidence score. Aim for a confidence between 0.8 and 0.9 if there is a good mix of fruit stages. This score should be lower if the forecast relies heavily on early-stage items like flowers, and higher if it's based on later-stage fruits.
5.  **Provide Reasoning:** In the 'reasoning' field, provide a step-by-step explanation for your forecast. Explain how you calculated the total yield and justify the confidence score based on the initial stage distribution.
6.  **Return JSON:** Ensure the entire output is a single, valid JSON object.

**Example Output for a Lemon Plant:**
\`\`\`json
{
  "totalExpectedYieldKg": 152.5,
  "yieldCurve": [
    { "date": "2024-07-20", "yieldKg": 10.2 },
    { "date": "2024-07-27", "yieldKg": 45.8 },
    { "date": "2024-08-05", "yieldKg": 98.1 },
    { "date": "2024-08-15", "yieldKg": 140.3 },
    { "date": "2024-08-25", "yieldKg": 150.7 }
  ],
  "confidence": 0.88,
  "notes": "Forecast based on a high count of immature fruit. Actual yield may vary based on weather and farm conditions.",
  "reasoning": "The total yield was calculated by summing all 26 potential fruits and multiplying by the average weight and plant count. The confidence is 88% because a majority of the fruit is in the 'immature' stage, which has a high probability of reaching maturity. The peak harvest date was identified as the point where the yield curve shows the largest single increase in harvestable kilograms."
}
\`\`\`

Do not include the backticks in your response.
`,
});

const forecastYieldFlow = ai.defineFlow(
  {
    name: 'forecastYieldFlow',
    inputSchema: YieldForecastInputSchema,
    outputSchema: YieldForecastOutputSchema,
  },
  async (input) => {
    const { output } = await forecastPrompt(input);
    if (!output) {
      throw new Error('Yield forecast failed: No output from model.');
    }
    return output;
  }
);
