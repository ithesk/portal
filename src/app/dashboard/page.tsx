
"use client";

import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, where, getDocs, orderBy, limit, DocumentData } from "firebase/firestore";
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
import { format } from 'date-fns';


interface Activity {
    id: string;
    description: string;
    type: "Pago" | "Solicitud";
    status: string;
    date: string;
    amount: string | null;
}

export default function Dashboard() {
  const [user, userLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(true);

  const [equipmentCount, setEquipmentCount] = useState(0);
  const [lastPayment, setLastPayment] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (userLoading || !user) {
        if (!userLoading) setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Fetch equipment count
        const equipmentQuery = query(collection(db, "equipment"), where("userId", "==", user.uid));
        const equipmentSnapshot = await getDocs(equipmentQuery);
        setEquipmentCount(equipmentSnapshot.size);

        // Fetch last payment
        const paymentsQuery = query(collection(db, "payments"), where("userId", "==", user.uid), orderBy("date", "desc"), limit(1));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        if (!paymentsSnapshot.empty) {
          setLastPayment(paymentsSnapshot.docs[0].data().amount);
        }

        // Fetch recent activity
        const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
        let cedula = '';
        if (!userDoc.empty) {
            cedula = userDoc.docs[0].data().cedula;
        }

        const requestsQuery = query(collection(db, "requests"), where("cedula", "==", cedula), orderBy("createdAt", "desc"), limit(3));
        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsData: Activity[] = requestsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                description: data.type || "Solicitud de Financiamiento",
                type: "Solicitud",
                status: data.status,
                date: format(data.createdAt.toDate(), 'yyyy-MM-dd'),
                amount: data.financingAmount ? `$${data.financingAmount.toFixed(2)}` : null,
            };
        });

        const paymentsActivityQuery = query(collection(db, "payments"), where("userId", "==", user.uid), orderBy("date", "desc"), limit(3));
        const paymentsActivitySnapshot = await getDocs(paymentsActivityQuery);
        const paymentsData: Activity[] = paymentsActivitySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                description: `Pago para ${data.equipment}`,
                type: "Pago",
                status: data.status,
                date: data.date,
                amount: data.amount,
            };
        });

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

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Actual</CardDescription>
            <CardTitle className="text-4xl">$0.00</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              -
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Próximo Pago</CardDescription>
            <CardTitle className="text-4xl">$0.00</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              -
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
              -
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Último Pago</CardDescription>
            <CardTitle className="text-4xl">{lastPayment || '$0.00'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              -
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader className="px-7">
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Un resumen de sus pagos y actividades recientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                        <Badge variant={activity.status === "Aprobado" || activity.status === "Completado" ? "outline" : "secondary"}>
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
          </CardContent>
        </Card>
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
            <div>
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
            </div>
        </div>
    );
}
