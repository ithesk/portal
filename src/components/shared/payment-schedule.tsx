
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '../ui/skeleton';
import { add, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CalendarClock } from 'lucide-react';

export interface ScheduleInfo {
    totalBalance: number;
    nextPaymentAmount: number;
    nextPaymentDate: string | null;
}
interface PaymentScheduleProps {
    userId: string;
    onScheduleCalculated: (info: ScheduleInfo) => void;
}

interface ScheduleItem {
    installment: number;
    paymentDate: string;
    amount: number;
    status: 'Pendiente' | 'Pagado';
    equipmentName: string;
}

export function PaymentSchedule({ userId, onScheduleCalculated }: PaymentScheduleProps) {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        };

        const calculateSchedule = async () => {
            setLoading(true);
            try {
                // 1. Fetch all approved requests for the user
                const requestsQuery = query(
                    collection(db, 'requests'),
                    where('userId', '==', userId),
                    where('status', '==', 'Aprobado')
                );
                const requestsSnapshot = await getDocs(requestsQuery);

                if (requestsSnapshot.empty) {
                    setSchedule([]);
                    onScheduleCalculated({ totalBalance: 0, nextPaymentAmount: 0, nextPaymentDate: null });
                    setLoading(false);
                    return;
                }

                // 2. Fetch all payments for the user
                const paymentsQuery = query(collection(db, 'payments'), where('userId', '==', userId));
                const paymentsSnapshot = await getDocs(paymentsQuery);
                const paymentsMade = paymentsSnapshot.docs.map(doc => doc.data());
                
                let allUpcomingPayments: ScheduleItem[] = [];
                let totalFinanced = 0;

                for (const requestDoc of requestsSnapshot.docs) {
                    const request = requestDoc.data();
                    const requestId = requestDoc.id;
                    totalFinanced += request.financingAmount || 0;
                    
                    const equipmentName = request.itemType === 'phone' ? 'Teléfono' : 'Tablet'; 
                    
                    const paymentsForThisRequest = paymentsMade.filter(p => p.requestId === requestId).length;
                    
                    const timeZone = 'America/Santo_Domingo';
                    const startDate = toZonedTime((request.createdAt as Timestamp).toDate(), timeZone);

                    for (let i = 0; i < request.installments; i++) {
                         const installmentNumber = i + 1;
                         const isPaid = installmentNumber <= paymentsForThisRequest;

                         if (!isPaid) {
                             const paymentDate = add(startDate, { days: (installmentNumber) * 15 });
                             allUpcomingPayments.push({
                                installment: installmentNumber,
                                paymentDate: format(paymentDate, 'yyyy-MM-dd'),
                                amount: request.biweeklyPayment,
                                status: 'Pendiente',
                                equipmentName: `${equipmentName} (${requestId.substring(0,4)})`
                            });
                         }
                    }
                }

                // Calculate total balance
                const totalPaid = paymentsMade.reduce((acc, p) => acc + (p.amount || 0), 0);
                const initialPaymentsTotal = requestsSnapshot.docs.reduce((acc, doc) => acc + (doc.data().initialPayment || 0), 0);
                
                let totalDebt = 0;
                requestsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    // Use totalPaid from request if available, otherwise calculate
                    const requestTotal = data.totalPaid ? data.totalPaid : (data.initialPayment || 0) + ((data.biweeklyPayment || 0) * (data.installments || 0));
                    totalDebt += requestTotal;
                });
                
                const currentBalance = totalDebt - initialPaymentsTotal - totalPaid;


                // Sort all payments by date and take the next 10 for display
                allUpcomingPayments.sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
                setSchedule(allUpcomingPayments.slice(0, 10));

                const nextPayment = allUpcomingPayments[0];
                onScheduleCalculated({
                    totalBalance: currentBalance > 0 ? currentBalance : 0,
                    nextPaymentAmount: nextPayment?.amount || 0,
                    nextPaymentDate: nextPayment?.paymentDate || null,
                });


            } catch (error) {
                console.error("Error calculating payment schedule: ", error);
                 onScheduleCalculated({ totalBalance: 0, nextPaymentAmount: 0, nextPaymentDate: null });
            } finally {
                setLoading(false);
            }
        };

        calculateSchedule();
    }, [userId, onScheduleCalculated]);

    return (
        <Card className="flex flex-col">
            <CardHeader className="px-7">
                <CardTitle>Próximos Pagos</CardTitle>
                <CardDescription>
                    Tu calendario de pagos pendientes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Equipo</TableHead>
                            <TableHead>Cuota</TableHead>
                            <TableHead>Fecha de Pago</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             Array.from({ length: 3 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : schedule.length > 0 ? (
                            schedule.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.equipmentName}</TableCell>
                                    <TableCell>{item.installment}</TableCell>
                                    <TableCell>{item.paymentDate}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{item.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">RD$ {item.amount.toFixed(2)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                           <TableRow>
                                <TableCell colSpan={5}>
                                    <Alert className="border-none">
                                        <CalendarClock className="h-4 w-4" />
                                        <AlertTitle>¡Todo al día!</AlertTitle>
                                        <AlertDescription>
                                            No tienes pagos pendientes en tu calendario.
                                        </AlertDescription>
                                    </Alert>
                                </TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
