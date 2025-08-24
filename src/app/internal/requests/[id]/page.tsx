
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft,
    User,
    FileText,
    Calculator,
    Smartphone,
    Badge,
    Calendar,
    Pen,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { doc, getDoc, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface RequestData extends DocumentData {
    id: string;
    client: string;
    cedula: string;
    date: string;
    type: string;
    status: string;
    itemValue: number;
    initialPayment: number;
    financingAmount: number;
    biweeklyPayment: number;
    installments: number;
    imei: string;
    signatureDataUrl: string;
}

export default function RequestDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const [request, setRequest] = useState<RequestData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchRequest = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, "requests", id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setRequest({ id: docSnap.id, ...docSnap.data() } as RequestData);
                } else {
                    console.log("No such document!");
                    // Handle not found, maybe redirect
                }
            } catch (error) {
                console.error("Error fetching request details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequest();
    }, [id]);

    if (loading) {
        return <RequestDetailsSkeleton />;
    }

    if (!request) {
        return <p>No se encontró la solicitud.</p>;
    }

    return (
        <div className="max-w-4xl mx-auto">
             <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/internal/requests">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Volver a Solicitudes</span>
                    </Link>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Detalles de la Solicitud
                </h1>
                <div className="flex items-center gap-x-2">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    <Badge variant={request.status === "Aprobado" ? "default" : request.status === "Rechazado" ? "destructive" : "secondary"}>
                      {request.status}
                    </Badge>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Cliente</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{request.client}</div>
                        <p className="text-xs text-muted-foreground">Cédula: {request.cedula}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Solicitud</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{request.type}</div>
                        <p className="text-xs text-muted-foreground">ID: {request.id.substring(0, 8)}...</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Fecha</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">
                            {format(parseISO(request.date), "dd 'de' MMMM, yyyy", { locale: es })}
                        </div>
                        <p className="text-xs text-muted-foreground">Fecha de creación de la solicitud</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 mt-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calculator /> Resumen Financiero</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between"><span>Precio del Equipo:</span><span className="font-medium">RD$ {request.itemValue.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Pago Inicial:</span><span className="font-medium">RD$ {request.initialPayment.toFixed(2)}</span></div>
                        <div className="flex justify-between font-semibold"><span>Monto a Financiar:</span><span className="font-medium">RD$ {request.financingAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Cuotas:</span><span className="font-medium">{request.installments} Quincenales</span></div>
                        <div className="flex justify-between font-semibold text-primary text-base"><span>Valor de Cuota:</span><span className="font-medium">RD$ {request.biweeklyPayment.toFixed(2)}</span></div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Smartphone /> Equipo y Firma</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="flex justify-between text-sm">
                            <span>IMEI del Equipo:</span>
                            <span className="font-mono font-medium bg-muted px-2 py-1 rounded">{request.imei}</span>
                        </div>
                        <div>
                             <Label className="text-sm">Firma del Cliente</Label>
                             <div className="mt-2 rounded-lg border bg-white p-2">
                                <Image
                                    src={request.signatureDataUrl}
                                    alt="Firma del cliente"
                                    width={300}
                                    height={150}
                                    className="mx-auto"
                                />
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


function RequestDetailsSkeleton() {
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
                    <CardContent className="space-y-4">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                    </CardContent>
                 </Card>
                  <Card>
                    <CardHeader><Skeleton className="h-7 w-48" /></CardHeader>
                    <CardContent className="space-y-4">
                         <Skeleton className="h-5 w-full" />
                         <Skeleton className="h-32 w-full" />
                    </CardContent>
                 </Card>
             </div>
        </div>
    );
}

