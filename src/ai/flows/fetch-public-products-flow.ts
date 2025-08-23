
'use server';
/**
 * @fileOverview A flow for fetching publicly available products.
 *
 * - fetchPublicProducts - A function that returns all products marked as "Publicado".
 * - PublicProduct - The interface for a public product.
 * - FetchPublicProductsOutput - The return type for the fetchPublicProducts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';

// --- Firebase Admin SDK Initialization ---

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    // Safely parse the service account key from environment variables
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : undefined;

    // Initialize the app only if service account is available
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("DEBUG: Firebase Admin SDK inicializado.");
    } else {
      console.error("DEBUG: FIREBASE_SERVICE_ACCOUNT no está definido. No se puede inicializar el Admin SDK.");
    }
  } catch (e: any) {
    console.error('DEBUG: Error al inicializar Firebase Admin SDK:', e.message);
  }
}

// Function to get the Firestore instance, ensuring the app is initialized first.
function getDb() {
  if (!admin.apps.length) {
    console.error("DEBUG: Firebase Admin no está inicializado al intentar obtener la instancia de DB.");
    // Return a dummy object or throw an error to avoid crashing, but indicate a problem
    throw new Error("Firebase Admin SDK not initialized");
  }
  return admin.firestore();
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
    console.log("DEBUG: Iniciando fetchPublicProductsFlow con Admin SDK.");
    try {
        const db = getDb(); // Get DB instance inside the flow
        const productsRef = db.collection("products");
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
