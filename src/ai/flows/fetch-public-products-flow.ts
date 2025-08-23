
'use server';
/**
 * @fileOverview A flow for fetching publicly available products.
 *
 * - fetchPublicProducts - A function that returns all products marked as "Publicado".
 * - PublicProduct - The interface for a public product.
 * - FetchPublicProductsOutput - The return type for the fetchPublicProducts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { collection, getDocs, query, where, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

export async function fetchPublicProducts(): Promise<FetchPublicProductsOutput> {
  return fetchPublicProductsFlow();
}

const fetchPublicProductsFlow = ai.defineFlow(
  {
    name: 'fetchPublicProductsFlow',
    inputSchema: z.void(),
    outputSchema: FetchPublicProductsOutputSchema,
  },
  async () => {
    console.log("DEBUG: Iniciando fetchPublicProductsFlow.");
    try {
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("status", "==", "Publicado"));
        const querySnapshot = await getDocs(q);

        console.log(`DEBUG: Documentos encontrados con status "Publicado": ${querySnapshot.docs.length}`);

        const productsData = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return {
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
        });
        
        console.log("DEBUG: Datos procesados para enviar al cliente:", JSON.stringify(productsData, null, 2));
        return productsData;

    } catch (error) {
        console.error("DEBUG: Error en fetchPublicProductsFlow: ", error);
        return [];
    }
  }
);
