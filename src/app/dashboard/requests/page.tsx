
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
import { collection, getDocs, query, where, orderBy, doc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText } from "lucide-react";


interface Request extends DocumentData {
  id: string;
  type: string;
  date: string;
  status: string;
  financingAmount: number;
}

export default function ClientRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, userLoading] = useAuthState(auth);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRequests = async () => {
      if (userLoading || !user) {
        if (!userLoading) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // First get the user's cedula from the 'users' collection
        const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
        if (userDoc.empty) {
            setLoading(false);
            return;
        }
        const cedula = userDoc.docs[0].data().cedula;

        // Then query requests with that cedula
        const requestsRef = collection(db, "requests");
        const q = query(requestsRef, where("cedula", "==", cedula), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const requestsData = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as Request));
        setRequests(requestsData);
      } catch (error) {
        console.error("Error fetching requests: ", error);
        toast({
            variant: "destructive",
            title: "Error al cargar solicitudes",
            description: "Hubo un problema al cargar tus solicitudes."
        })
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user, userLoading, toast]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Solicitudes</CardTitle>
        <CardDescription>
          Revisa el historial y estado de tus solicitudes de financiamiento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
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
      </CardContent>
    </Card>
  );
}
