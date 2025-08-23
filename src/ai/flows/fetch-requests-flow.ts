
'use server';
/**
 * @fileOverview A flow for securely fetching financing requests for a given user.
 *
 * - fetchRequestsForUser - A function that returns all requests associated with a user ID.
 * - FetchRequestsInput - The input type for the fetchRequestsForUser function.
 * - FetchRequestsOutput - The return type for the fetchRequestsForUser function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { format, parseISO } from "date-fns";
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';


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
    try {
        console.log(`DEBUG: fetchRequestsFlow started for userId: ${userId} using CLIENT SDK`);
        
        // 1. Fetch user document on the server to get their cedula
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            console.error(`DEBUG: User with ID ${userId} not found.`);
            return [];
        }

        const cedula = userDocSnap.data()?.cedula;
        if (!cedula) {
            console.error(`DEBUG: Cedula not found for user with ID ${userId}.`);
            return [];
        }
        console.log(`DEBUG: Found cedula ${cedula} for user ${userId}.`);

        // 2. Fetch requests using the obtained cedula
        const requestsRef = collection(db, "requests");
        // This query will be allowed by the new security rules
        const q = query(requestsRef, where("cedula", "==", cedula));
        const querySnapshot = await getDocs(q);
        
        console.log(`DEBUG: Found ${querySnapshot.docs.length} requests for cedula ${cedula}.`);
        
        const requestsData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            
            let dateStr: string;
            // Firestore timestamps can be tricky. Handle different formats.
            if (data.createdAt && typeof data.createdAt.toDate === 'function') { // Firestore Timestamp
                dateStr = format(data.createdAt.toDate(), "yyyy-MM-dd");
            } else if (data.createdAt && typeof data.createdAt === 'string') { // ISO String
                try {
                    dateStr = format(parseISO(data.createdAt), "yyyy-MM-dd");
                } catch {
                     dateStr = format(new Date(), "yyyy-MM-dd"); // Fallback
                }
            } else if (data.date && typeof data.date === 'string') { // Date string field
                dateStr = data.date;
            } else { // Ultimate fallback
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

        // Sort by date descending on the server before returning
        requestsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        console.log("DEBUG: Processed requests data:", requestsData);
        return requestsData;

    } catch (error) {
        console.error("DEBUG: Error in fetchRequestsFlow: ", error);
        return [];
    }
  }
);
