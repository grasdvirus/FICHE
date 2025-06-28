
'use server';

/**
 * @fileOverview An AI agent for generating community descriptions.
 *
 * - generateCommunityDescription - A function that generates a community description based on a prompt.
 * - GenerateCommunityDescriptionInput - The input type for the generateCommunityDescription function.
 * - GenerateCommunityDescriptionOutput - The return type for the generateCommunityDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCommunityDescriptionInputSchema = z.object({
  prompt: z.string().describe('A short prompt describing the community.'),
});
export type GenerateCommunityDescriptionInput = z.infer<typeof GenerateCommunityDescriptionInputSchema>;

const GenerateCommunityDescriptionOutputSchema = z.object({
  description: z.string().describe('A compelling and informative description of the community.'),
});
export type GenerateCommunityDescriptionOutput = z.infer<typeof GenerateCommunityDescriptionOutputSchema>;

export async function generateCommunityDescription(
  input: GenerateCommunityDescriptionInput
): Promise<GenerateCommunityDescriptionOutput> {
  return generateCommunityDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCommunityDescriptionPrompt',
  input: {schema: GenerateCommunityDescriptionInputSchema},
  output: {schema: GenerateCommunityDescriptionOutputSchema},
  prompt: `You are a community manager tasked with writing a description for a new community.

  Based on the following prompt, write a compelling and informative description to attract new members.

  Prompt: {{{prompt}}}

  Description:`,
});

const generateCommunityDescriptionFlow = ai.defineFlow(
  {
    name: 'generateCommunityDescriptionFlow',
    inputSchema: GenerateCommunityDescriptionInputSchema,
    outputSchema: GenerateCommunityDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    