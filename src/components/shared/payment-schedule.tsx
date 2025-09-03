
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import { add, format, isPast, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CalendarClock, CalendarDays, CheckCircle, DollarSign, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentInstructionsDialog } from './payment-instructions-dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

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
    status: 'Pendiente' | 'Pagado' | 'Atrasado';
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
                
                let allPayments: ScheduleItem[] = [];
                const timeZone = 'America/Santo_Domingo';
                const today = new Date();
                
                for (const requestDoc of requestsSnapshot.docs) {
                    const request = requestDoc.data();
                    const requestId = requestDoc.id;
                    
                    const equipmentName = request.itemType === 'phone' ? 'Teléfono' : request.itemType === 'tablet' ? 'Tablet' : request.itemType || 'Equipo';
                    
                    const paymentsForThisRequest = paymentsMade.filter(p => p.requestId === requestId).length;
                    
                    const startDate = toZonedTime((request.createdAt as Timestamp).toDate(), timeZone);

                    for (let i = 0; i < request.installments; i++) {
                         const installmentNumber = i + 1;
                         const isPaid = i < paymentsForThisRequest;
                         const paymentDate = add(startDate, { days: (installmentNumber) * 15 });
                         
                         let status: ScheduleItem['status'] = 'Pendiente';
                         if (isPaid) {
                             status = 'Pagado';
                         } else if (isPast(paymentDate) && !isPaid) {
                             status = 'Atrasado';
                         }

                         allPayments.push({
                            installment: installmentNumber,
                            paymentDate: format(paymentDate, 'yyyy-MM-dd'),
                            amount: request.biweeklyPayment,
                            status: status,
                            equipmentName: `${equipmentName} (${requestId.substring(0,4)})`
                        });
                    }
                }

                allPayments.sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
                
                // Filter to show upcoming and recently overdue/paid items
                const upcomingForDisplay = allPayments.filter(p => {
                    const paymentDate = parseISO(p.paymentDate);
                    const daysDifference = (paymentDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
                    // Show payments from last 30 days and all future payments
                    return daysDifference > -30;
                }).slice(0, 10);
                
                setSchedule(upcomingForDisplay);

                const nextPayment = allPayments.find(p => p.status === 'Pendiente' || p.status === 'Atrasado');
                let periodStartDate: string | null = null;
                if (nextPayment) {
                    const dueDate = toZonedTime(parseISO(nextPayment.paymentDate), timeZone);
                    periodStartDate = format(add(dueDate, { days: -15 }), 'yyyy-MM-dd');
                }
                
                onScheduleCalculated({
                    nextPaymentAmount: nextPayment?.amount || 0,
                    nextPaymentDate: nextPayment?.paymentDate || null,
                    periodStartDate: periodStartDate,
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
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             Array.from({ length: 3 }).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                     <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : schedule.filter(p => p.status !== 'Pagado').length > 0 ? (
                            schedule.filter(p => p.status !== 'Pagado').map((item, index) => (
                                <TableRow key={index} className={item.status === 'Atrasado' ? 'bg-destructive/5' : ''}>
                                    <TableCell className="font-medium hidden sm:table-cell">{item.equipmentName}</TableCell>
                                    <TableCell>{format(parseISO(item.paymentDate), "dd 'de' MMMM", { locale: es })}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === 'Atrasado' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                                    </TableCell>
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
                                    <div className={cn("flex items-center justify-center h-8 w-8 rounded-full text-primary-foreground font-bold text-sm",
                                        item.status === 'Pendiente' && 'bg-primary',
                                        item.status === 'Atrasado' && 'bg-destructive',
                                        item.status === 'Pagado' && 'bg-green-600',
                                    )}>
                                        {item.status === 'Pagado' ? <CheckCircle className="h-5 w-5"/> : day}
                                    </div>
                                    {!isLast && <div className="w-0.5 flex-1 bg-border my-1" />}
                                </div>
                                <div className={cn("flex-1", !isLast && "pb-8")}>
                                     <Card className={cn("mt-1",
                                         item.status === 'Atrasado' && 'border-destructive/50 bg-destructive/5',
                                         item.status === 'Pagado' && 'border-green-600/50 bg-green-500/5'
                                     )}>
                                         <CardContent className="p-4 flex flex-col gap-2">
                                            <div className="flex items-start justify-between">
                                                <p className="font-semibold">{item.equipmentName}</p>
                                                <Badge variant={
                                                    item.status === 'Atrasado' ? 'destructive' :
                                                    item.status === 'Pagado' ? 'default' : 'secondary'
                                                } className={cn(item.status === 'Pagado' && 'bg-green-600 hover:bg-green-700')}>
                                                    {item.status}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                                                <DollarSign className="h-4 w-4" />
                                                RD$ {item.amount.toFixed(2)}
                                            </p>
                                             <div className="mt-2 text-right">
                                                {item.status !== 'Pagado' ? (
                                                    <PaymentInstructionsDialog>
                                                        <Button variant="link" size="sm" className="p-0 h-auto">Ver Opciones de Pago</Button>
                                                    </PaymentInstructionsDialog>
                                                ) : (
                                                    <p className="text-sm font-medium text-green-700">Completado</p>
                                                )}
                                             </div>
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
