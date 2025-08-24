
'use server';
/**
 * @fileOverview A flow for fetching a user's payment progress on active financings.
 *
 * - fetchPaymentProgress - Calculates paid and total installments for active requests.
 * - PaymentProgressInput - The input type for the fetchPaymentProgress function.
 * - PaymentProgressOutput - The return type for the fetchPaymentProgress function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// --- Schema Definitions ---

const PaymentProgressInputSchema = z.object({
  userId: z.string().describe('The user ID.'),
});
export type PaymentProgressInput = z.infer<typeof PaymentProgressInputSchema>;

const PaymentProgressOutputSchema = z.object({
  installmentsPaid: z.number(),
  totalInstallments: z.number(),
});
export type PaymentProgressOutput = z.infer<typeof PaymentProgressOutputSchema>;

// --- Exported Function ---

export async function fetchPaymentProgress(input: PaymentProgressInput): Promise<PaymentProgressOutput> {
  return fetchPaymentProgressFlow(input);
}

// --- Genkit Flow Definition ---

const fetchPaymentProgressFlow = ai.defineFlow(
  {
    name: 'fetchPaymentProgressFlow',
    inputSchema: PaymentProgressInputSchema,
    outputSchema: PaymentProgressOutputSchema,
  },
  async ({ userId }) => {
    if (!userId) {
        console.error("PAYMENT_PROGRESS_FLOW: No userId provided.");
        return { installmentsPaid: 0, totalInstallments: 0 };
    }

    try {
        // 1. Get all active ("Aprobado") requests for the user
        const requestsRef = collection(db, "requests");
        const activeRequestsQuery = query(requestsRef, where("userId", "==", userId), where("status", "==", "Aprobado"));
        const requestsSnapshot = await getDocs(activeRequestsQuery);

        if (requestsSnapshot.empty) {
            return { installmentsPaid: 0, totalInstallments: 0 };
        }

        const requestIds = requestsSnapshot.docs.map(doc => doc.id);
        
        let totalInstallments = 0;
        requestsSnapshot.docs.forEach(doc => {
            totalInstallments += doc.data().installments || 0;
        });

        // 2. Get all payments for those active requests
        // Firestore 'in' query is limited to 30 elements. If a user can have more, this needs batching.
        const paymentsRef = collection(db, "payments");
        const paymentsQuery = query(paymentsRef, where("requestId", "in", requestIds));
        const paymentsSnapshot = await getDocs(paymentsQuery);

        // We only count payments that are not the initial one, as they correspond to installments.
        // A robust way would be to add a `type: 'installment'` field to payment documents.
        // For now, we assume all payments in the collection are for installments.
        const installmentsPaid = paymentsSnapshot.size;
        
        return {
            installmentsPaid,
            totalInstallments,
        };

    } catch (error) {
        console.error("PAYMENT_PROGRESS_FLOW: CRITICAL - Error fetching payment progress: ", error);
        return { installmentsPaid: 0, totalInstallments: 0 };
    }
  }
);
