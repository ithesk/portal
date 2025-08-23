
'use server';
/**
 * @fileOverview A flow for securely fetching financing requests for a given user.
 *
 * - fetchRequestsForUser - A function that returns all requests associated with a user ID.
 * - FetchRequestsInput - The input type for the fetchRequestsForUser function.
 * - FetchRequestsOutput - The return type for the fetchRequestsForUser function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { format, parseISO } from "date-fns";
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Using client SDK


// --- Schema Definitions ---
const FetchRequestsInputSchema = z.object({
  userId: z.string().describe('The user ID.'),
});
export type FetchRequestsInput = z.infer<typeof FetchRequestsInputSchema>;

const RequestSchema = z.object({
    id: z.string(),
    type: z.string(),
    date: z.string(),
    status: z.string(),
    financingAmount: z.number().nullable(),
});

const FetchRequestsOutputSchema = z.array(RequestSchema);
export type FetchRequestsOutput = z.infer<typeof FetchRequestsOutputSchema>;


// --- Exported Function ---
export async function fetchRequestsForUser(input: FetchRequestsInput): Promise<FetchRequestsOutput> {
  return fetchRequestsFlow(input);
}

// --- Genkit Flow Definition ---
const fetchRequestsFlow = ai.defineFlow(
  {
    name: 'fetchRequestsFlow',
    inputSchema: FetchRequestsInputSchema,
    outputSchema: FetchRequestsOutputSchema,
  },
  async ({ userId }) => {
    console.log(`CLIENT_SDK_FLOW: fetchRequestsFlow started for userId: ${userId}`);
    if (!userId) {
        console.error("CLIENT_SDK_FLOW: No userId provided.");
        return [];
    }

    try {
        const requestsRef = collection(db, "requests");
        
        // This query now directly uses the userId, which we can secure in the rules.
        const q = query(
            requestsRef, 
            where("userId", "==", userId), 
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        
        console.log(`CLIENT_SDK_FLOW: Found ${querySnapshot.docs.length} requests for userId ${userId}.`);
        
        const requestsData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            
            let dateStr: string;
            if (data.createdAt && typeof data.createdAt.toDate === 'function') { // Firestore Timestamp
                dateStr = format(data.createdAt.toDate(), "yyyy-MM-dd");
            } else if (data.createdAt && typeof data.createdAt === 'string') { // ISO String
                 dateStr = format(parseISO(data.createdAt), "yyyy-MM-dd");
            } else if (data.date && typeof data.date === 'string') { // Date string field
                dateStr = data.date;
            } else { // Fallback
                dateStr = format(new Date(), "yyyy-MM-dd");
            }
            
            return {
                id: doc.id,
                type: data.type || "Solicitud de Financiamiento",
                status: data.status || "Desconocido",
                date: dateStr,
                financingAmount: data.financingAmount ?? null,
            };
        });

        console.log("CLIENT_SDK_FLOW: Processed requests data:", JSON.stringify(requestsData, null, 2));
        return requestsData;

    } catch (error) {
        console.error("CLIENT_SDK_FLOW: CRITICAL - Error in fetchRequestsFlow with CLIENT SDK: ", error);
        return []; // Return empty array on error
    }
  }
);

// --- Helper to add userId to existing requests without it ---
// This is a utility function that you might run once from a secure environment
// if you need to backfill data. It's not part of the main flow.
const backfillUserIdOnRequests = ai.defineFlow(
    {
        name: 'backfillUserIdOnRequests',
        inputSchema: z.void(),
        outputSchema: z.object({ success: z.boolean(), updatedCount: z.number() }),
    },
    async () => {
        // THIS MUST RUN IN AN ADMIN CONTEXT (e.g., a local script with service account)
        // For demonstration, we assume db has admin privileges here.
        // In a real app, you would use the Admin SDK for this.
        console.log("Backfill started. This is a manual operation.");
        return { success: false, updatedCount: 0 };
    }
);
