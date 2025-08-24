
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    DollarSign,
    User,
    Wrench,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, getDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';

interface Client {
    id: string;
    name: string;
    cedula: string;
}

interface Equipment {
    id: string;
    name: string;
    userId: string;
    requestId?: string; // Add requestId to the interface
}

function NewPaymentForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [clients, setClients] = useState<Client[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [filteredEquipments, setFilteredEquipments] = useState<Equipment[]>([]);

    const [selectedClient, setSelectedClient] = useState("");
    const [selectedEquipment, setSelectedEquipment] = useState("");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("");
    const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setDataLoading(true);
            try {
                // Fetch Clients
                const usersSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "Cliente")));
                const clientsData = usersSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, cedula: doc.data().cedula })) as Client[];
                setClients(clientsData);

                // Fetch Equipment
                const equipmentSnapshot = await getDocs(collection(db, "equipment"));
                const equipmentsData = equipmentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
                setEquipments(equipmentsData);

                // Pre-fill from URL params
                const equipmentId = searchParams.get('equipmentId');
                const userId = searchParams.get('userId');

                if (userId) {
                    setSelectedClient(userId);
                    const clientEquipments = equipmentsData.filter(eq => eq.userId === userId);
                    setFilteredEquipments(clientEquipments);
                }

                if (equipmentId) {
                    setSelectedEquipment(equipmentId);
                }

            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de clientes y equipos." });
            } finally {
                setDataLoading(false);
            }
        };
        fetchData();
    }, [searchParams, toast]);

    useEffect(() => {
        if (selectedClient) {
            const clientEquipments = equipments.filter(eq => eq.userId === selectedClient);
            setFilteredEquipments(clientEquipments);
            // Reset equipment selection if client changes
            setSelectedEquipment("");
        } else {
            setFilteredEquipments([]);
        }
    }, [selectedClient, equipments]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient || !selectedEquipment || !amount || !method || !paymentDate) {
            toast({ variant: "destructive", title: "Campos Incompletos", description: "Por favor, completa todos los campos." });
            return;
        }
        setLoading(true);
        try {
            const batch = writeBatch(db);
            
            // 1. Create payment document
            const clientName = clients.find(c => c.id === selectedClient)?.name;
            const equipmentData = equipments.find(eq => eq.id === selectedEquipment);

            const newPaymentRef = doc(collection(db, "payments"));
            batch.set(newPaymentRef, {
                userId: selectedClient,
                equipmentId: selectedEquipment,
                client: clientName,
                equipment: equipmentData?.name,
                amount: parseFloat(amount),
                method,
                date: paymentDate,
                status: "Completado",
                createdAt: serverTimestamp(),
                requestId: equipmentData?.requestId // Store requestId on payment for easier querying
            });

            // 2. Calculate and update progress
            if (equipmentData?.requestId) {
                const requestRef = doc(db, "requests", equipmentData.requestId);
                const requestSnap = await getDoc(requestRef);

                if (requestSnap.exists()) {
                    const requestData = requestSnap.data();
                    const totalInstallments = requestData.installments;

                    // Query payments for this specific request
                    const paymentsQuery = query(collection(db, "payments"), where("requestId", "==", equipmentData.requestId));
                    const paymentsSnapshot = await getDocs(paymentsQuery);
                    
                    // We add +1 to include the payment we are currently processing
                    const paymentsMade = paymentsSnapshot.size + 1;
                    
                    const progress = Math.round((paymentsMade / totalInstallments) * 100);

                    const equipmentRef = doc(db, "equipment", selectedEquipment);
                    batch.update(equipmentRef, { progress: progress });
                }
            }
            
            // 3. Commit batch
            await batch.commit();

            toast({ title: "Pago Registrado", description: "El pago ha sido registrado y el progreso del equipo actualizado." });
            router.push("/internal/payments");

        } catch (error: any) {
            console.error("Error creating payment:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el pago." });
        } finally {
            setLoading(false);
        }
    };

    if (dataLoading) {
        return (
             <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-64 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
             </Card>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/internal/payments">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Volver</span>
                    </Link>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Registrar Nuevo Pago
                </h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Pago</CardTitle>
                    <CardDescription>
                        Ingresa la información del pago recibido.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="client"><User className="inline-block mr-2" />Cliente</Label>
                        <Select onValueChange={setSelectedClient} value={selectedClient} required>
                            <SelectTrigger id="client">
                                <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.cedula})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="equipment"><Wrench className="inline-block mr-2" />Equipo Financiado</Label>
                        <Select onValueChange={setSelectedEquipment} value={selectedEquipment} required disabled={!selectedClient}>
                            <SelectTrigger id="equipment">
                                <SelectValue placeholder="Selecciona un equipo" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredEquipments.map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.name} ({eq.id.substring(0,4)}...)</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                         <Label htmlFor="amount"><DollarSign className="inline-block mr-2" />Monto Recibido (RD$)</Label>
                         <Input id="amount" type="number" placeholder="1500.00" value={amount} onChange={e => setAmount(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label htmlFor="method">Método de Pago</Label>
                             <Select onValueChange={setMethod} value={method} required>
                                <SelectTrigger id="method">
                                    <SelectValue placeholder="Selecciona..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                                    <SelectItem value="Tarjeta">Tarjeta de Crédito/Débito</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payment-date">Fecha de Pago</Label>
                            <Input id="payment-date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                        </div>
                    </div>
                </CardContent>
                <CardContent>
                     <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Pago
                    </Button>
                </CardContent>
            </Card>
        </form>
    )
}

export default function NewPaymentPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <NewPaymentForm />
        </Suspense>
    );
}

    