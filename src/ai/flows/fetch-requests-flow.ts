
'use server';
import 'dotenv/config'; // Ensure env variables are loaded
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
import * as admin from 'firebase-admin';

// --- Firebase Admin SDK Initialization ---

function initializeFirebaseAdmin() {
    console.log("SERVER DEBUG: Checking Firebase Admin initialization status...");
    if (admin.apps.length > 0) {
        console.log("SERVER DEBUG: Firebase Admin already initialized.");
        return;
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
        console.error("SERVER DEBUG: CRITICAL - FIREBASE_SERVICE_ACCOUNT env var is NOT defined.");
        throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable not set.");
    }
    
    try {
        console.log("SERVER DEBUG: Initializing Firebase Admin with service account...");
        const serviceAccount = JSON.parse(serviceAccountString);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("SERVER DEBUG: Firebase Admin initialized SUCCESSFULLY.");
    } catch (e: any) {
        console.error("SERVER DEBUG: CRITICAL - Error parsing or using service account.", e.message);
        throw new Error("Failed to initialize Firebase Admin SDK: " + e.message);
    }
}

// Call initialization logic right away
initializeFirebaseAdmin();

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
        console.log(`SERVER DEBUG: fetchRequestsFlow started for userId: ${userId} using ADMIN SDK`);
        const db = admin.firestore();
        
        // 1. Fetch user document on the server to get their cedula
        const userDocRef = db.collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
            console.error(`SERVER DEBUG: User with ID ${userId} not found in Firestore.`);
            return [];
        }

        const cedula = userDocSnap.data()?.cedula;
        if (!cedula) {
            console.error(`SERVER DEBUG: Cedula not found for user with ID ${userId}.`);
            return [];
        }
        console.log(`SERVER DEBUG: Found cedula ${cedula} for user ${userId}.`);

        // 2. Fetch requests using the obtained cedula
        const requestsRef = db.collection("requests");
        const q = requestsRef.where("cedula", "==", cedula);
        const querySnapshot = await q.get();
        
        console.log(`SERVER DEBUG: Found ${querySnapshot.docs.length} requests for cedula ${cedula}.`);
        
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

        requestsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        console.log("SERVER DEBUG: Processed requests data:", JSON.stringify(requestsData, null, 2));
        return requestsData;

    } catch (error) {
        console.error("SERVER DEBUG: CRITICAL - Error in fetchRequestsFlow with ADMIN SDK: ", error);
        return []; // Return empty array on error
    }
  }
);
