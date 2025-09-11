
'use server';
/**
 * @fileOverview A one-time utility flow to backfill userId on existing requests.
 * @deprecated This logic has been moved to a secure Cloud Function `backfillRequestUserIds`.
 *
 * - backfillRequestUserId - Finds requests without a userId and attempts to add it by matching the cedula with a user.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, query, where, getDocs, writeBatch, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// --- Schema Definitions ---

const BackfillOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  requestsChecked: z.number(),
  requestsUpdated: z.number(),
});
export type BackfillOutput = z.infer<typeof BackfillOutputSchema>;

// --- Exported Function ---

export async function backfillRequestUserId(): Promise<BackfillOutput> {
  console.warn("DEPRECATION_WARNING: The 'backfillRequestUserId' Genkit flow is deprecated. Use the 'backfillRequestUserIds' Cloud Function instead.");
  return backfillRequestUserIdFlow();
}

// --- Genkit Flow Definition ---

const backfillRequestUserIdFlow = ai.defineFlow(
  {
    name: 'backfillRequestUserIdFlow',
    inputSchema: z.void(),
    outputSchema: BackfillOutputSchema,
  },
  async () => {
    // This flow is now deprecated as it lacks the necessary admin permissions.
    // The logic has been moved to the `backfillRequestUserIds` Cloud Function.
    return {
        success: false,
        message: 'This flow is deprecated. Please use the `backfillRequestUserIds` Cloud Function which has the required admin permissions.',
        requestsChecked: 0,
        requestsUpdated: 0,
      };
  }
);
