
'use server';
/**
 * @fileOverview A flow for securely fetching financing requests for a given user.
 *
 * - fetchRequestsForCedula - A function that returns all requests associated with a cedula.
 * - FetchRequestsInput - The input type for the fetchRequestsForCedula function.
 * - FetchRequestsOutput - The return type for the fetchRequestsForCedula function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from "date-fns";


const FetchRequestsInputSchema = z.object({
  cedula: z.string().describe('The Cédula (national ID) of the user.'),
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


export async function fetchRequestsForCedula(input: FetchRequestsInput): Promise<FetchRequestsOutput> {
  return fetchRequestsFlow(input);
}


const fetchRequestsFlow = ai.defineFlow(
  {
    name: 'fetchRequestsFlow',
    inputSchema: FetchRequestsInputSchema,
    outputSchema: FetchRequestsOutputSchema,
  },
  async ({ cedula }) => {
    try {
        const requestsRef = collection(db, "requests");
        const q = query(requestsRef, where("cedula", "==", cedula), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const requestsData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            
            // Handle Firestore Timestamp conversion to a simple string
            let dateStr = data.date; // Fallback to existing date field
            if (data.createdAt instanceof Timestamp) {
                dateStr = format(data.createdAt.toDate(), "yyyy-MM-dd");
            } else if (typeof data.createdAt === 'string') {
                // Handle if it's already a string, though Timestamp is expected
                dateStr = format(new Date(data.createdAt), "yyyy-MM-dd");
            }
            
            return {
                id: doc.id,
                type: data.type || "Solicitud de Financiamiento",
                status: data.status || "Desconocido",
                date: dateStr,
                financingAmount: data.financingAmount ?? null,
            };
        });

        return requestsData;
    } catch (error) {
        console.error("Error in fetchRequestsFlow: ", error);
        // In a real app, you might want more robust error handling
        return [];
    }
  }
);
