
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import { add, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CalendarClock, CalendarDays, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentInstructionsDialog } from './payment-instructions-dialog';
import { Button } from '../ui/button';

export interface ScheduleInfo {
    nextPaymentAmount: number;
    nextPaymentDate: string | null;
    periodStartDate: string | null;
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
                const requestsQuery = query(
                    collection(db, 'requests'),
                    where('userId', '==', userId),
                    where('status', '==', 'Aprobado')
                );
                const requestsSnapshot = await getDocs(requestsQuery);

                if (requestsSnapshot.empty) {
                    setSchedule([]);
                    onScheduleCalculated({ nextPaymentAmount: 0, nextPaymentDate: null, periodStartDate: null });
                    setLoading(false);
                    return;
                }

                const paymentsQuery = query(collection(db, 'payments'), where('userId', '==', userId));
                const paymentsSnapshot = await getDocs(paymentsQuery);
                const paymentsMade = paymentsSnapshot.docs.map(doc => doc.data());
                
                let allUpcomingPayments: ScheduleItem[] = [];
                const timeZone = 'America/Santo_Domingo';
                
                for (const requestDoc of requestsSnapshot.docs) {
                    const request = requestDoc.data();
                    const requestId = requestDoc.id;
                    
                    const equipmentName = request.itemType === 'phone' ? 'Teléfono' : request.itemType === 'tablet' ? 'Tablet' : request.itemType || 'Equipo';
                    
                    const paymentsForThisRequest = paymentsMade.filter(p => p.requestId === requestId).length;
                    
                    const startDate = toZonedTime((request.createdAt as Timestamp).toDate(), timeZone);

                    for (let i = 0; i < request.installments; i++) {
                         const installmentNumber = i + 1;
                         const paymentsMadeForInstallments = paymentsMade.filter(p => p.requestId === requestId && p.type !== 'Inicial').length;
                         const isPaid = i < paymentsMadeForInstallments;

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

                allUpcomingPayments.sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
                const upcomingForDisplay = allUpcomingPayments.slice(0, 10);
                setSchedule(upcomingForDisplay);

                const nextPayment = allUpcomingPayments[0];
                let periodStartDate: string | null = null;
                if (nextPayment) {
                    const dueDate = toZonedTime(parseISO(nextPayment.paymentDate), timeZone);
                    periodStartDate = format(add(dueDate, { days: -15 }), 'yyyy-MM-dd');
                }
                
                onScheduleCalculated({
                    nextPaymentAmount: nextPayment?.amount || 0,
                    nextPaymentDate: nextPayment?.paymentDate || null,
                    periodStartDate: periodStartDate
                });

            } catch (error) {
                console.error("Error calculating payment schedule: ", error);
                 onScheduleCalculated({ nextPaymentAmount: 0, nextPaymentDate: null, periodStartDate: null });
            } finally {
                setLoading(false);
            }
        };

        calculateSchedule();
    }, [userId, onScheduleCalculated]);
    
    // Desktop View
    const DesktopView = () => (
         <Card className="flex-col h-full hidden sm:flex">
            <CardHeader className="px-7">
                <CardTitle>Próximos Pagos</CardTitle>
                <CardDescription>
                    Tu calendario de pagos pendientes.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 sm:p-6 sm:pt-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="hidden sm:table-cell">Equipo</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             Array.from({ length: 3 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : schedule.length > 0 ? (
                            schedule.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium hidden sm:table-cell">{item.equipmentName}</TableCell>
                                    <TableCell>{format(parseISO(item.paymentDate), "dd 'de' MMMM", { locale: es })}</TableCell>
                                    <TableCell className="text-right font-semibold">RD$ {item.amount.toFixed(2)}</TableCell>
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

    // Mobile View
    const MobileView = () => (
        <div className="sm:hidden">
            {loading ? (
                Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-8 w-8 rounded-full mt-1" />
                            <Skeleton className="h-12 w-0.5 mt-1" />
                        </div>
                        <div className="flex-1 space-y-2 pb-8 pt-1">
                             <Skeleton className="h-20 w-full rounded-lg" />
                        </div>
                    </div>
                ))
            ) : schedule.length > 0 ? (
                 <div className="space-y-0">
                    {schedule.map((item, index) => {
                        const date = parseISO(item.paymentDate);
                        const month = format(date, 'MMM', { locale: es }).toUpperCase();
                        const day = format(date, 'dd');
                        const isLast = index === schedule.length - 1;

                        return (
                            <div key={index} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <p className="text-xs font-semibold text-muted-foreground">{month}</p>
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                                        {day}
                                    </div>
                                    {!isLast && <div className="w-0.5 flex-1 bg-border my-1" />}
                                </div>
                                <div className={cn("flex-1", !isLast && "pb-8")}>
                                     <Card className="mt-1">
                                         <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold">{item.equipmentName}</p>
                                                <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                                                    <DollarSign className="h-4 w-4" />
                                                    RD$ {item.amount.toFixed(2)}
                                                </p>
                                            </div>
                                            <PaymentInstructionsDialog>
                                                <Button size="sm">Pagar</Button>
                                            </PaymentInstructionsDialog>
                                         </CardContent>
                                     </Card>
                                </div>
                            </div>
                        );
                    })}
                 </div>
            ) : (
                <Alert className="border-none">
                    <CalendarClock className="h-4 w-4" />
                    <AlertTitle>¡Todo al día!</AlertTitle>
                    <AlertDescription>
                        No tienes pagos pendientes en tu calendario.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );

    return (
        <>
            <DesktopView />
            <MobileView />
        </>
    );
}
