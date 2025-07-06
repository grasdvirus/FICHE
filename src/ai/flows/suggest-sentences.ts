
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
  text: z.string().describe("Le texte actuel rédigé par l'utilisateur."),
});
export type SuggestSentencesInput = z.infer<typeof SuggestSentencesInputSchema>;

const SuggestSentencesOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('Un tableau de 3 complétions de phrases ou suggestions courtes et pertinentes.'),
});
export type SuggestSentencesOutput = z.infer<typeof SuggestSentencesOutputSchema>;

export async function suggestSentences(input: SuggestSentencesInput): Promise<SuggestSentencesOutput> {
  return suggestSentencesFlow(input);
}

const prompt = ai.definePrompt({
    name: 'suggestSentencesPrompt',
    input: { schema: SuggestSentencesInputSchema },
    output: { schema: SuggestSentencesOutputSchema, format: 'json' },
    prompt: `Vous êtes un assistant d'écriture intelligent. En vous basant sur le texte de l'utilisateur, fournissez 3 suggestions courtes, créatives et pertinentes pour continuer sa pensée. Les suggestions doivent compléter la phrase en cours ou commencer la suivante.

    Texte de l'utilisateur : "{{{text}}}"
    
    Répondez UNIQUEMENT avec un objet JSON valide qui correspond au schéma de sortie. Votre réponse DOIT être uniquement un objet JSON valide avec une clé "suggestions" contenant un tableau de 3 chaînes de caractères.`,
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
