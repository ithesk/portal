
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { PlusCircle, Filter } from "lucide-react";
import { collection, getDocs, query, orderBy, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  date: string;
  amount: string;
  method: string;
  status: string;
  equipment: string;
  client: string;
}

export default function InternalPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const paymentsRef = collection(db, "payments");
      const q = query(paymentsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const paymentsData = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
      } as Payment));
      setPayments(paymentsData);
    } catch (error) {
      console.error("Error fetching payments: ", error);
      toast({
        variant: "destructive",
        title: "Error al cargar pagos",
        description: "Hubo un problema al cargar los datos de pagos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Pagos</CardTitle>
                <CardDescription>
                Historial de todos los pagos registrados en el sistema.
                </CardDescription>
            </div>
             <Button asChild>
              <Link href="/internal/payments/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Pago
              </Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : payments.length > 0 ? (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                   <TableCell>{payment.date}</TableCell>
                   <TableCell className="font-medium">{payment.client}</TableCell>
                   <TableCell>{payment.equipment}</TableCell>
                   <TableCell>{payment.method}</TableCell>
                   <TableCell>
                    <Badge
                      variant={
                        payment.status === "Completado" ? "default" : "secondary"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">RD$ {payment.amount}</TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        No hay pagos registrados.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
