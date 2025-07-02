
import { config } from 'dotenv';
config();

// import '@/ai/flows/summarize-document.ts'; // Removed
import '@/ai/flows/generate-community-description.ts';
import '@/ai/flows/generate-community-image.ts';
import '@/ai/flows/analyze-text.ts';
import '@/ai/flows/text-to-speech.ts';
