
'use server';
/**
 * @fileOverview A flow for verifying a user's identity using an external API.
 * THIS FLOW IS DEPRECATED AND REPLACED BY run-identity-check-flow.ts
 * - verifyIdentity - A function that calls the identity verification API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { VerifyIdentityInput, VerifyIdentityOutput } from '@/app/internal/requests/new/page';


// --- Exported Function ---

export async function verifyIdentity(input: VerifyIdentityInput): Promise<VerifyIdentityOutput> {
  
   const ServerVerifyIdentityInputSchema = z.object({
      cedula: z.string().describe('The national ID number to verify.'),
      id_image: z.string().describe("A photo of the ID card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
      face_image: z.string().describe("A selfie of the person, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
    });

  return verifyIdentityFlow(input);
}

// --- Genkit Flow Definition ---

const verifyIdentityFlow = ai.defineFlow(
  {
    name: 'verifyIdentityFlow',
    inputSchema: z.any() as z.ZodType<VerifyIdentityInput>,
    outputSchema: z.any() as z.ZodType<VerifyIdentityOutput>,
  },
  async (input) => {
      console.warn("DEPRECATED: verifyIdentityFlow is deprecated. Use runIdentityCheckFlow instead.");
      return {
        success: false,
        message: "This flow is deprecated.",
      };
  }
);
