
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
import { collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parseISO } from "date-fns";


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


export async function fetchRequestsForUser(input: FetchRequestsInput): Promise<FetchRequestsOutput> {
  return fetchRequestsFlow(input);
}


const fetchRequestsFlow = ai.defineFlow(
  {
    name: 'fetchRequestsFlow',
    inputSchema: FetchRequestsInputSchema,
    outputSchema: FetchRequestsOutputSchema,
  },
  async ({ userId }) => {
    try {
        // 1. Securely fetch user document on the server to get their cedula
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            console.error(`User with ID ${userId} not found.`);
            return [];
        }

        const cedula = userDocSnap.data()?.cedula;
        if (!cedula) {
            console.error(`Cedula not found for user with ID ${userId}.`);
            return [];
        }

        // 2. Fetch requests using the obtained cedula
        const requestsRef = collection(db, "requests");
        const q = query(requestsRef, where("cedula", "==", cedula), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const requestsData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            
            let dateStr: string;

            if (data.createdAt && data.createdAt instanceof Timestamp) {
                dateStr = format(data.createdAt.toDate(), "yyyy-MM-dd");
            } else if (data.createdAt && typeof data.createdAt === 'string') {
                try {
                    dateStr = format(parseISO(data.createdAt), "yyyy-MM-dd");
                } catch {
                     dateStr = format(new Date(), "yyyy-MM-dd");
                }
            } else if (data.date && typeof data.date === 'string') {
                dateStr = data.date;
            } else {
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
