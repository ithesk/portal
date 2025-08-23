
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
import { Button } from "@/components/ui/button";
import { Check, X, Filter, PlusCircle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { collection, getDocs, query, orderBy, doc, updateDoc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Request {
  id: string;
  client: string;
  type: string;
  date: string;
  status: string;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const requestsRef = collection(db, "requests");
      const q = query(requestsRef, orderBy("date", "desc"));
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
          description: "Hubo un problema al cargar los datos."
      })
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateRequestStatus = async (id: string, status: "Aprobado" | "Rechazado") => {
    setUpdatingId(id);
    try {
      const requestDocRef = doc(db, "requests", id);
      await updateDoc(requestDocRef, { status });
      toast({
        title: "Solicitud Actualizada",
        description: `La solicitud ha sido marcada como ${status.toLowerCase()}.`,
      });
      fetchRequests(); // Refetch data to update the UI
    } catch (error) {
      console.error("Error updating request status: ", error);
       toast({
          variant: "destructive",
          title: "Error al actualizar",
          description: "No se pudo actualizar el estado de la solicitud."
      })
    } finally {
      setUpdatingId(null);
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Solicitudes</CardTitle>
            <CardDescription>
              Revisa y gestiona las solicitudes de los clientes.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtrar por Estado
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Todas</DropdownMenuItem>
                <DropdownMenuItem>Pendiente de Aprobación</DropdownMenuItem>
                <DropdownMenuItem>En Revisión</DropdownMenuItem>
                <DropdownMenuItem>Aprobado</DropdownMenuItem>
                <DropdownMenuItem>Rechazado</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild>
              <Link href="/internal/requests/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Solicitud
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Solicitud</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo de Solicitud</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.id.substring(0, 8)}...</TableCell>
                  <TableCell>{req.client}</TableCell>
                  <TableCell>{req.type}</TableCell>
                  <TableCell className="hidden md:table-cell">{req.date}</TableCell>
                  <TableCell>
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
                  <TableCell className="text-right">
                    {req.status === "Pendiente de Aprobación" && (
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleUpdateRequestStatus(req.id, "Aprobado")}
                          disabled={updatingId === req.id}
                        >
                          {updatingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleUpdateRequestStatus(req.id, "Rechazado")}
                          disabled={updatingId === req.id}
                        >
                           {updatingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
