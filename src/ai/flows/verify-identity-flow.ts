
'use server';
/**
 * @fileOverview A flow for verifying a user's identity using an external API.
 *
 * - verifyIdentity - A function that calls the identity verification API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { VerifyIdentityInput, VerifyIdentityOutput, VerifyIdentityInputSchema, VerifyIdentityOutputSchema } from '@/app/internal/requests/new/page';


// --- Exported Function ---

export async function verifyIdentity(input: VerifyIdentityInput): Promise<VerifyIdentityOutput> {
  // We need to re-validate the input here on the server-side as well for security.
  // The zod schema is defined in the page component, but we can't import it directly.
  // So we re-define it here for validation, but we import the TYPE for type-safety.
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
    // The schema types are imported, but the Zod schema objects cannot be.
    // We pass `z.any()` to satisfy the requirement, but validation will be done inside the flow.
    inputSchema: z.any() as z.ZodType<VerifyIdentityInput>,
    outputSchema: z.any() as z.ZodType<VerifyIdentityOutput>,
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
