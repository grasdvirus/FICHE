
'use server';

/**
 * @fileOverview An AI agent for suggesting sentence completions.
 *
 * - suggestSentences - A function that suggests ways to continue a piece of text.
 * - SuggestSentencesInput - The input type for the suggestSentences function.
 * - SuggestSentencesOutput - The return type for the suggestSentences function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSentencesInputSchema = z.object({
  text: z.string().describe('The current text written by the user.'),
});
export type SuggestSentencesInput = z.infer<typeof SuggestSentencesInputSchema>;

const SuggestSentencesOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of 3 short, relevant sentence completions or suggestions.'),
});
export type SuggestSentencesOutput = z.infer<typeof SuggestSentencesOutputSchema>;

export async function suggestSentences(input: SuggestSentencesInput): Promise<SuggestSentencesOutput> {
  return suggestSentencesFlow(input);
}

const prompt = ai.definePrompt({
    name: 'suggestSentencesPrompt',
    input: { schema: SuggestSentencesInputSchema },
    output: { schema: SuggestSentencesOutputSchema, format: 'json' },
    prompt: `You are a writing assistant. Based on the user's text, provide 3 short, creative, and relevant suggestions to continue their thought. The suggestions should complete the current sentence or start the next one.

    User text: "{{text}}"
    
    Respond ONLY with a valid JSON object with a "suggestions" key containing an array of 3 strings. Your response MUST be only a valid JSON object.`,
});

const suggestSentencesFlow = ai.defineFlow({
    name: 'suggestSentencesFlow',
    inputSchema: SuggestSentencesInputSchema,
    outputSchema: SuggestSentencesOutputSchema,
}, async (input) => {
    if (!input.text.trim()) {
        return { suggestions: [] };
    }
    const { output } = await prompt(input);
    return output || { suggestions: [] };
});
