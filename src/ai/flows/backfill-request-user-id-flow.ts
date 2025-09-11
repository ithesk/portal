
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
      console.log("BACKFILL_FLOW: Attempting to fetch users from 'users' collection...");
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const cedulaToUserIdMap = new Map<string, string>();
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.cedula) {
          cedulaToUserIdMap.set(data.cedula, doc.id);
        }
      });
      console.log(`BACKFILL_FLOW: Successfully fetched ${cedulaToUserIdMap.size} users with cedulas.`);

      // 2. Get all requests. We will filter locally.
      console.log("BACKFILL_FLOW: Attempting to fetch all requests from 'requests' collection...");
      const requestsRef = collection(db, "requests");
      const requestsSnapshot = await getDocs(requestsRef);
      
      requestsChecked = requestsSnapshot.size;
      console.log(`BACKFILL_FLOW: Successfully fetched ${requestsChecked} total requests to check.`);

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
        console.log(`BACKFILL_FLOW: Found ${requestsUpdated} requests to update. Committing batch...`);
        await batch.commit();
        console.log("BACKFILL_FLOW: Batch commit successful.");
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
      console.error("BACKFILL_FLOW: CRITICAL - An error occurred during the backfill process.");
      console.error("BACKFILL_FLOW: Error Message:", error.message);
      console.error("BACKFILL_FLOW: Error Details:", error);
      return {
        success: false,
        message: `Error during backfill: ${error.message}`,
        requestsChecked,
        requestsUpdated: 0,
      };
    }
  }
);
