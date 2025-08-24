
"use client";

import { useState, useEffect } from "react";
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
import { Users, Wrench, DollarSign, Activity, PlusCircle, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RecentActivity {
    id: string;
    description: string;
    type: "Solicitud" | "Pago" | "Cliente";
    status: string;
    date: string;
    detail: string;
}

export default function InternalDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
      activeClients: 0,
      financedEquipment: 0,
      monthlyIncome: 0,
      pendingRequests: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch stats
        const usersQuery = query(collection(db, "users"), where("role", "==", "Cliente"), where("status", "==", "Activo"));
        const equipmentQuery = collection(db, "equipment");
        const requestsQuery = query(collection(db, "requests"), where("status", "==", "Pendiente de Aprobación"));
        
        const firstDayOfMonth = startOfMonth(new Date());
        const paymentsQuery = query(collection(db, "payments"), where("createdAt", ">=", Timestamp.fromDate(firstDayOfMonth)));

        const [usersSnapshot, equipmentSnapshot, requestsSnapshot, paymentsSnapshot] = await Promise.all([
            getDocs(usersQuery),
            getDocs(equipmentQuery),
            getDocs(requestsQuery),
            getDocs(paymentsSnapshot),
        ]);

        const monthlyIncome = paymentsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

        setStats({
            activeClients: usersSnapshot.size,
            financedEquipment: equipmentSnapshot.size,
            pendingRequests: requestsSnapshot.size,
            monthlyIncome: monthlyIncome,
        });

        // Fetch recent activity
        const recentRequestsQuery = query(collection(db, "requests"), orderBy("createdAt", "desc"), limit(5));
        const recentRequestsSnapshot = await getDocs(recentRequestsQuery);
        
        const activity: RecentActivity[] = recentRequestsSnapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp;
            return {
                id: doc.id,
                description: data.client,
                type: 'Solicitud',
                status: data.status,
                date: format(createdAt.toDate(), 'yyyy-MM-dd'),
                detail: `Monto: RD$ ${data.financingAmount?.toFixed(2) || 'N/A'}`
            }
        });

        setRecentActivity(activity);

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError("No se pudieron cargar los datos. Verifica los permisos de Firestore.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error de Conexión</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    )
  }

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clientes Activos</CardDescription>
            <CardTitle className="text-4xl">{stats.activeClients}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center">
              <Users className="mr-1 h-3 w-3" />
              Total de clientes con estado activo.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Equipos Financiados</CardDescription>
            <CardTitle className="text-4xl">{stats.financedEquipment}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center">
              <Wrench className="mr-1 h-3 w-3" />
              Total de equipos registrados.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingresos del Mes</CardDescription>
            <CardTitle className="text-4xl">RD$ {stats.monthlyIncome.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center">
                <DollarSign className="mr-1 h-3 w-3" />
                Suma de pagos en el mes actual.
            </div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardDescription>Solicitudes Pendientes</CardDescription>
            <CardTitle className="text-4xl">{stats.pendingRequests}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center">
                <FileText className="mr-1 h-3 w-3" />
                Listas para revisión y aprobación.
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader className="px-7">
             <div className="flex justify-between items-center">
              <div>
                <CardTitle>Actividad Reciente del Sistema</CardTitle>
                <CardDescription>
                  Un resumen de las últimas solicitudes creadas en la plataforma.
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/internal/requests/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nueva Solicitud
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Acción
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Estado
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="font-medium">{activity.description}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {activity.type}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={activity.status === "Aprobado" ? "default" : activity.status === "Rechazado" ? "destructive" : "secondary"}>
                          {activity.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {activity.date}
                      </TableCell>
                      <TableCell className="text-right">{activity.detail}</TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
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
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-10 w-1/2 mt-1" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-3 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader className="px-7">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
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
                            {Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
