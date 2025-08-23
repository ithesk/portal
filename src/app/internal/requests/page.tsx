
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
import { collection, getDocs, query, orderBy, doc, updateDoc, writeBatch, where, serverTimestamp, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Request extends DocumentData {
  id: string;
  client: string;
  type: string;
  date: string;
  status: string;
  cedula: string;
  itemType: string;
  imei: string;
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
      const q = query(requestsRef, orderBy("createdAt", "desc"));
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

  const handleUpdateRequestStatus = async (request: Request, status: "Aprobado" | "Rechazado") => {
    setUpdatingId(request.id);
    try {
      const batch = writeBatch(db);
      const requestDocRef = doc(db, "requests", request.id);

      // If approved, create the equipment record
      if (status === "Aprobado") {
        // 1. Find user by cedula to get their ID, if they exist
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("cedula", "==", request.cedula));
        const userSnapshot = await getDocs(userQuery);

        let userId = null;
        let userName = request.client; // Use name from request as fallback
        
        const equipmentData: any = {
            cedula: request.cedula, // Store cedula for future linking
            name: request.itemType === 'phone' ? 'Teléfono' : 'Tablet',
            status: "Financiado",
            progress: 0,
            imageUrl: "https://placehold.co/600x400.png",
            aiHint: request.itemType,
            details: `Financiamiento aprobado el ${new Date().toLocaleDateString()}. IMEI: ${request.imei || 'N/A'}`,
            client: userName,
            createdAt: serverTimestamp(),
            requestId: request.id,
        };

        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          userId = userDoc.id;
          userName = userDoc.data().name;
          equipmentData.userId = userId;
          equipmentData.client = userName;
        } else {
            toast({
                title: "Cliente no registrado",
                description: "Se creará el equipo sin vincular. Se asociará cuando el cliente se registre.",
            });
        }
        
        // 2. Create new equipment document
        const newEquipmentRef = doc(collection(db, "equipment"));
        batch.set(newEquipmentRef, equipmentData);
      }

      batch.update(requestDocRef, { status });
      await batch.commit();

      toast({
        title: "Solicitud Actualizada",
        description: `La solicitud ha sido marcada como ${status.toLowerCase()}.`,
      });
      fetchRequests(); // Refetch data to update the UI
    } catch (error: any) {
      console.error("Error updating request status: ", error);
       toast({
          variant: "destructive",
          title: "Error al actualizar",
          description: error.message || "No se pudo actualizar el estado de la solicitud."
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
                          onClick={() => handleUpdateRequestStatus(req, "Aprobado")}
                          disabled={updatingId === req.id}
                        >
                          {updatingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleUpdateRequestStatus(req, "Rechazado")}
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
