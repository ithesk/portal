
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    User,
    FileText,
    Wrench,
    Mail,
    Phone,
    BadgePercent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { doc, getDoc, collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


interface ClientData extends DocumentData {
    id: string;
    name: string;
    email: string;
    cedula: string;
    phone: string;
    status: string;
    since: string;
}

interface RequestData extends DocumentData {
    id: string;
    date: string;
    type: string;
    status: string;
}

interface EquipmentData extends DocumentData {
    id: string;
    name: string;
    status: string;
    progress: number;
}


export default function ClientDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const { id: userId } = params;

    const [client, setClient] = useState<ClientData | null>(null);
    const [requests, setRequests] = useState<RequestData[]>([]);
    const [equipments, setEquipments] = useState<EquipmentData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchClientData = async () => {
            setLoading(true);
            try {
                // Fetch client details
                const clientRef = doc(db, "users", userId as string);
                const clientSnap = await getDoc(clientRef);

                if (clientSnap.exists()) {
                    setClient({ id: clientSnap.id, ...clientSnap.data() } as ClientData);
                } else {
                     // Handle not found
                }

                // Fetch client requests
                const requestsQuery = query(collection(db, "requests"), where("userId", "==", userId));
                const requestsSnapshot = await getDocs(requestsQuery);
                setRequests(requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RequestData)));

                 // Fetch client equipment
                const equipmentQuery = query(collection(db, "equipment"), where("userId", "==", userId));
                const equipmentSnapshot = await getDocs(equipmentQuery);
                setEquipments(equipmentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipmentData)));


            } catch (error) {
                console.error("Error fetching client details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClientData();
    }, [userId]);

    if (loading) {
        return <ClientDetailsSkeleton />;
    }

    if (!client) {
        return <p>No se encontró el cliente.</p>;
    }

    return (
        <div className="max-w-4xl mx-auto">
             <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/internal/clients">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Volver a Clientes</span>
                    </Link>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Detalles del Cliente
                </h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Información General</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{client.name}</div>
                        <p className="text-xs text-muted-foreground">Cédula: {client.cedula}</p>
                         <Badge className="mt-2">{client.status}</Badge>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Contacto</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-bold truncate">{client.email}</div>
                        <p className="text-xs text-muted-foreground">{client.phone}</p>
                    </CardContent>
                </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Actividad</CardTitle>
                        <BadgePercent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{requests.length} Solicitudes</div>
                        <p className="text-xs text-muted-foreground">{equipments.length} Equipos Financiados</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 mt-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Wrench /> Equipos del Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>Equipo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">% Pagado</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {equipments.length > 0 ? equipments.map(eq => (
                                    <TableRow key={eq.id}><TableCell>{eq.name}</TableCell><TableCell>{eq.status}</TableCell><TableCell className="text-right">{eq.progress}%</TableCell></TableRow>
                                )) : <TableRow><TableCell colSpan={3} className="text-center">No hay equipos.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileText /> Historial de Solicitudes</CardTitle>
                    </CardHeader>
                    <CardContent>
                          <Table>
                            <TableHeader>
                                <TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Estado</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.length > 0 ? requests.map(req => (
                                    <TableRow key={req.id}><TableCell>{req.date}</TableCell><TableCell>{req.type}</TableCell><TableCell className="text-right"><Badge variant={req.status === "Aprobado" ? "default" : "secondary"}>{req.status}</Badge></TableCell></TableRow>
                                )) : <TableRow><TableCell colSpan={3} className="text-center">No hay solicitudes.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


function ClientDetailsSkeleton() {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
                 <Skeleton className="h-7 w-7 rounded-md" />
                 <Skeleton className="h-7 w-64" />
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card><CardHeader><Skeleton className="h-5 w-20" /></CardHeader><CardContent><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-24 mt-1" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-20" /></CardHeader><CardContent><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-20 mt-1" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-20" /></CardHeader><CardContent><Skeleton className="h-6 w-36" /><Skeleton className="h-4 w-28 mt-1" /></CardContent></Card>
            </div>
             <div className="grid gap-4 mt-4 md:grid-cols-2">
                 <Card>
                    <CardHeader><Skeleton className="h-7 w-48" /></CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </CardContent>
                 </Card>
                  <Card>
                    <CardHeader><Skeleton className="h-7 w-48" /></CardHeader>
                    <CardContent className="space-y-2">
                         <Skeleton className="h-8 w-full" />
                         <Skeleton className="h-8 w-full" />
                    </CardContent>
                 </Card>
             </div>
        </div>
    );
}
