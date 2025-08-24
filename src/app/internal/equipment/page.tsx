
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
import { PlusCircle, Search, MoreHorizontal, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface Equipment {
  id: string;
  name: string;
  client: string;
  status: string;
  userId: string;
}

export default function InternalEquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "equipment"));
        const equipmentData = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        } as Equipment));
        setEquipment(equipmentData);
      } catch (error) {
        console.error("Error fetching equipment: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, []);

  return (
     <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Equipos</CardTitle>
                <CardDescription>
                Consulta el inventario de equipos y su estado.
                </CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Equipo
            </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por ID, nombre, o cliente..." className="pl-8" />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Equipo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Cliente Asignado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              equipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id.substring(0,8)}...</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.client}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "Pagado" ? "default" 
                        : item.status === "Financiado" ? "outline"
                        : "secondary"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                   <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button
                                aria-haspopup="true"
                                size="icon"
                                variant="ghost"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link href={`/internal/payments?equipmentId=${item.id}`}>
                                    <DollarSign className="mr-2 h-4 w-4" /> Ver Pagos
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href={`/internal/payments/new?equipmentId=${item.id}&userId=${item.userId}`}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Registrar Pago
                                </Link>
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
