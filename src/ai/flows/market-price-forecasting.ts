'use server';
/**
 * @fileOverview This file defines a Genkit flow for forecasting market prices of tomatoes.
 *
 * The flow takes a district and a number of days ahead as input and returns a forecast of market prices,
 * the best date to sell tomatoes for maximum profit, and model information.
 *
 * @file        market-price-forecasting.ts
 * @exports   marketPriceForecasting - The main function to trigger the market price forecasting flow.
 * @exports   MarketPriceForecastingInput - The input type for the marketPriceForecasting function.
 * @exports   MarketPriceForecastingOutput - The return type for the marketPriceForecasting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MarketPriceForecastingInputSchema = z.object({
  district: z.string().optional().describe('The district for which to forecast market prices.'),
  daysAhead: z.number().describe('The number of days ahead to forecast.'),
  readyKg: z.number().optional().describe('Amount of tomatoes ready for harvest in kilograms, used for determining the best sell date.'),
});
export type MarketPriceForecastingInput = z.infer<typeof MarketPriceForecastingInputSchema>;

const MarketPriceForecastingOutputSchema = z.object({
  forecast: z.array(z.object({
    date: z.string(),
    price: z.number(),
  })).describe('A list of forecasted market prices for each day.'),
  bestDate: z.string().describe('The best date to sell tomatoes for maximum profit.'),
  bestPrice: z.number().describe('The forecasted price on the best sell date.'),
  modelInfo: z.object({
    modelName: z.string(),
    // Add other model information as needed
  }).describe('Information about the forecasting model used.'),
});
export type MarketPriceForecastingOutput = z.infer<typeof MarketPriceForecastingOutputSchema>;

export async function marketPriceForecasting(input: MarketPriceForecastingInput): Promise<MarketPriceForecastingOutput> {
  return marketPriceForecastingFlow(input);
}

const marketPriceForecastingFlow = ai.defineFlow(
  {
    name: 'marketPriceForecastingFlow',
    inputSchema: MarketPriceForecastingInputSchema,
    outputSchema: MarketPriceForecastingOutputSchema,
  },
  async input => {
    // Placeholder implementation - replace with actual logic
    const {
      district,
      daysAhead,
      readyKg,
    } = input;

    const prompt = ai.definePrompt({
      name: 'marketForecastPrompt',
      prompt: `You are an expert in agricultural economics, specializing in tomato market price forecasting.

You are provided with the following information:
- District: {{{district}}}
- Forecast horizon: {{{daysAhead}}} days
- Amount of tomatoes ready for harvest: {{{readyKg}}} kg (if provided)

Your goal is to forecast the market prices for tomatoes in the specified district for the next {{{daysAhead}}} days.

If the amount of tomatoes ready for harvest is provided, identify the best date to sell the tomatoes for maximum profit, considering the forecasted prices.

Output the forecast as a JSON array of objects, where each object has a "date" (YYYY-MM-DD) and "price" (float) field.
Also, output the best date to sell the tomatoes and the corresponding price.

Ensure the output is valid JSON and includes the best date and price.

{
  "forecast": [
    {"date": "YYYY-MM-DD", "price": float},
    // ... more dates
  ],
  "bestDate": "YYYY-MM-DD",
  "bestPrice": float,
  "modelInfo": {
    "modelName": "ARIMA(1,1,1)" // Example model name
  }
}`,
    });

    const result = await prompt(input);
    if (!result.output) {
      throw new Error("The AI model failed to generate a market price forecast.");
    }
    return result.output;
  }
);
