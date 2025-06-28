'use server';

/**
 * @fileOverview An AI agent for generating community images.
 *
 * - generateCommunityImage - A function that generates a community image based on a prompt.
 * - GenerateCommunityImageInput - The input type for the generateCommunityImage function.
 * - GenerateCommunityImageOutput - The return type for the generateCommunityImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCommunityImageInputSchema = z.object({
  prompt: z.string().describe('A short prompt describing the community image.'),
});
export type GenerateCommunityImageInput = z.infer<typeof GenerateCommunityImageInputSchema>;

const GenerateCommunityImageOutputSchema = z.object({
  imageUrl: z.string().describe('The generated image as a data URI.'),
});
export type GenerateCommunityImageOutput = z.infer<typeof GenerateCommunityImageOutputSchema>;

export async function generateCommunityImage(
  input: GenerateCommunityImageInput
): Promise<GenerateCommunityImageOutput> {
  return generateCommunityImageFlow(input);
}

const generateCommunityImageFlow = ai.defineFlow(
  {
    name: 'generateCommunityImageFlow',
    inputSchema: GenerateCommunityImageInputSchema,
    outputSchema: GenerateCommunityImageOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `Generate a circular logo for an online community called "${input.prompt}". The logo should be simple, modern, and iconic. It should not contain any text.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media || !media.url) {
        throw new Error('Image generation failed.');
    }

    return {imageUrl: media.url};
  }
);
