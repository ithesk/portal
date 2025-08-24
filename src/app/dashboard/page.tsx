
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
import { format, parseISO } from 'date-fns';
import { PaymentSchedule, ScheduleInfo } from "@/components/shared/payment-schedule";
import { PaymentInstructionsDialog } from "@/components/shared/payment-instructions-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface Activity {
    id: string;
    description: string;
    type: "Pago" | "Solicitud";
    status: string;
    date: string;
    amount: string | null;
}

interface UserProfile {
    cedula: string;
}

interface FinanceTotals {
    totalEquipmentValue: number;
    totalInitialPayment: number;
    totalInstallmentsPaid: number;
}


export default function Dashboard() {
  const [user, userLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [equipmentCount, setEquipmentCount] = useState(0);
  const [lastPayment, setLastPayment] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [financeTotals, setFinanceTotals] = useState<FinanceTotals>({
    totalEquipmentValue: 0,
    totalInitialPayment: 0,
    totalInstallmentsPaid: 0,
  });


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

        // Fetch APPROVED requests for finance totals
        const approvedRequestsQuery = query(collection(db, "requests"), where("userId", "==", user.uid), where("status", "==", "Aprobado"));
        const approvedRequestsSnapshot = await getDocs(approvedRequestsQuery);

        let equipmentValue = 0;
        let initialPayment = 0;
        
        approvedRequestsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if(data.itemValue) equipmentValue += data.itemValue;
            if(data.initialPayment) initialPayment += data.initialPayment;
        });

        // Fetch recent activity from payments and sum total paid for active financings
        const paymentsActivityQuery = query(collection(db, "payments"), where("userId", "==", user.uid), orderBy("date", "desc"));
        const paymentsActivitySnapshot = await getDocs(paymentsActivityQuery);
        
        let installmentsPaid = 0;
        const paymentsData: Activity[] = paymentsActivitySnapshot.docs.map(doc => {
            const data = doc.data();
            // Only add to installmentsPaid if the request was approved
             if (approvedRequestsSnapshot.docs.some(reqDoc => reqDoc.id === data.requestId)) {
                if(data.amount) installmentsPaid += parseFloat(data.amount);
            }
            return {
                id: doc.id,
                description: `Pago para ${data.equipment}`,
                type: "Pago",
                status: data.status,
                date: data.date,
                amount: data.amount ? `RD$ ${parseFloat(data.amount).toFixed(2)}` : null,
            };
        }).slice(0,3);

        setFinanceTotals({
            totalEquipmentValue: equipmentValue,
            totalInitialPayment: initialPayment,
            totalInstallmentsPaid: installmentsPaid,
        });
        
        // Combine, sort, and slice activity
        const combinedActivity = [...requestsData, ...paymentsData]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
        
        setRecentActivity(combinedActivity);

      } catch (error) {
        console.error("Error fetching dashboard data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userLoading]);

  const { totalEquipmentValue, totalInitialPayment, totalInstallmentsPaid } = financeTotals;
  const totalPaid = totalInitialPayment + totalInstallmentsPaid;
  const remainingBalance = totalEquipmentValue - totalPaid;
  
  const initialPaymentPercentage = totalEquipmentValue > 0 ? (totalInitialPayment / totalEquipmentValue) * 100 : 0;
  const installmentsPaidPercentage = totalEquipmentValue > 0 ? (totalInstallmentsPaid / totalEquipmentValue) * 100 : 0;


  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
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
                  {scheduleInfo?.nextPaymentDate ? `Vence el ${scheduleInfo.nextPaymentDate}` : 'No tienes pagos pendientes'}
                </div>
              </CardContent>
            </Card>
        </PaymentInstructionsDialog>
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>Resumen de Financiamiento Activo</CardDescription>
                <CardTitle className="text-2xl">
                    RD$ {totalPaid.toFixed(2)}
                    <span className="text-base font-normal text-muted-foreground"> / {totalEquipmentValue.toFixed(2)}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="w-full bg-secondary rounded-full h-3 flex overflow-hidden">
                                <div className="bg-blue-500 h-full" style={{ width: `${initialPaymentPercentage}%` }}></div>
                                <div className="bg-green-500 h-full" style={{ width: `${installmentsPaidPercentage}%` }}></div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="w-64">
                           <div className="space-y-2">
                                <p className="font-bold text-center">Desglose de Pagos</p>
                                <div className="flex justify-between text-sm">
                                    <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>Inicial:</span>
                                    <span>RD$ {totalInitialPayment.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                     <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>Cuotas Pagadas:</span>
                                    <span>RD$ {totalInstallmentsPaid.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t pt-2 mt-2">
                                    <span className="text-muted-foreground">Saldo Pendiente:</span>
                                    <span>RD$ {remainingBalance > 0 ? remainingBalance.toFixed(2) : '0.00'}</span>
                                </div>
                           </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
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
  );
}


function DashboardSkeleton() {
    return (
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
    );
}

    