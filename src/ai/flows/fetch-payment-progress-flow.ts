
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
    console.log(`PAYMENT_PROGRESS_FLOW: Starting for userId: ${userId}`);
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
            console.log(`PAYMENT_PROGRESS_FLOW: No active requests found for userId: ${userId}`);
            return { installmentsPaid: 0, totalInstallments: 0 };
        }

        // 2. Get all payments for the user to avoid multiple queries
        const paymentsRef = collection(db, "payments");
        const paymentsQuery = query(paymentsRef, where("userId", "==", userId));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const allUserPayments = paymentsSnapshot.docs.map(doc => doc.data());

        let totalInstallments = 0;
        let totalInstallmentsPaid = 0;

        // 3. Iterate through each active request and calculate progress
        for (const requestDoc of requestsSnapshot.docs) {
            const requestData = requestDoc.data();
            const requestId = requestDoc.id;

            // Sum up total installments from all active financings
            totalInstallments += requestData.installments || 0;

            // Count payments specifically for this request
            const paymentsForThisRequest = allUserPayments.filter(p => p.requestId === requestId).length;
            totalInstallmentsPaid += paymentsForThisRequest;
        }

        console.log(`PAYMENT_PROGRESS_FLOW: Calculated for userId: ${userId} -> Paid: ${totalInstallmentsPaid}, Total: ${totalInstallments}`);
        
        return {
            installmentsPaid: totalInstallmentsPaid,
            totalInstallments,
        };

    } catch (error) {
        console.error("PAYMENT_PROGRESS_FLOW: CRITICAL - Error fetching payment progress: ", error);
        return { installmentsPaid: 0, totalInstallments: 0 };
    }
  }
);
