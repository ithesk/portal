
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
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { format, parseISO } from "date-fns";

interface Request {
    id: string;
    type: string;
    date: string;
    status: string;
    financingAmount: number | null;
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, userLoading] = useAuthState(auth);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRequests = async () => {
      if (userLoading) {
        return;
      }
      
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const requestsRef = collection(db, "requests");
        const q = query(
            requestsRef, 
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        
        const requestsData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            
            let dateStr: string;
            if (data.createdAt && typeof data.createdAt.toDate === 'function') { 
                dateStr = format(data.createdAt.toDate(), "yyyy-MM-dd");
            } else if (data.createdAt && typeof data.createdAt === 'string') {
                 dateStr = format(parseISO(data.createdAt), "yyyy-MM-dd");
            } else if (data.date && typeof data.date === 'string') {
                dateStr = data.date;
            } else {
                dateStr = format(new Date(), "yyyy-MM-dd");
            }
            
            return {
                id: doc.id,
                type: data.type || "Solicitud de Financiamiento",
                status: data.status || "Desconocido",
                date: dateStr,
                financingAmount: data.financingAmount ?? null,
            };
        });

        setRequests(requestsData);

      } catch (error: any) {
        console.error("CRITICAL - Error al obtener solicitudes directamente desde el cliente:", error);
        toast({
            variant: "destructive",
            title: "Error al Cargar Solicitudes",
            description: `Hubo un problema de permisos o de consulta. Detalles: ${error.message}`,
        })
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user, userLoading, toast]);


  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Mis Solicitudes</CardTitle>
        <CardDescription>
          Revisa el historial y estado de tus solicitudes de financiamiento.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {/* Desktop View: Table */}
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto Financiado</TableHead>
              <TableHead className="text-right">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium"><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-32 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : requests.length > 0 ? (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.type}</TableCell>
                  <TableCell>{req.date}</TableCell>
                  <TableCell>RD$ {req.financingAmount?.toFixed(2) ?? 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        req.status === "Aprobado" ? "default"
                        : req.status === "Rechazado" ? "destructive"
                        : "secondary"
                      }
                    >
                      {req.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4}>
                         <Alert className="border-none">
                            <FileText className="h-4 w-4" />
                            <AlertTitle>No hay solicitudes</AlertTitle>
                            <AlertDescription>
                                No has realizado ninguna solicitud de financiamiento aún.
                            </AlertDescription>
                        </Alert>
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Mobile View: Cards */}
        <div className="grid gap-4 md:hidden">
            {loading ? (
                 Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index}>
                        <CardContent className="p-4 space-y-2">
                             <Skeleton className="h-6 w-2/3" />
                             <Skeleton className="h-4 w-1/2" />
                             <Skeleton className="h-4 w-1/3" />
                             <Skeleton className="h-6 w-1/4 mt-2" />
                        </CardContent>
                    </Card>
                 ))
            ) : requests.length > 0 ? (
                requests.map((req) => (
                    <Card key={req.id}>
                        <CardContent className="p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold">{req.type}</h3>
                                <Badge
                                    variant={
                                        req.status === "Aprobado" ? "default"
                                        : req.status === "Rechazado" ? "destructive"
                                        : "secondary"
                                    }
                                    >
                                    {req.status}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{req.date}</p>
                            <p className="text-sm font-medium">
                                Monto: RD$ {req.financingAmount?.toFixed(2) ?? 'N/A'}
                            </p>
                        </CardContent>
                    </Card>
                ))
            ) : (
                 <Alert className="border-none">
                    <FileText className="h-4 w-4" />
                    <AlertTitle>No hay solicitudes</AlertTitle>
                    <AlertDescription>
                        No has realizado ninguna solicitud de financiamiento aún.
                    </AlertDescription>
                </Alert>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
