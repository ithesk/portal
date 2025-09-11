
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, RefreshCw, Copy, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Separator } from "@/components/ui/separator";

interface FinancingSettings {
    interestRate: number; // Stored as a decimal, e.g., 0.525 for 52.5%
}

interface ProcessOutput {
    success: boolean;
    message: string;
    requestsChecked?: number;
    requestsUpdated?: number;
}


export default function SettingsPage() {
  const [settings, setSettings] = useState<FinancingSettings>({ interestRate: 0 });
  const [displayInterestRate, setDisplayInterestRate] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<ProcessOutput | null>(null);
  
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<ProcessOutput | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const functions = getFunctions();
            const getFinancingSettings = httpsCallable(functions, 'getFinancingSettings');
            const result: any = await getFinancingSettings();
            
            if (result.data && result.data.interestRate) {
                const data = result.data as FinancingSettings;
                setSettings(data);
                setDisplayInterestRate((data.interestRate * 100).toString());
            } else {
                 const defaultRate = 0.525;
                 setSettings({ interestRate: defaultRate });
                 setDisplayInterestRate((defaultRate * 100).toString());
                 toast({ variant: "default", title: 'Usando valores por defecto', description: 'No se encontró configuración guardada.'})
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
            setError("No se pudieron cargar las configuraciones. Revisa los permisos de la Cloud Function.");
        } finally {
            setLoading(false);
        }
    }
    fetchSettings();
  }, [toast]);

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

        const functions = getFunctions();
        const saveFinancingSettings = httpsCallable(functions, 'saveFinancingSettings');
        await saveFinancingSettings({ interestRate: rateAsDecimal });

        setSettings({ interestRate: rateAsDecimal });
        toast({ title: "Configuración Guardada", description: "Los nuevos parámetros de financiamiento han sido guardados." });

    } catch (err: any) {
        console.error("Error saving settings:", err);
        setError("No se pudieron guardar las configuraciones: " + err.message);
    } finally {
        setSaving(false);
    }
  }

  const handleRunBackfill = async () => {
    setIsBackfilling(true);
    setBackfillResult(null);
    try {
      const functions = getFunctions();
      const backfillFunction = httpsCallable(functions, 'backfillRequestUserIds');
      const result: any = await backfillFunction();
      
      setBackfillResult(result.data as ProcessOutput);

      if (result.data.success) {
        toast({ title: "Proceso completado", description: result.data.message });
      } else {
        toast({ variant: "destructive", title: "Error en el proceso", description: result.data.message });
      }
    } catch (err: any) {
      console.error("Error calling backfill function:", err);
      toast({ variant: "destructive", title: "Error Crítico", description: `No se pudo ejecutar la función: ${err.message}` });
    } finally {
      setIsBackfilling(false);
    }
  };
  
  const handleRunMigration = async () => {
    if (!sourceId || !destinationId) {
        toast({variant: 'destructive', title: 'IDs requeridos', description: 'Debes proporcionar ambos IDs, el de origen y el de destino.'});
        return;
    }
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const functions = getFunctions();
      const migrateFunction = httpsCallable(functions, 'migrateUserData');
      const result: any = await migrateFunction({ sourceId, destinationId });
      
      setMigrationResult(result.data as ProcessOutput);

      if (result.data.success) {
        toast({ title: "Migración Exitosa", description: result.data.message });
      } else {
        toast({ variant: "destructive", title: "Error de Migración", description: result.data.message });
      }

    } catch (err: any) {
      console.error("Error calling migration function:", err);
      toast({ variant: "destructive", title: "Error Crítico", description: `No se pudo ejecutar la función de migración: ${err.message}` });
    } finally {
        setIsMigrating(false);
    }
  };


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
       <Card>
        <CardHeader>
          <CardTitle>Herramientas del Sistema</CardTitle>
          <CardDescription>
            Ejecuta procesos para mantener la consistencia e integridad de los datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
            <div className="space-y-2">
              <Label>Corregir Solicitudes Antiguas</Label>
              <p className="text-xs text-muted-foreground">
                Este proceso busca solicitudes que no tengan un ID de usuario y se lo asigna buscando la cédula del cliente. Úsalo si un cliente creó una cuenta después de haberle generado una solicitud.
              </p>
            </div>
             <Button onClick={handleRunBackfill} disabled={isBackfilling}>
                {isBackfilling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="mr-2 h-4 w-4" />
                Ejecutar Corrección
            </Button>
            {backfillResult && (
              <Alert className="mt-4" variant={backfillResult.success ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{backfillResult.success ? "Proceso Finalizado" : "Error en el Proceso"}</AlertTitle>
                <AlertDescription>
                  {backfillResult.message}
                </AlertDescription>
              </Alert>
            )}
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
               <Label className="text-base font-semibold">Herramienta de Migración de Usuario</Label>
               <p className="text-xs text-muted-foreground">
                 Usa esta herramienta para transferir los datos de un documento de usuario corrupto (origen) a uno correcto (destino) y re-vincular sus solicitudes/equipos. El documento de origen será eliminado.
               </p>
            </div>
             <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full space-y-2">
                    <Label htmlFor="sourceId">ID de Origen (Documento a copiar y eliminar)</Label>
                    <Input id="sourceId" value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder="ID de documento viejo"/>
                </div>
                <div className="hidden md:block pt-6">
                     <ArrowRight className="h-6 w-6 text-muted-foreground"/>
                </div>
                <div className="flex-1 w-full space-y-2">
                    <Label htmlFor="destinationId">ID de Destino (Documento correcto)</Label>
                    <Input id="destinationId" value={destinationId} onChange={e => setDestinationId(e.target.value)} placeholder="ID de documento nuevo (UID de Auth)"/>
                </div>
             </div>
              <Button onClick={handleRunMigration} disabled={isMigrating} variant="destructive">
                {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Copy className="mr-2 h-4 w-4" />
                Ejecutar Migración
            </Button>
             {migrationResult && (
              <Alert className="mt-4" variant={migrationResult.success ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{migrationResult.success ? "Migración Finalizada" : "Error en la Migración"}</AlertTitle>
                <AlertDescription>
                  {migrationResult.message}
                </AlertDescription>
              </Alert>
            )}

        </CardContent>
      </Card>
    </div>
  );
}
