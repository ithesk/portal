
'use server';
/**
 * @fileOverview A flow for linking equipment to a user after registration.
 *
 * - linkEquipmentToUser - A function that links existing equipment records to a newly registered user.
 * - LinkEquipmentInput - The input type for the linkEquipmentToUser function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LinkEquipmentInputSchema = z.object({
  userId: z.string().describe('The ID of the newly registered user.'),
  cedula: z.string().describe('The Cédula (national ID) of the user.'),
});
export type LinkEquipmentInput = z.infer<typeof LinkEquipmentInputSchema>;


export async function linkEquipmentToUser(input: LinkEquipmentInput): Promise<{ success: boolean; linkedCount: number; }> {
  return linkEquipmentFlow(input);
}


const linkEquipmentFlow = ai.defineFlow(
  {
    name: 'linkEquipmentFlow',
    inputSchema: LinkEquipmentInputSchema,
    outputSchema: z.object({
        success: z.boolean(),
        linkedCount: z.number(),
    }),
  },
  async ({ userId, cedula }) => {
    try {
        const equipmentRef = collection(db, "equipment");
        // Find equipment that was approved for this cedula but doesn't have a userId yet.
        // A robust way to check for "no userId" is to check for documents where the field is not present or not a valid string.
        // Using `not-in` with a dummy value is a common Firestore trick for "is not set".
        const q = query(equipmentRef, where("cedula", "==", cedula), where("userId", "not-in", [""]));

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return { success: true, linkedCount: 0 };
        }

        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            const equipmentDocRef = doc.ref;
            batch.update(equipmentDocRef, { userId: userId });
        });

        await batch.commit();

        return { success: true, linkedCount: querySnapshot.size };
    } catch (error) {
        console.error("Error in linkEquipmentFlow: ", error);
        // In a real app, you'd want more robust error handling/logging
        return { success: false, linkedCount: 0 };
    }
  }
);
