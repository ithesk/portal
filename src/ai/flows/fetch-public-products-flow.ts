
'use server';
/**
 * @fileOverview A flow for fetching publicly available products.
 *
 * - fetchPublicProducts - A function that returns all products marked as "Publicado".
 * - PublicProduct - The interface for a public product.
 * - FetchPublicProductsOutput - The return type for the fetchPublicProducts function.
 */
import 'dotenv/config';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';

// --- Firebase Admin SDK Initialization ---
let db: admin.firestore.Firestore | null = null;

function initializeFirebase() {
    if (admin.apps.length === 0) {
        console.log("DEBUG: No Firebase Admin app initialized. Initializing...");
        try {
            const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
            if (!serviceAccountString) {
                console.error("DEBUG: FIREBASE_SERVICE_ACCOUNT env var is not defined.");
                throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable not set.");
            }
            const serviceAccount = JSON.parse(serviceAccountString);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("DEBUG: Firebase Admin SDK initialized successfully.");
            db = admin.firestore();
        } catch (e: any) {
            console.error('DEBUG: Critical error initializing Firebase Admin SDK:', e.message);
            // We throw here because the app cannot function without it.
            throw e; 
        }
    } else {
        console.log("DEBUG: Firebase Admin app already initialized.");
        if (!db) {
            db = admin.firestore();
        }
    }
}


// --- Schema Definitions ---

const PublicProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    popular: z.boolean(),
    imageUrl: z.string(),
    aiHint: z.string(),
    initialPayment: z.string(),
    biweeklyPayment: z.string(),
    totalPrice: z.string(),
    currency: z.string(),
    status: z.string(),
});

export type PublicProduct = z.infer<typeof PublicProductSchema>;

const FetchPublicProductsOutputSchema = z.array(PublicProductSchema);
export type FetchPublicProductsOutput = z.infer<typeof FetchPublicProductsOutputSchema>;

// --- Exported Function ---

export async function fetchPublicProducts(): Promise<FetchPublicProductsOutput> {
  return fetchPublicProductsFlow();
}

// --- Genkit Flow Definition ---

const fetchPublicProductsFlow = ai.defineFlow(
  {
    name: 'fetchPublicProductsFlow',
    inputSchema: z.void(),
    outputSchema: FetchPublicProductsOutputSchema,
  },
  async () => {
    // Ensure Firebase is initialized before running the flow logic
    if (!db) {
      initializeFirebase();
    }
    
    console.log("DEBUG: Iniciando fetchPublicProductsFlow con Admin SDK.");
    try {
        const productsRef = db!.collection("products");
        const q = productsRef.where("status", "==", "Publicado");
        const querySnapshot = await q.get();

        console.log(`DEBUG: Documentos encontrados con status "Publicado": ${querySnapshot.docs.length}`);

        if (querySnapshot.empty) {
            console.log("DEBUG: La consulta a Firestore no devolvió documentos.");
            return [];
        }

        const productsData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const product = {
                id: doc.id,
                name: data.name || "",
                popular: data.popular || false,
                imageUrl: data.imageUrl || "https://placehold.co/400x400.png",
                aiHint: data.aiHint || "product image",
                initialPayment: data.initialPayment?.toString() || "0",
                biweeklyPayment: data.biweeklyPayment?.toString() || "0",
                totalPrice: data.price?.toString() || "0",
                currency: data.currency || "RD$",
                status: data.status || "Borrador",
            };
            return product;
        });
        
        console.log("DEBUG: Datos procesados para enviar al cliente:", JSON.stringify(productsData, null, 2));
        return productsData;

    } catch (error) {
        console.error("DEBUG: Error en fetchPublicProductsFlow con Admin SDK: ", error);
        return [];
    }
  }
);
