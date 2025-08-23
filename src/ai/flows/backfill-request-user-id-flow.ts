
'use server';
/**
 * @fileOverview A one-time utility flow to backfill userId on existing requests.
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
    console.log("BACKFILL_FLOW: Starting backfill process...");
    const batch = writeBatch(db);
    let requestsChecked = 0;
    let requestsUpdated = 0;

    try {
      // 1. Get all users and map their cedula to their UID
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const cedulaToUserIdMap = new Map<string, string>();
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.cedula) {
          cedulaToUserIdMap.set(data.cedula, doc.id);
        }
      });
      console.log(`BACKFILL_FLOW: Found ${cedulaToUserIdMap.size} users with cedulas.`);

      // 2. Get all requests that are missing the userId field.
      // Firestore doesn't have a "where field does not exist" query, so we query for a known-to-exist field
      // and then filter in code. This is less efficient but necessary. A better way is to query
      // for a field that is unlikely to be set on old docs, like `where('userId', '==', null)` if that works for your rules.
      // For this case, we'll get all and filter locally.
      const requestsRef = collection(db, "requests");
      const requestsSnapshot = await getDocs(requestsRef);
      
      requestsChecked = requestsSnapshot.size;
      console.log(`BACKFILL_FLOW: Found ${requestsChecked} total requests to check.`);

      requestsSnapshot.forEach(doc => {
        const request = doc.data();
        // Check if userId is missing and cedula is present
        if (!request.userId && request.cedula) {
          const userId = cedulaToUserIdMap.get(request.cedula);
          if (userId) {
            console.log(`BACKFILL_FLOW: Match found! Request [${doc.id}] for cedula [${request.cedula}] will be updated with userId [${userId}].`);
            batch.update(doc.ref, { userId: userId });
            requestsUpdated++;
          }
        }
      });

      if (requestsUpdated > 0) {
        console.log(`BACKFILL_FLOW: Committing batch to update ${requestsUpdated} requests.`);
        await batch.commit();
      } else {
        console.log("BACKFILL_FLOW: No requests needed an update.");
      }

      const message = `Backfill complete. Checked ${requestsChecked} requests, updated ${requestsUpdated}.`;
      console.log(`BACKFILL_FLOW: ${message}`);
      return {
        success: true,
        message,
        requestsChecked,
        requestsUpdated,
      };

    } catch (error: any) {
      console.error("BACKFILL_FLOW: CRITICAL - Error during backfill process: ", error);
      return {
        success: false,
        message: `Error during backfill: ${error.message}`,
        requestsChecked,
        requestsUpdated: 0,
      };
    }
  }
);
