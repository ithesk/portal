
'use server';
/**
 * @fileOverview A flow for verifying a user's identity using an external API.
 *
 * - verifyIdentity - A function that calls the identity verification API.
 * - VerifyIdentityInput - The input type for the verifyIdentity function.
 * - VerifyIdentityOutput - The return type for the verifyIdentity function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// --- Schema Definitions ---

export const VerifyIdentityInputSchema = z.object({
  cedula: z.string().describe('The national ID number to verify.'),
  id_image: z.string().describe("A photo of the ID card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  face_image: z.string().describe("A selfie of the person, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type VerifyIdentityInput = z.infer<typeof VerifyIdentityInputSchema>;

export const VerifyIdentityOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.any().optional(),
});
export type VerifyIdentityOutput = z.infer<typeof VerifyIdentityOutputSchema>;

// --- Exported Function ---

export async function verifyIdentity(input: VerifyIdentityInput): Promise<VerifyIdentityOutput> {
  return verifyIdentityFlow(input);
}

// --- Genkit Flow Definition ---

const verifyIdentityFlow = ai.defineFlow(
  {
    name: 'verifyIdentityFlow',
    inputSchema: VerifyIdentityInputSchema,
    outputSchema: VerifyIdentityOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.VERIFICATION_API_KEY;
    const apiUrl = "http://93.127.132.230:8000/verify";

    if (!apiKey) {
      console.error("VERIFICATION_FLOW: Missing VERIFICATION_API_KEY environment variable.");
      return {
        success: false,
        message: "La configuración del servidor está incompleta. No se pudo encontrar la clave de API.",
      };
    }
    
    try {
      const formData = new FormData();
      formData.append('cedula', input.cedula);
      
      // Convert Data URIs to Blobs
      const idImageResponse = await fetch(input.id_image);
      const idImageBlob = await idImageResponse.blob();
      formData.append('id_image', idImageBlob, 'id_image.jpg');

      const faceImageResponse = await fetch(input.face_image);
      const faceImageBlob = await faceImageResponse.blob();
      formData.append('face_image', faceImageBlob, 'face_image.jpg');
      
      formData.append('api_key', apiKey);
      
      console.log("VERIFICATION_FLOW: Calling external API...");
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
      
      const responseData = await response.json();
      console.log("VERIFICATION_FLOW: API Response Status:", response.status);
      console.log("VERIFICATION_FLOW: API Response Data:", responseData);


      if (!response.ok) {
        return {
            success: false,
            message: responseData.detail || `Error de la API: ${response.statusText}`,
            data: responseData,
        };
      }

      return {
          success: true,
          message: responseData.message || "Verificación completada.",
          data: responseData,
      };

    } catch (error: any) {
      console.error("VERIFICATION_FLOW: CRITICAL - Error calling verification API: ", error);
      return {
        success: false,
        message: `Error de conexión con el servicio de verificación: ${error.message}`,
      };
    }
  }
);
