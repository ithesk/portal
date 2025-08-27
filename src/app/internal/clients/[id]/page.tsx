
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
    Briefcase,
    Heart,
    Globe,
    Cake,
    CalendarOff,
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
import { Separator } from "@/components/ui/separator";


interface ClientData extends DocumentData {
    id: string;
    name: string;
    email: string;
    cedula: string;
    phone: string;
    status: string;
    since: string;
    // New fields from API
    birthPlace?: string;
    nationality?: string;
    gender?: string;
    civilStatus?: string;
    occupation?: string;
    idExpirationDate?: string;
    birthDate?: string;
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
        <div className="max-w-5xl mx-auto">
             <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/internal/clients">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Volver a Clientes</span>
                    </Link>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    {client.name}
                </h1>
                 <Badge className="ml-auto">{client.status}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                 <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User /> Perfil del Cliente</CardTitle>
                        <CardDescription>Información extraída del documento de identidad.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between"><span>Cédula:</span><span className="font-medium">{client.cedula}</span></div>
                        <Separator />
                        <div className="flex justify-between"><span>Email:</span><span className="font-medium truncate">{client.email || 'N/A'}</span></div>
                        <div className="flex justify-between"><span>Teléfono:</span><span className="font-medium">{client.phone || 'N/A'}</span></div>
                        <Separator />
                        <div className="flex justify-between"><span>Fecha de Nac.:</span><span className="font-medium">{client.birthDate || 'N/A'}</span></div>
                        <div className="flex justify-between"><span>Lugar de Nac.:</span><span className="font-medium">{client.birthPlace || 'N/A'}</span></div>
                        <div className="flex justify-between"><span>Nacionalidad:</span><span className="font-medium">{client.nationality || 'N/A'}</span></div>
                        <div className="flex justify-between"><span>Género:</span><span className="font-medium">{client.gender || 'N/A'}</span></div>
                         <Separator />
                        <div className="flex justify-between"><span>Estado Civil:</span><span className="font-medium">{client.civilStatus || 'N/A'}</span></div>
                        <div className="flex justify-between"><span>Ocupación:</span><span className="font-medium">{client.occupation || 'N/A'}</span></div>
                        <Separator />
                        <div className="flex justify-between"><span>ID Expira:</span><span className="font-medium text-amber-600">{client.idExpirationDate || 'N/A'}</span></div>
                    </CardContent>
                </Card>
                <div className="md:col-span-2 grid gap-4">
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
        </div>
    );
}


function ClientDetailsSkeleton() {
    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
                 <Skeleton className="h-7 w-7 rounded-md" />
                 <Skeleton className="h-7 w-64" />
            </div>
             <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader><Skeleton className="h-7 w-32" /><Skeleton className="h-5 w-48 mt-2" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                         <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                    </CardContent>
                </Card>
                <div className="md:col-span-2 grid gap-4">
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
        </div>
    );
}
