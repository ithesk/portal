
'use server';
/**
 * @fileOverview A flow for running the identity check after the client has uploaded their selfie.
 *
 * - runIdentityCheck - A function that calls the identity verification API.
 * - RunIdentityCheckInput - The input type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';


// --- Schema Definitions ---

const RunIdentityCheckInputSchema = z.object({
  verificationId: z.string().describe('The ID of the verification document in Firestore.'),
});
export type RunIdentityCheckInput = z.infer<typeof RunIdentityCheckInputSchema>;

const RunIdentityCheckOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});
export type RunIdentityCheckOutput = z.infer<typeof RunIdentityCheckOutputSchema>;


// --- Exported Function ---

export async function runIdentityCheck(input: RunIdentityCheckInput): Promise<RunIdentityCheckOutput> {
  return runIdentityCheckFlow(input);
}

// --- Genkit Flow Definition ---

const runIdentityCheckFlow = ai.defineFlow(
  {
    name: 'runIdentityCheckFlow',
    inputSchema: RunIdentityCheckInputSchema,
    outputSchema: RunIdentityCheckOutputSchema,
  },
  async ({ verificationId }) => {
    const apiKey = process.env.VERIFICATION_API_KEY;
    const apiUrl = "http://93.127.132.230:8000/verify";

    if (!apiKey) {
      console.error("ID_CHECK_FLOW: Missing VERIFICATION_API_KEY environment variable.");
      await updateDoc(doc(db, "verifications", verificationId), {
          status: 'failed',
          error: 'Server configuration is incomplete.',
      });
      return { success: false, message: "Server configuration is incomplete." };
    }
    
    const verificationRef = doc(db, "verifications", verificationId);

    try {
        // 1. Get the verification data from Firestore
        const docSnap = await getDoc(verificationRef);
        if (!docSnap.exists()) {
            throw new Error(`Verification document with ID ${verificationId} not found.`);
        }
        const verificationData = docSnap.data();
        
        if (verificationData.status !== 'pending-verification') {
             throw new Error(`Verification document is not in the correct state. Status: ${verificationData.status}`);
        }

        // 2. Prepare data for the external API
        const formData = new FormData();
        formData.append('cedula', verificationData.cedula);
        
        // Convert URLs back to Blobs to send as files
        const idImageResponse = await fetch(verificationData.idImageUrl);
        const idImageBlob = await idImageResponse.blob();
        formData.append('id_image', idImageBlob, 'id_image.jpg');

        const faceImageResponse = await fetch(verificationData.selfieUrl);
        const faceImageBlob = await faceImageResponse.blob();
        formData.append('face_image', faceImageBlob, 'face_image.jpg');
        
        formData.append('api_key', apiKey);
      
        // 3. Call external API
        console.log("ID_CHECK_FLOW: Calling external API for verificationId:", verificationId);
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
        });
        
        const responseData = await response.json();
        console.log("ID_CHECK_FLOW: API Response Status:", response.status, "Body:", responseData);

        // 4. Update Firestore with the result
        if (!response.ok) {
            await updateDoc(verificationRef, {
                status: 'failed',
                apiResponse: responseData,
                error: `API Error: ${response.statusText}`,
            });
            return { success: false, message: responseData.detail || `API Error: ${response.statusText}`};
        }
        
        // 5. On success, update the user profile as well if verification passed
        if (responseData.verification_passed) {
            const userDocRef = doc(db, "users", responseData.document_info.cedula);
            const userSnap = await getDoc(userDocRef);
            
            const profileData = {
                name: responseData.document_info.nombre_completo,
                cedula: responseData.document_info.cedula,
                birthDate: responseData.document_info.fecha_nacimiento,
                // Add any other fields from document_info you want to save
            };

            if (userSnap.exists()) {
                await updateDoc(userDocRef, profileData);
            } else {
                 await setDoc(userDocRef, { 
                     ...profileData, 
                     role: 'Cliente', 
                     status: 'Activo', 
                     since: new Date().toLocaleDateString('es-DO'), 
                     createdAt: serverTimestamp() 
                 });
            }
        }
        
        await updateDoc(verificationRef, {
            status: 'completed',
            apiResponse: responseData,
        });

        return { success: true, message: "Verification completed successfully." };

    } catch (error: any) {
      console.error("ID_CHECK_FLOW: CRITICAL - Error during verification process: ", error);
       await updateDoc(verificationRef, {
          status: 'failed',
          error: error.message,
      }).catch(e => console.error("Failed to write failure state to doc", e));

      return { success: false, message: `Internal error: ${error.message}` };
    }
  }
);
