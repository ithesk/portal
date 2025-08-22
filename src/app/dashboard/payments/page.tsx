
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
import { collection, getDocs, query, orderBy, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

interface Payment {
  id: string;
  date: string;
  amount: string;
  method: string;
  status: string;
  equipment: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const paymentsRef = collection(db, "payments");
        const q = query(paymentsRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const paymentsData = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as Payment));
        setPayments(paymentsData);
      } catch (error) {
        console.error("Error fetching payments: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Pagos</CardTitle>
        <CardDescription>
          Un registro detallado de todos sus pagos realizados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                ID Pago
              </TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="hidden sm:table-cell font-medium">
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="hidden sm:table-cell font-medium">
                    {payment.id}
                  </TableCell>
                  <TableCell className="font-medium">{payment.equipment}</TableCell>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        payment.status === "Completado" ? "outline" : "secondary"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {payment.date}
                  </TableCell>
                  <TableCell className="text-right">{payment.amount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
