
'use server';
/**
 * @fileOverview A flow for securely fetching financing requests for a given user.
 *
 * - fetchRequestsForUser - A function that returns all requests associated with a user ID.
 * - FetchRequestsInput - The input type for the fetchRequestsForUser function.
 * - FetchRequestsOutput - The return type for the fetchRequestsForUser function.
 */
import 'dotenv/config';
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { format, parseISO } from "date-fns";
import * as admin from 'firebase-admin';

// --- Firebase Admin Initialization ---
function initializeFirebase() {
    if (!admin.apps.length) {
        try {
            console.log("DEBUG: No Firebase Admin app initialized. Initializing...");
            const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
            if (!serviceAccountString) {
                console.error("DEBUG: FIREBASE_SERVICE_ACCOUNT env var is not defined.");
                throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable not set.");
            }
            const serviceAccount = JSON.parse(serviceAccountString);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseName: 'alzadatos',
            });
             console.log("DEBUG: Firebase Admin SDK Initialized Successfully.");
        } catch (error: any) {
            console.error("DEBUG: Critical error initializing Firebase Admin SDK:", error.message);
            throw error; // Re-throw the error to fail fast
        }
    } else {
        console.log("DEBUG: Firebase Admin app already initialized.");
    }
}

initializeFirebase();

const db = admin.firestore();

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
        console.log(`DEBUG: fetchRequestsFlow started for userId: ${userId}`);
        // 1. Securely fetch user document on the server to get their cedula
        const userDocRef = db.collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
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
        const requestsRef = db.collection("requests");
        const q = requestsRef.where("cedula", "==", cedula).orderBy("createdAt", "desc");
        const querySnapshot = await q.get();
        
        console.log(`DEBUG: Found ${querySnapshot.docs.length} requests for cedula ${cedula}.`);
        
        const requestsData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            
            let dateStr: string;

            if (data.createdAt && typeof data.createdAt.toDate === 'function') { // Check for Firestore Timestamp
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

        console.log("DEBUG: Processed requests data:", requestsData);
        return requestsData;

    } catch (error) {
        console.error("DEBUG: Error in fetchRequestsFlow: ", error);
        return [];
    }
  }
);
