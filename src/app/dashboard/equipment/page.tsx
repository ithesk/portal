
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { collection, getDocs, query, where, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wrench } from "lucide-react";


interface Equipment {
  id: string;
  name: string;
  status: string;
  progress: number;
  imageUrl: string;
  aiHint: string;
  details: string;
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, userLoading] = useAuthState(auth);

  useEffect(() => {
    const fetchEquipment = async () => {
      if (userLoading) return;

      if (!user) {
        setLoading(false);
        return;
      };

      try {
        setLoading(true);
        const q = query(collection(db, "equipment"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        const equipmentData = querySnapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
            return { 
                id: docSnap.id, 
                ...docSnap.data() 
            } as Equipment;
        });

        setEquipment(equipmentData);
      } catch (error) {
        console.error("Error fetching equipment: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [user, userLoading]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Estado del Equipo</h1>
        <p className="text-muted-foreground">
          Revise el estado de financiamiento de su equipo.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="p-0">
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <div className="p-6 pb-2">
                  <Skeleton className="h-5 w-20 mb-2" />
                  <Skeleton className="h-7 w-full" />
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-5 w-3/4" />
              </CardFooter>
            </Card>
          ))
        ) : equipment.length > 0 ? (
          equipment.map((item) => (
            <Card key={item.id}>
              <CardHeader className="p-0">
                <div className="relative h-48 w-full">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover rounded-t-lg"
                    data-ai-hint={item.aiHint}
                  />
                </div>
                <div className="p-6 pb-2">
                  <Badge
                    variant={item.status === "Pagado" ? "default" : "secondary"}
                    className="mb-2"
                  >
                    {item.status}
                  </Badge>
                  <CardTitle>{item.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="mb-4">
                  <Progress value={item.progress} aria-label={`${item.progress}% pagado`} />
                  <p className="text-sm text-muted-foreground mt-2">{item.progress}% pagado</p>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">{item.details}</p>
              </CardFooter>
            </Card>
          ))
        ) : (
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                <Alert>
                    <Wrench className="h-4 w-4" />
                    <AlertTitle>No hay equipos</AlertTitle>
                    <AlertDescription>
                        No tienes equipos financiados en este momento.
                    </AlertDescription>
                </Alert>
            </div>
        )}
      </div>
    </div>
  );
}
