
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
import { format, parseISO } from "date-fns";


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
            
            let dateStr: string;

            if (data.createdAt && data.createdAt instanceof Timestamp) {
                // Handle Firestore Timestamp
                dateStr = format(data.createdAt.toDate(), "yyyy-MM-dd");
            } else if (data.createdAt && typeof data.createdAt === 'string') {
                // Handle ISO string dates
                try {
                    dateStr = format(parseISO(data.createdAt), "yyyy-MM-dd");
                } catch {
                     // Fallback for non-standard string dates, or use a default
                     dateStr = format(new Date(), "yyyy-MM-dd");
                }
            } else if (data.date && typeof data.date === 'string') {
                // Fallback to the 'date' field if it exists
                dateStr = data.date;
            } else {
                 // Final fallback if no valid date is found
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

        return requestsData;
    } catch (error) {
        console.error("Error in fetchRequestsFlow: ", error);
        return [];
    }
  }
);
