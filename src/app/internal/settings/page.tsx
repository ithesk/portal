
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface FinancingSettings {
    interestRate: number; // Stored as a decimal, e.g., 0.525 for 52.5%
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<FinancingSettings>({ interestRate: 0 });
  const [displayInterestRate, setDisplayInterestRate] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const settingsRef = doc(db, "config", "financing");

  useEffect(() => {
    const fetchSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as FinancingSettings;
                setSettings(data);
                setDisplayInterestRate((data.interestRate * 100).toString());
            } else {
                // If no settings exist, create a default one
                const defaultSettings: FinancingSettings = { interestRate: 0.525 };
                await setDoc(settingsRef, defaultSettings);
                setSettings(defaultSettings);
                setDisplayInterestRate("52.5");
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
            setError("No se pudieron cargar las configuraciones. Revisa los permisos de Firestore.");
        } finally {
            setLoading(false);
        }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
        const rateAsDecimal = parseFloat(displayInterestRate) / 100;
        if (isNaN(rateAsDecimal)) {
             toast({ variant: "destructive", title: "Valor inválido", description: "La tasa de interés debe ser un número." });
             setSaving(false);
             return;
        }
        const newSettings: FinancingSettings = { interestRate: rateAsDecimal };
        await setDoc(settingsRef, newSettings);
        setSettings(newSettings);
        toast({ title: "Configuración Guardada", description: "Los nuevos parámetros de financiamiento han sido guardados." });

    } catch (err) {
        console.error("Error saving settings:", err);
        setError("No se pudieron guardar las configuraciones.");
    } finally {
        setSaving(false);
    }
  }


  if (loading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-96 mt-2" />
            </CardHeader>
            <CardContent className="grid gap-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </CardContent>
             <CardHeader className="pt-0">
                 <Skeleton className="h-10 w-32" />
            </CardHeader>
        </Card>
    )
  }

  if (error) {
     return (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error de Conexión</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    )
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Financiamiento</CardTitle>
          <CardDescription>
            Ajusta los parámetros globales para los cálculos de financiamiento en toda la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interest-rate">Tasa de Interés Fija sobre el Financiamiento (%)</Label>
              <Input
                id="interest-rate"
                type="number"
                value={displayInterestRate}
                onChange={(e) => setDisplayInterestRate(e.target.value)}
                placeholder="Ej: 52.5"
              />
               <p className="text-xs text-muted-foreground">
                 Este es el interés total que se aplicará al monto financiado. Ej: 52.5 para un 52.5%.
               </p>
            </div>
          </div>
        </CardContent>
        <CardHeader className="pt-0">
             <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
            </Button>
        </CardHeader>
      </Card>
    </div>
  );
}
