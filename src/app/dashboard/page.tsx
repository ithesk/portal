
"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, where, getDocs, orderBy, limit, DocumentData, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { PaymentSchedule, ScheduleInfo } from "@/components/shared/payment-schedule";
import { PaymentInstructionsDialog } from "@/components/shared/payment-instructions-dialog";
import { fetchPaymentProgress } from "@/ai/flows/fetch-payment-progress-flow";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


interface Activity {
    id: string;
    description: string;
    type: "Pago" | "Solicitud";
    status: string;
    date: string;
    amount: string | null;
}

interface UserProfile {
    name: string;
    cedula: string;
}

interface PaymentProgress {
    installmentsPaid: number;
    totalInstallments: number;
}


export default function Dashboard() {
  const [user, userLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [equipmentCount, setEquipmentCount] = useState(0);
  const [lastPayment, setLastPayment] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [paymentProgress, setPaymentProgress] = useState<PaymentProgress>({
      installmentsPaid: 0,
      totalInstallments: 0,
  });
  const [activeMobileTab, setActiveMobileTab] = useState<'activity' | 'payments'>('activity');


  useEffect(() => {
    const fetchData = async () => {
      if (userLoading || !user) {
        if (!userLoading) setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Fetch user profile to get cedula
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            setUserProfile(userSnap.data() as UserProfile);
        }


        // Fetch equipment count for active financings
        const equipmentQuery = query(collection(db, "equipment"), where("userId", "==", user.uid), where("status", "==", "Financiado"));
        const equipmentSnapshot = await getDocs(equipmentQuery);
        setEquipmentCount(equipmentSnapshot.size);

        // Fetch last payment
        const paymentsQuery = query(collection(db, "payments"), where("userId", "==", user.uid), orderBy("date", "desc"), limit(1));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        if (!paymentsSnapshot.empty) {
          const paymentData = paymentsSnapshot.docs[0].data();
          setLastPayment(paymentData.amount ? `RD$ ${parseFloat(paymentData.amount).toFixed(2)}` : null);
        }

        // Fetch recent activity from ALL requests for the activity feed
        const allRequestsQuery = query(collection(db, "requests"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        const allRequestsSnapshot = await getDocs(allRequestsQuery);
        
        const requestsData: Activity[] = allRequestsSnapshot.docs.map(doc => {
            const data = doc.data();
            const dateValue = data.createdAt?.toDate ? data.createdAt.toDate() : parseISO(data.createdAt);
            
            return {
                id: doc.id,
                description: data.type || "Solicitud de Financiamiento",
                type: "Solicitud",
                status: data.status,
                date: format(dateValue, 'yyyy-MM-dd'),
                amount: data.financingAmount ? `RD$ ${data.financingAmount.toFixed(2)}` : null,
            };
        }).slice(0,3);


        // Fetch recent activity from payments
        const paymentsActivityQuery = query(collection(db, "payments"), where("userId", "==", user.uid), orderBy("date", "desc"));
        const paymentsActivitySnapshot = await getDocs(paymentsActivityQuery);
        
        const paymentsData: Activity[] = paymentsActivitySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                description: `Pago para ${data.equipment}`,
                type: "Pago",
                status: data.status,
                date: data.date,
                amount: data.amount ? `RD$ ${parseFloat(data.amount).toFixed(2)}` : null,
            };
        }).slice(0,3);

        
        // Combine, sort, and slice activity
        const combinedActivity = [...requestsData, ...paymentsData]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
        
        setRecentActivity(combinedActivity);

        // Fetch payment progress from server flow
        const progressData = await fetchPaymentProgress({ userId: user.uid });
        setPaymentProgress(progressData);


      } catch (error) {
        console.error("Error fetching dashboard data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userLoading]);

  const progressPercentage = paymentProgress.totalInstallments > 0
    ? (paymentProgress.installmentsPaid / paymentProgress.totalInstallments) * 100
    : 0;

  const getTimeBarProgress = () => {
    if (!scheduleInfo || !scheduleInfo.nextPaymentDate || !scheduleInfo.periodStartDate) {
        return 0;
    }
    const today = new Date();
    const startDate = parseISO(scheduleInfo.periodStartDate);
    const dueDate = parseISO(scheduleInfo.nextPaymentDate);
    
    const totalDaysInPeriod = differenceInDays(dueDate, startDate);
    const daysLeft = differenceInDays(dueDate, today);

    if (totalDaysInPeriod <= 0 || daysLeft < 0) return 100; // Period is over or payment is past due
    if (daysLeft > totalDaysInPeriod) return 0; // Payment is far in the future
    
    const daysPassed = totalDaysInPeriod - daysLeft;
    const progress = (daysPassed / totalDaysInPeriod) * 100;

    return Math.max(0, Math.min(100, progress));
  }


  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
    {/* Mobile View */}
    <div className="sm:hidden">
        <div className="mb-6">
            <p className="text-muted-foreground">Buenos días,</p>
            <h1 className="text-2xl font-bold">{userProfile?.name || "Cliente"}</h1>
        </div>

        <PaymentInstructionsDialog referenceCode={userProfile?.cedula}>
            <Card className="cursor-pointer bg-primary text-primary-foreground mb-6 shadow-lg">
                <CardHeader>
                    <CardDescription className="text-primary-foreground/80">Próximo Pago</CardDescription>
                     {scheduleInfo === null ? (
                        <Skeleton className="h-10 w-3/4 bg-white/20" />
                    ) : (
                        <CardTitle className="text-4xl">
                             {scheduleInfo.nextPaymentAmount > 0 ? `RD$ ${scheduleInfo.nextPaymentAmount.toFixed(2)}` : 'N/A'}
                        </CardTitle>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center text-sm">
                         <p className="text-primary-foreground/90 font-medium">
                            {scheduleInfo?.nextPaymentDate ? `Vence el ${format(parseISO(scheduleInfo.nextPaymentDate), "dd 'de' MMMM", { locale: es })}` : 'No tienes pagos pendientes'}
                        </p>
                    </div>
                     {scheduleInfo?.nextPaymentDate && scheduleInfo?.periodStartDate && (
                         <div className="mt-2">
                            <Progress value={getTimeBarProgress()} className="h-1 bg-white/30 [&>div]:bg-white" />
                         </div>
                    )}
                </CardContent>
            </Card>
        </PaymentInstructionsDialog>

        <div className="mb-6">
            <div className="flex justify-between items-center mb-2 text-sm">
                <h3 className="font-semibold">Progreso de Pagos</h3>
                <p className="text-muted-foreground">{paymentProgress.installmentsPaid} de {paymentProgress.totalInstallments} cuotas</p>
            </div>
            <Progress value={progressPercentage} className="w-full h-3" />
        </div>
        
        <div className="mb-4">
            <div className="p-1 bg-muted rounded-full flex">
                 <Button 
                    onClick={() => setActiveMobileTab('activity')}
                    className={cn(
                        "flex-1 rounded-full h-10 transition-colors", 
                        activeMobileTab === 'activity' ? 'bg-background text-foreground shadow-sm' : 'bg-transparent text-muted-foreground'
                    )}
                >
                    Actividad Reciente
                </Button>
                <Button 
                    onClick={() => setActiveMobileTab('payments')}
                    className={cn(
                        "flex-1 rounded-full h-10 transition-colors", 
                        activeMobileTab === 'payments' ? 'bg-background text-foreground shadow-sm' : 'bg-transparent text-muted-foreground'
                    )}
                >
                    Pagos Próximos
                </Button>
            </div>
        </div>

        <div>
            {activeMobileTab === 'activity' && (
                <div className="space-y-3 animate-in fade-in-20">
                    {recentActivity.length > 0 ? (
                        recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{activity.description}</p>
                                    <p className="text-xs text-muted-foreground">{activity.date} - {activity.status}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm">{activity.amount || '-'}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-6">No hay actividad reciente.</p>
                    )}
                </div>
            )}
            {activeMobileTab === 'payments' && user && (
                 <div className="animate-in fade-in-20">
                    <PaymentSchedule userId={user.uid} onScheduleCalculated={setScheduleInfo} />
                 </div>
            )}
        </div>
    </div>


    {/* Desktop View */}
    <div className="hidden sm:block">
        <h1 className="text-2xl font-bold mb-4">Resumen</h1>
        <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            <PaymentInstructionsDialog referenceCode={userProfile?.cedula}>
                <Card className="cursor-pointer hover:border-primary">
                <CardHeader className="pb-2">
                    <CardDescription>Próximo Pago</CardDescription>
                    {scheduleInfo === null ? (
                        <Skeleton className="h-10 w-3/4" />
                    ) : (
                        <CardTitle className="text-4xl">
                            {scheduleInfo.nextPaymentAmount > 0 ? `RD$ ${scheduleInfo.nextPaymentAmount.toFixed(2)}` : 'N/A'}
                        </CardTitle>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground">
                    {scheduleInfo?.nextPaymentDate ? `Vence el ${format(parseISO(scheduleInfo.nextPaymentDate), "dd 'de' MMMM", { locale: es })}` : 'No tienes pagos pendientes'}
                    </div>
                </CardContent>
                </Card>
            </PaymentInstructionsDialog>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Progreso de Pagos</CardDescription>
                    <CardTitle className="text-2xl">
                        {paymentProgress.installmentsPaid} de {paymentProgress.totalInstallments}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={progressPercentage} className="w-full h-3 mb-2" />
                    <div className="text-xs text-muted-foreground">
                    {paymentProgress.totalInstallments > 0 ? 'Cuotas pagadas de financiamientos activos' : 'Sin cuotas pendientes'}
                    </div>
                </CardContent>
            </Card>
            <Card>
            <CardHeader className="pb-2">
                <CardDescription>Equipos Financiados</CardDescription>
                <CardTitle className="text-4xl">{equipmentCount}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-muted-foreground">
                {equipmentCount > 0 ? `${equipmentCount} equipo(s) activo(s)` : "Sin equipos activos"}
                </div>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="pb-2">
                <CardDescription>Último Pago</CardDescription>
                <CardTitle className="text-4xl">{lastPayment || 'N/A'}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-muted-foreground">
                Fecha del último pago recibido
                </div>
            </CardContent>
            </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex flex-col">
            <CardHeader className="px-7">
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>
                Un resumen de sus pagos y actividades recientes.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <div className="relative w-full overflow-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="hidden sm:table-cell">
                            Tipo
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                            Estado
                        </TableHead>
                        <TableHead className="hidden md:table-cell">Fecha</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentActivity.length > 0 ? (
                        recentActivity.map((activity) => (
                            <TableRow key={activity.id}>
                            <TableCell className="font-medium">{activity.description}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                                {activity.type}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                                <Badge variant={activity.status === "Aprobado" || activity.status === "Completado" ? "default" : "secondary"} className={activity.status === "Aprobado" || activity.status === "Completado" ? "bg-green-100 text-green-800" : ""}>
                                {activity.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                {activity.date}
                            </TableCell>
                            <TableCell className="text-right">
                                {activity.amount || "-"}
                            </TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                No hay actividad reciente.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
            </CardContent>
            </Card>
            {user && <PaymentSchedule userId={user.uid} onScheduleCalculated={setScheduleInfo} />}
        </div>
        </div>
    </div>
    </>
  );
}


function DashboardSkeleton() {
    return (
        <div>
        {/* Mobile Skeleton */}
        <div className="sm:hidden">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-32 w-full rounded-lg mb-6" />
             <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
            </div>
             <div>
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="space-y-3">
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                </div>
            </div>
        </div>

        {/* Desktop Skeleton */}
        <div className="hidden sm:block">
            <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-10 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-3 w-1/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="px-7">
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                        <TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableHead>
                                        <TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableHead>
                                        <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableHead>
                                        <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                                            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-5 w-full" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="px-7">
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead><Skeleton className="h-5 w-12" /></TableHead>
                                        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                        <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                        <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
        </div>
    );
}
