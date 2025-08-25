
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Smartphone,
  Tablet,
  Calculator,
  ScanLine,
  FileSignature,
  Trash2,
  Info,
  Loader2,
  Search,
  UserPlus,
  UserCheck,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { verifyIdentity } from "@/ai/flows/verify-identity-flow";
import { z } from 'zod';


const steps = [
  { id: 1, title: "Información del Cliente" },
  { id: 2, title: "Verificación de Identidad" },
  { id: 3, title: "Detalles del Financiamiento" },
  { id: 4, title: "Enlace MDM" },
  { id: 5, title: "Contrato y Firma" },
];

interface Client {
    id: string;
    name: string;
    cedula: string;
    email: string;
    phone?: string;
}

// Schemas are defined here because the flow is a 'use server' file
// and cannot export non-async function objects.
export const VerifyIdentityInputSchema = z.object({
  cedula: z.string().describe('The national ID number to verify.'),
  id_image: z.string().describe("A photo of the ID card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  face_image: z.string().describe("A selfie of the person, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type VerifyIdentityInput = z.infer<typeof VerifyIdentityInputSchema>;

export const VerifyIdentityOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.any().optional(),
});
export type VerifyIdentityOutput = z.infer<typeof VerifyIdentityOutputSchema>;


export default function NewRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verifyingClient, setVerifyingClient] = useState(false);
  const [verifyingIdentity, setVerifyingIdentity] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Client Info
  const [cedulaInput, setCedulaInput] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  // Step 2: Identity Verification
  const [idImage, setIdImage] = useState<File | null>(null);
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [idImageUrl, setIdImageUrl] = useState<string | null>(null);
  const [faceImageUrl, setFaceImageUrl] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const idImageRef = useRef<HTMLInputElement>(null);
  const faceImageRef = useRef<HTMLInputElement>(null);


  // Step 3
  const [itemType, setItemType] = useState<string>("");
  const [itemValue, setItemValue] = useState(12500);
  const [initialPercentage, setInitialPercentage] = useState(40);
  const [installments, setInstallments] = useState(6);
  const [requestDate] = useState(new Date());

  // Step 4
  const [imei, setImei] = useState("");

  // Step 5
  const sigPad = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);


  // --- Lógica de Cálculo Actualizada ---
  const initialPayment = itemValue * (initialPercentage / 100);
  const financingAmount = itemValue - initialPayment;
  const interestRate = 0.525; // 52.5% de interés fijo sobre el monto a financiar
  const totalInterest = financingAmount * interestRate;
  const totalToPayInInstallments = financingAmount + totalInterest;
  const biweeklyPayment = installments > 0 ? totalToPayInInstallments / installments : 0;
  const totalPaid = initialPayment + totalToPayInInstallments;
  // --- Fin de la Lógica de Cálculo ---

  const handleVerifyCedula = async () => {
    if (!cedulaInput) {
        toast({ variant: "destructive", title: "Cédula requerida", description: "Por favor, ingresa un número de cédula."});
        return;
    }
    setVerifyingClient(true);
    setSelectedClient(null);
    setIsNewClient(false);

    try {
        const q = query(collection(db, "users"), where("cedula", "==", cedulaInput));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setIsNewClient(true);
            toast({ title: "Cliente no encontrado", description: "Por favor, ingresa los datos para crear un nuevo cliente."});
        } else {
            const clientDoc = querySnapshot.docs[0];
            setSelectedClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
            toast({ title: "Cliente Encontrado", description: "Se han cargado los datos del cliente existente."});
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error al verificar", description: error.message });
    } finally {
        setVerifyingClient(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void, urlSetter: (url: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(file);
      urlSetter(URL.createObjectURL(file));
    }
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  }

  const handleIdentityVerification = async () => {
    if (!idImage || !faceImage || !cedulaInput) {
        toast({ variant: "destructive", title: "Faltan datos", description: "Cédula, foto de ID y selfie son requeridos." });
        return;
    }
    setVerifyingIdentity(true);
    setVerificationResult(null);
    try {
        const idImageDataUri = await fileToDataUri(idImage);
        const faceImageDataUri = await fileToDataUri(faceImage);

        const result = await verifyIdentity({
            cedula: cedulaInput,
            id_image: idImageDataUri,
            face_image: faceImageDataUri,
        });

        setVerificationResult(result);

        if (result.success) {
            toast({ title: "Verificación Exitosa", description: `Similitud de rostro: ${(result.data.face_similarity * 100).toFixed(2)}%` });
        } else {
             toast({ variant: "destructive", title: "Verificación Fallida", description: result.message });
        }

    } catch (error: any) {
        toast({ variant: "destructive", title: "Error en la API", description: error.message });
    } finally {
        setVerifyingIdentity(false);
    }
  };


  const paymentDates = Array.from({ length: installments }, (_, i) => {
    const date = new Date(requestDate);
    date.setDate(date.getDate() + (i + 1) * 15);
    return format(date, "dd/MM/yyyy", { locale: es });
  });

  const progress = ((currentStep -1) / (steps.length - 1)) * 100;

  const nextStep = () =>
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  
  const clearSignature = () => {
    sigPad.current?.clear();
    setSignatureData(null);
  };

  const handleSignatureEnd = () => {
    setSignatureData(sigPad.current?.toDataURL() || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep === 1) {
        if (!selectedClient && !isNewClient) {
            toast({ variant: "destructive", title: "Cliente no verificado", description: "Debes verificar la cédula del cliente para continuar."});
            return;
        }
        if (isNewClient && (!newClientName || !newClientEmail)) {
            toast({ variant: "destructive", title: "Datos incompletos", description: "Debes completar el nombre y correo del nuevo cliente."});
            return;
        }
    }

    if (currentStep === 2) {
        if (!verificationResult?.success) {
            toast({ variant: "destructive", title: "Verificación Requerida", description: "La identidad del cliente debe ser verificada exitosamente para continuar." });
            return;
        }
    }


    if (currentStep !== steps.length) {
        nextStep();
        return; 
    }
    
    setLoading(true);
    
    if (sigPad.current?.isEmpty()) {
        toast({
            variant: "destructive",
            title: "Firma Requerida",
            description: "El cliente debe firmar el contrato para continuar.",
        });
        setLoading(false);
        return;
    }

    try {
        let finalClient = selectedClient;

        if (isNewClient) {
            const newClientData = {
                name: newClientName,
                email: newClientEmail,
                cedula: cedulaInput,
                phone: newClientPhone,
                role: "Cliente",
                status: "Activo",
                since: new Date().toLocaleDateString('es-DO'),
                createdAt: new Date().toISOString(),
            };
            const newClientRef = doc(db, "users", cedulaInput);
            await setDoc(newClientRef, newClientData);
            finalClient = { id: newClientRef.id, ...newClientData };
        }

        if (!finalClient) {
            toast({ variant: "destructive", title: "Error Fatal", description: "No hay un cliente seleccionado o creado."});
            setLoading(false);
            return;
        }

        await addDoc(collection(db, "requests"), {
            userId: finalClient.id,
            cedula: finalClient.cedula,
            client: finalClient.name,
            itemType,
            itemValue,
            initialPercentage,
            initialPayment,
            financingAmount,
            interestRate,
            totalInterest,
            installments,
            biweeklyPayment: parseFloat(biweeklyPayment.toFixed(2)),
            totalPaid,
            imei,
            signatureDataUrl: sigPad.current?.toDataURL(),
            status: "Pendiente de Aprobación",
            date: format(requestDate, "yyyy-MM-dd"),
            createdAt: serverTimestamp(),
            type: `Financiamiento de ${itemType}`,
            verificationData: verificationResult,
        });

        toast({
            title: "Solicitud Creada",
            description: "La nueva solicitud de financiamiento ha sido guardada exitosamente.",
        });

        router.push("/internal/requests");

    } catch (error: any) {
        console.error("Error al crear la solicitud:", error);
        toast({
            variant: "destructive",
            title: "Error al Guardar",
            description: "Hubo un problema al guardar la solicitud: " + error.message,
        });
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium text-muted-foreground">
                Paso {currentStep} de {steps.length}: {steps[currentStep - 1].title}
              </h2>
            </div>
            <Progress value={progress} className="w-full" />
          </CardHeader>
          <CardContent className="min-h-[450px]">
            {currentStep === 1 && (
               <div className="flex flex-col items-center justify-center pt-6 space-y-6">
                 <CardTitle>Información del Cliente</CardTitle>
                  <CardDescription>
                    Ingresa la cédula del cliente. Si no existe, podrás crearlo.
                  </CardDescription>
                  
                  <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input 
                        id="cedula" 
                        placeholder="Ingresa número de cédula" 
                        value={cedulaInput}
                        onChange={(e) => setCedulaInput(e.target.value)}
                        disabled={verifyingClient}
                    />
                    <Button type="button" onClick={handleVerifyCedula} disabled={verifyingClient}>
                        {verifyingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Verificar
                    </Button>
                 </div>

                {selectedClient && (
                    <Card className="w-full max-w-sm bg-green-50 border-green-200">
                        <CardHeader>
                            <CardTitle className="flex items-center text-green-800">
                                <UserCheck className="mr-2"/> Cliente Encontrado
                            </CardTitle>
                            <CardDescription className="text-green-700">Cédula: {selectedClient.cedula}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-green-900">
                             <p><b>Nombre:</b> {selectedClient.name}</p>
                             <p><b>Correo:</b> {selectedClient.email || 'No registrado'}</p>
                        </CardContent>
                    </Card>
                )}

                 {isNewClient && (
                    <Card className="w-full max-w-sm bg-blue-50 border-blue-200">
                        <CardHeader>
                           <CardTitle className="flex items-center text-blue-800">
                                <UserPlus className="mr-2"/> Crear Nuevo Cliente
                            </CardTitle>
                            <CardDescription className="text-blue-700">
                                Cédula: {cedulaInput}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-client-name" className="text-blue-900">Nombre Completo</Label>
                                <Input id="new-client-name" placeholder="Juan Pérez" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="new-client-email" className="text-blue-900">Correo Electrónico</Label>
                                <Input id="new-client-email" type="email" placeholder="juan.perez@correo.com" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="new-client-phone" className="text-blue-900">Teléfono (Opcional)</Label>
                                <Input id="new-client-phone" type="tel" placeholder="809-555-1234" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>
                )}
              </div>
            )}
            
            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
                <div className="space-y-4">
                  <CardTitle>Carga de Documentos</CardTitle>
                  <CardDescription>
                    Sube una foto de la cédula del cliente y una selfie para la verificación biométrica.
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <Label htmlFor="id-image">Foto de la Cédula (Frente)</Label>
                     <Input id="id-image" type="file" accept="image/*" ref={idImageRef} onChange={(e) => handleFileChange(e, setIdImage, setIdImageUrl)} className="hidden" />
                    <Button variant="outline" className="w-full" type="button" onClick={() => idImageRef.current?.click()}>
                      <Camera className="mr-2" /> {idImage ? idImage.name : "Subir o Tomar Foto"}
                    </Button>
                    {idImageUrl && <img src={idImageUrl} alt="Preview de Cédula" className="mt-2 rounded-md border max-h-32" />}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="face-image">Selfie del Cliente</Label>
                    <Input id="face-image" type="file" accept="image/*" ref={faceImageRef} onChange={(e) => handleFileChange(e, setFaceImage, setFaceImageUrl)} className="hidden" />
                    <Button variant="outline" className="w-full" type="button" onClick={() => faceImageRef.current?.click()}>
                      <Camera className="mr-2" /> {faceImage ? faceImage.name : "Subir o Tomar Foto"}
                    </Button>
                     {faceImageUrl && <img src={faceImageUrl} alt="Preview de Selfie" className="mt-2 rounded-md border max-h-32" />}
                  </div>
                  
                  <Button type="button" onClick={handleIdentityVerification} disabled={verifyingIdentity || !idImage || !faceImage} className="w-full">
                    {verifyingIdentity ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4 mr-2" />}
                    Verificar Identidad
                  </Button>
                </div>
                 <div className="space-y-4">
                    <CardTitle>Resultado de Verificación</CardTitle>
                    <CardDescription>
                        El resultado de la API de verificación aparecerá aquí.
                    </CardDescription>
                    {verifyingIdentity ? (
                        <div className="flex justify-center items-center h-40">
                             <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                        </div>
                    ) : verificationResult ? (
                        <Card className={`w-full ${verificationResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                             <CardHeader>
                                <CardTitle className={`flex items-center ${verificationResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                    {verificationResult.success ? <CheckCircle className="mr-2"/> : <Info className="mr-2"/>}
                                    {verificationResult.success ? "Verificación Exitosa" : "Verificación Fallida"}
                                </CardTitle>
                             </CardHeader>
                            <CardContent className={`text-sm ${verificationResult.success ? 'text-green-900' : 'text-red-900'}`}>
                                <p><b>Mensaje:</b> {verificationResult.message}</p>
                                {verificationResult.data?.face_similarity && (
                                    <p><b>Similitud Facial:</b> {(verificationResult.data.face_similarity * 100).toFixed(2)}%</p>
                                )}
                                {verificationResult.data?.document_number && (
                                     <p><b>Cédula en doc:</b> {verificationResult.data.document_number}</p>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                         <div className="flex justify-center items-center h-40 rounded-lg border-dashed border-2">
                            <p className="text-muted-foreground">Esperando verificación...</p>
                        </div>
                    )}
                 </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
                <div className="space-y-4">
                  <CardTitle>Detalles del Artículo</CardTitle>
                  <CardDescription>
                    Selecciona el tipo de artículo e ingresa su valor de mercado.
                  </CardDescription>
                  <div className="space-y-2">
                    <Label htmlFor="item-type">Tipo de Artículo</Label>
                    <Select onValueChange={setItemType} value={itemType} required>
                      <SelectTrigger id="item-type">
                        <SelectValue placeholder="Selecciona un artículo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">
                          <div className="flex items-center">
                            <Smartphone className="mr-2 h-4 w-4" /> Teléfono
                          </div>
                        </SelectItem>
                        <SelectItem value="tablet">
                          <div className="flex items-center">
                            <Tablet className="mr-2 h-4 w-4" /> Tablet
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="item-value">Precio del Equipo (RD$)</Label>
                    <Input
                      id="item-value"
                      type="number"
                      placeholder="Ej: 12500"
                      value={itemValue || ""}
                      onChange={(e) => setItemValue(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="space-y-4 pt-4">
                    <Label htmlFor="initial-percentage">Porcentaje de Inicial: {initialPercentage}%</Label>
                    <Slider
                      id="initial-percentage"
                      min={10}
                      max={100}
                      step={5}
                      value={[initialPercentage]}
                      onValueChange={(value) => setInitialPercentage(value[0])}
                    />
                  </div>
                  <div className="space-y-4 pt-2">
                      <Label htmlFor="installments">Número de Cuotas: {installments} Quincenales</Label>
                      <Slider
                        id="installments"
                        min={2}
                        max={12}
                        step={1}
                        value={[installments]}
                        onValueChange={(value) => setInstallments(value[0])}
                      />
                    </div>
                </div>
                <div className="space-y-4">
                  <CardTitle className="flex items-center">
                    <Calculator className="mr-2 h-5 w-5" /> Cálculo de Financiamiento
                  </CardTitle>
                  <div className="rounded-lg border bg-muted p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Precio del Equipo:</span>
                      <span className="font-medium">RD$ {itemValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inicial ({initialPercentage}%):</span>
                      <span className="font-medium">RD$ {initialPayment.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base border-t pt-2">
                      <span>Monto a Financiar:</span>
                      <span>RD$ {financingAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total Intereses ({(interestRate * 100).toFixed(1)}%):</span>
                      <span>RD$ {totalInterest.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total en cuotas:</span>
                      <span>RD$ {totalToPayInInstallments.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg text-primary border-t pt-2 mt-2">
                      <span>Cuota Quincenal:</span>
                      <span>RD$ {biweeklyPayment.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                        <span>Costo Total (Inicial + Cuotas):</span>
                        <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <span className="font-bold flex items-center gap-1">
                                      RD$ {totalPaid.toFixed(2)}
                                      <Info className="h-3 w-3" />
                                  </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                  <p>Este es el monto total que el cliente pagará al final del financiamiento.</p>
                              </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 4 && (
              <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6">
                  <Smartphone className="h-12 w-12 text-primary" />
                  <CardTitle>Enlace con Sistema MDM</CardTitle>
                  <CardDescription className="max-w-md">
                      Ingresa el IMEI del equipo para vincularlo a nuestro sistema de control y seguridad. Puedes escanear el código de barras de la caja.
                  </CardDescription>
                  <div className="flex w-full max-w-sm items-center space-x-2">
                      <Input id="imei" placeholder="Ingresa el IMEI del equipo" value={imei} onChange={(e) => setImei(e.target.value)} required />
                      <Button variant="outline" size="icon" type="button">
                          <ScanLine className="h-5 w-5" />
                          <span className="sr-only">Escanear IMEI</span>
                      </Button>
                  </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
                <div>
                  <CardTitle className="flex items-center mb-4">
                      <FileSignature className="mr-2" /> Contrato de Financiamiento
                  </CardTitle>
                  <div className="border rounded-lg p-4 h-[350px] overflow-y-auto text-sm space-y-4 bg-muted/50">
                      <p>En {format(requestDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}, se celebra este contrato entre <strong>ALZA C.A.</strong> y el cliente <strong>{selectedClient?.name || newClientName}</strong> con C.I. <strong>{cedulaInput}</strong>.</p>
                      <p>El cliente solicita el financiamiento de un <strong>{itemType || 'equipo'}</strong> valorado en <strong>RD$ {itemValue.toFixed(2)}</strong>.</p>
                      <p>El cliente se compromete a pagar una inicial de <strong>RD$ {initialPayment.toFixed(2)}</strong> ({initialPercentage}%) en la fecha de hoy.</p>
                      <p>El monto restante de <strong>RD$ {financingAmount.toFixed(2)}</strong> más los intereses de <strong>RD$ {totalInterest.toFixed(2)}</strong> (Total a pagar en cuotas: <strong>RD$ {totalToPayInInstallments.toFixed(2)}</strong>) será pagado en <strong>{installments} cuotas quincenales</strong> de aproximadamente <strong>RD$ {biweeklyPayment.toFixed(2)}</strong> cada una.</p>
                      
                      <div>
                          <h4 className="font-semibold mb-2">Calendario de Pagos (Estimado):</h4>
                          <ul className="list-disc pl-5">
                              {paymentDates.map((date, i) => (
                                  <li key={i}>Cuota {i+1}: {date}</li>
                              ))}
                          </ul>
                      </div>
                      <p className="pt-4">La falta de pago resultará en el bloqueo del equipo con IMEI <strong>{imei || "XXXXXXXXXXXXXXXX"}</strong> a través del sistema MDM.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <CardTitle>Firma del Cliente</CardTitle>
                      <Button variant="ghost" size="sm" onClick={clearSignature} type="button">
                          <Trash2 className="mr-2 h-4 w-4"/>
                          Limpiar
                      </Button>
                  </div>
                  <CardDescription>El cliente debe firmar en el recuadro para aceptar los términos del contrato.</CardDescription>
                  <div className="w-full h-48 bg-white rounded-lg border-2 border-dashed">
                      <SignatureCanvas
                          ref={sigPad}
                          penColor="black"
                          canvasProps={{ className: "w-full h-full" }}
                          onEnd={handleSignatureEnd}
                      />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={prevStep} type="button">
                  <ChevronLeft className="mr-2" /> Anterior
                </Button>
              )}
              {currentStep === 1 && (
                  <Button variant="ghost" asChild>
                      <Link href="/internal/dashboard">Cancelar</Link>
                  </Button>
              )}
            </div>
            <div>
              {currentStep < steps.length ? (
                <Button type="submit">
                   Siguiente <ChevronRight className="ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Completar Solicitud <CheckCircle className="ml-2" />
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
