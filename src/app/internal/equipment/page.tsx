
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
import { PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

interface Equipment {
  id: string;
  name: string;
  client: string;
  status: string;
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
              <TableHead className="text-right">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              equipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.client}</TableCell>
                  <TableCell className="text-right">
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
