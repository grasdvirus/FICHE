'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeTextInputSchema = z.object({
  text: z.string().describe("The user's input text to be analyzed."),
});
export type AnalyzeTextInput = z.infer<typeof AnalyzeTextInputSchema>;

const AnalyzeTextOutputSchema = z.object({
  explanation: z.string().describe('Explication détaillée du texte.'),
  suggestions: z.array(z.string()).describe("Suggestions d'amélioration."),
  ideas: z.array(z.string()).describe('Idées créatives basées sur le contenu.'),
  actions: z.array(z.string()).describe("Options d'action."),
});
export type AnalyzeTextOutput = z.infer<typeof AnalyzeTextOutputSchema>;

const prompt = ai.definePrompt({
    name: 'analyzeTextPrompt',
    input: { schema: AnalyzeTextInputSchema },
    output: { schema: AnalyzeTextOutputSchema, format: 'json' },
    prompt: `L'utilisateur a écrit ce texte: "{{{text}}}"
      
    Fournissez une réponse JSON avec:
    1. "explanation": Une explication détaillée du texte
    2. "suggestions": Un tableau de chaînes de caractères avec des suggestions d'amélioration
    3. "ideas": Un tableau de chaînes de caractères avec des idées créatives basées sur le contenu
    4. "actions": Un tableau de chaînes de caractères avec des options d'action
    
    Répondez uniquement avec un objet JSON valide. Votre réponse DOIT être uniquement un objet JSON valide, sans aucun autre texte ou formatage.`,
});

const analyzeTextFlow = ai.defineFlow(
  {
    name: 'analyzeTextFlow',
    inputSchema: AnalyzeTextInputSchema,
    outputSchema: AnalyzeTextOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("L'IA n'a pas réussi à générer de réponse.");
    }
    return output;
  }
);

export async function analyzeText(input: AnalyzeTextInput): Promise<AnalyzeTextOutput> {
  return analyzeTextFlow(input);
}
