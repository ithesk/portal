
"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import QRCode from "qrcode.react";
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
  Camera,
  QrCode,
  UserCheck,
  RefreshCw,
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
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { getFunctions, httpsCallable } from 'firebase/functions';


const steps = [
  { id: 1, title: "Verificación de Identidad" },
  { id: 2, title: "Detalles del Financiamiento" },
  { id: 3, title: "Enlace MDM" },
  { id: 4, title: "Contrato y Firma" },
];

interface Client {
    id: string;
    name: string;
    cedula: string;
    email: string;
    phone?: string;
}

function NewRequestForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Client & Identity Info
  const [cedulaInput, setCedulaInput] = useState("");
  const [idImage, setIdImage] = useState<File | null>(null);
  const [idImageUrl, setIdImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [verifiedClient, setVerifiedClient] = useState<Client | null>(null);
  const idImageRef = useRef<HTMLInputElement>(null);
  

  const handleCheckVerificationStatus = async () => {
    if (!verificationId) return;

    setIsCheckingStatus(true);
    try {
        const docRef = doc(db, "verifications", verificationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.status === 'completed') {
                setVerificationData(data.apiResponse);
                if (data.apiResponse.verification_passed) {
                    const clientInfo: Client = {
                        id: data.apiResponse.document_info.cedula,
                        cedula: data.apiResponse.document_info.cedula,
                        name: data.apiResponse.document_info.nombre_completo,
                        email: "", // User may need to input this later
                    };
                    setVerifiedClient(clientInfo);
                    toast({ title: "¡Verificación Completada!", description: `${clientInfo.name} ha sido verificado.` });
                } else {
                     toast({ variant: "destructive", title: "Verificación Fallida", description: data.apiResponse.verification_details?.error || "Los datos biométricos no coincidieron." });
                }
            } else if (data && data.status === 'failed') {
                 toast({ variant: "destructive", title: "Verificación Fallida", description: data.error || "La verificación no pudo ser completada." });
            } else {
                toast({ title: "Aún Pendiente", description: "El cliente todavía no ha completado el proceso de selfie." });
            }
        }
    } catch (error) {
        console.error("Error checking verification status", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo comprobar el estado de la verificación." });
    } finally {
        setIsCheckingStatus(false);
    }
  };


  // Step 2
  const [itemType, setItemType] = useState<string>("");
  const [itemValue, setItemValue] = useState(12500);
  const [initialPercentage, setInitialPercentage] = useState(40);
  const [installments, setInstallments] = useState(6);
  const [requestDate] = useState(new Date());

  // Step 3
  const [imei, setImei] = useState("");

  // Step 4
  const sigPad = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const handleIdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdImage(file);
      setIdImageUrl(URL.createObjectURL(file));
    }
  };

  const handleGenerateQR = async () => {
    if (!cedulaInput || !idImage) {
        toast({ variant: "destructive", title: "Datos incompletos", description: "Por favor, ingresa la cédula y sube la foto del documento." });
        return;
    }

    setIsUploading(true);
    console.log("DEBUG: handleGenerateQR started.");
    const functions = getFunctions();
    const generateUploadUrl = httpsCallable(functions, 'generateUploadUrl');

    try {
        // 1. Create a new verification document locally to get an ID
        const verificationRef = doc(collection(db, "verifications"));
        const newVerificationId = verificationRef.id;
        console.log(`DEBUG: Generated new verificationId: ${newVerificationId}`);

        // 2. Call the Cloud Function to get a signed URL
        console.log("DEBUG: Calling 'generateUploadUrl' Cloud Function...");
        const result: any = await generateUploadUrl({
            verificationId: newVerificationId,
            contentType: idImage.type
        });

        if (!result.data.success) {
            throw new Error(result.data.error || 'Failed to get upload URL from server.');
        }

        const signedUrl = result.data.url;
        console.log("DEBUG: Got signed URL successfully.");

        // 3. Upload the file to the signed URL using fetch
        console.log("DEBUG: Starting ID image upload via signed URL...");
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: idImage,
            headers: {
                'Content-Type': idImage.type,
            },
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("DEBUG: Upload failed with status:", uploadResponse.status, "and response:", errorText);
            throw new Error(`File upload failed with status ${uploadResponse.status}`);
        }
        console.log("DEBUG: ID image uploaded successfully.");

        // 4. Get the public download URL
        const storage = getStorage();
        const fileRef = ref(storage, `verifications/${newVerificationId}/id_image.jpg`);
        const downloadUrl = await getDownloadURL(fileRef);
        console.log(`DEBUG: Got download URL: ${downloadUrl}`);


        // 5. Set the initial data in Firestore
        const docData = {
            cedula: cedulaInput,
            idImageUrl: downloadUrl,
            status: "pending-selfie",
            createdAt: serverTimestamp(),
        };
        console.log(`DEBUG: Preparing to write to Firestore with data:`, docData);
        await setDoc(verificationRef, docData);
        console.log("DEBUG: Firestore document written successfully.");

        setVerificationId(newVerificationId);
        toast({ title: "QR Generado", description: "Pídele al cliente que escanee el código para continuar." });

    } catch (error: any) {
        console.error("DEBUG: CRITICAL ERROR in handleGenerateQR:", error);
        toast({ variant: "destructive", title: "Error al generar QR", description: `Hubo un problema en el servidor: ${error.message}` });
        setVerificationId(null);
    } finally {
        setIsUploading(false);
    }
  };

  const initialPayment = itemValue * (initialPercentage / 100);
  const financingAmount = itemValue - initialPayment;
  const interestRate = 0.525;
  const totalInterest = financingAmount * interestRate;
  const totalToPayInInstallments = financingAmount + totalInterest;
  const biweeklyPayment = installments > 0 ? totalToPayInInstallments / installments : 0;
  const totalPaid = initialPayment + totalToPayInInstallments;

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
    
    if (currentStep === 1 && !verifiedClient) {
        toast({ variant: "destructive", title: "Verificación Requerida", description: "Debes completar la verificación de identidad del cliente." });
        return;
    }

    if (currentStep !== steps.length) {
        nextStep();
        return; 
    }
    
    setLoading(true);
    
    if (sigPad.current?.isEmpty()) {
        toast({ variant: "destructive", title: "Firma Requerida", description: "El cliente debe firmar." });
        setLoading(false);
        return;
    }

    try {
        let userId = verifiedClient?.id;

        // Check if user exists, if not, create one
        const userDocRef = doc(db, "users", verifiedClient!.cedula);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) {
             await setDoc(userDocRef, {
                name: verifiedClient!.name,
                cedula: verifiedClient!.cedula,
                email: "", // User might need to claim this account
                phone: "",
                role: "Cliente",
                status: "Activo",
                since: new Date().toLocaleDateString('es-DO'),
                createdAt: new Date().toISOString(),
             });
             userId = verifiedClient!.cedula;
        } else {
             userId = userSnap.id;
        }

        const requestDocRef = await addDoc(collection(db, "requests"), {
            userId: userId,
            cedula: verifiedClient!.cedula,
            client: verifiedClient!.name,
            itemType,
            itemValue,
            initialPercentage,
            initialPayment,
            financingAmount,
            installments,
            biweeklyPayment: parseFloat(biweeklyPayment.toFixed(2)),
            imei,
            signatureDataUrl: sigPad.current?.toDataURL(),
            status: "Pendiente de Aprobación",
            date: format(requestDate, "yyyy-MM-dd"),
            createdAt: serverTimestamp(),
            type: `Financiamiento de ${itemType}`,
            verificationData: verificationData,
        });
        
        await addDoc(collection(db, "equipment"), {
            userId: userId,
            requestId: requestDocRef.id,
            cedula: verifiedClient!.cedula,
            name: itemType === 'phone' ? 'Teléfono' : 'Tablet',
            status: "Financiado",
            progress: 0,
            imageUrl: "https://placehold.co/600x400.png",
            aiHint: itemType,
            details: `Financiamiento creado el ${new Date().toLocaleDateString()}. IMEI: ${imei || 'N/A'}`,
            client: verifiedClient!.name,
            createdAt: serverTimestamp(),
        });

        toast({ title: "Solicitud Creada", description: "La solicitud ha sido guardada." });
        router.push("/internal/requests");

    } catch (error: any) {
        console.error("Error creating request:", error);
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-muted-foreground">
              Paso {currentStep} de {steps.length}: {steps[currentStep - 1].title}
            </h2>
            <Progress value={progress} className="w-full" />
          </CardHeader>
          <CardContent className="min-h-[450px]">
            {currentStep === 1 && (
               <div className="grid md:grid-cols-2 gap-8 pt-6">
                 <div>
                   <CardTitle>Datos de Identificación</CardTitle>
                   <CardDescription className="mt-2">
                       Ingresa la cédula del cliente y sube una foto clara del documento.
                   </CardDescription>
                    <div className="space-y-4 mt-6">
                        <div className="space-y-2">
                            <Label htmlFor="cedula">Número de Cédula</Label>
                            <Input id="cedula" placeholder="001-0000000-0" value={cedulaInput} onChange={(e) => setCedulaInput(e.target.value)} disabled={!!verificationId}/>
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="id-image">Foto de la Cédula (Frente)</Label>
                           <Input id="id-image" type="file" accept="image/*" ref={idImageRef} onChange={handleIdImageChange} className="hidden" disabled={!!verificationId}/>
                            <Button variant="outline" className="w-full" type="button" onClick={() => idImageRef.current?.click()} disabled={!!verificationId}>
                                <Camera className="mr-2" /> {idImage ? idImage.name : "Subir Foto"}
                            </Button>
                        </div>
                        {idImageUrl && <img src={idImageUrl} alt="Preview Cédula" className="mt-2 rounded-md border max-h-32" />}
                         <Button className="w-full" type="button" onClick={handleGenerateQR} disabled={isUploading || !!verificationId}>
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <QrCode className="mr-2" /> Generar QR para Selfie
                         </Button>
                    </div>
                 </div>
                 <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed p-4">
                    {verificationId ? (
                        verifiedClient ? (
                            <Card className="w-full bg-green-50 border-green-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-green-800"><UserCheck className="mr-2"/> Cliente Verificado</CardTitle>
                                </CardHeader>
                                <CardContent className="text-green-900 space-y-1">
                                    <p><b>Nombre:</b> {verifiedClient.name}</p>
                                    <p><b>Cédula:</b> {verifiedClient.cedula}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold">Esperando Selfie del Cliente...</h3>
                                <p className="text-sm text-muted-foreground text-center">Pídele al cliente que escanee el código QR y luego presiona "Verificar Estado".</p>
                                <QRCode value={`${window.location.origin}/verify/${verificationId}`} size={160} />
                                <div className="pt-4 flex items-center gap-2 text-muted-foreground">
                                    <Button onClick={handleCheckVerificationStatus} disabled={isCheckingStatus}>
                                        {isCheckingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Verificar Estado
                                    </Button>
                                </div>
                            </>
                        )
                    ) : (
                         <div className="text-center text-muted-foreground">
                            <QrCode className="mx-auto h-12 w-12" />
                            <p className="mt-2">El código QR para la verificación del cliente aparecerá aquí.</p>
                        </div>
                    )}
                 </div>
               </div>
            )}
            
            {currentStep === 2 && (
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
                    <div className="flex justify-between"><span>Precio del Equipo:</span><span className="font-medium">RD$ {itemValue.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Inicial ({initialPercentage}%):</span><span className="font-medium">RD$ {initialPayment.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold text-base border-t pt-2"><span>Monto a Financiar:</span><span>RD$ {financingAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Total Intereses ({(interestRate * 100).toFixed(1)}%):</span><span>RD$ {totalInterest.toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Total en cuotas:</span><span>RD$ {totalToPayInInstallments.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold text-lg text-primary border-t pt-2 mt-2"><span>Cuota Quincenal:</span><span>RD$ {biweeklyPayment.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                        <span>Costo Total (Inicial + Cuotas):</span>
                        <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild><span className="font-bold flex items-center gap-1">RD$ {totalPaid.toFixed(2)}<Info className="h-3 w-3" /></span></TooltipTrigger>
                              <TooltipContent><p>Monto total que el cliente pagará.</p></TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 3 && (
              <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6">
                  <Smartphone className="h-12 w-12 text-primary" />
                  <CardTitle>Enlace con Sistema MDM</CardTitle>
                  <CardDescription className="max-w-md">
                      Ingresa el IMEI del equipo para vincularlo a nuestro sistema. Puedes escanear el código de barras.
                  </CardDescription>
                  <div className="flex w-full max-w-sm items-center space-x-2">
                      <Input id="imei" placeholder="Ingresa el IMEI del equipo" value={imei} onChange={(e) => setImei(e.target.value)} required />
                      <Button variant="outline" size="icon" type="button"><ScanLine className="h-5 w-5" /><span className="sr-only">Escanear</span></Button>
                  </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
                <div>
                  <CardTitle className="flex items-center mb-4"><FileSignature className="mr-2" /> Contrato</CardTitle>
                  <div className="border rounded-lg p-4 h-[350px] overflow-y-auto text-sm space-y-4 bg-muted/50">
                      <p>En {format(requestDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}, se celebra este contrato entre <strong>ALZA C.A.</strong> y el cliente <strong>{verifiedClient?.name}</strong> con C.I. <strong>{verifiedClient?.cedula}</strong>.</p>
                      <p>El cliente solicita el financiamiento de un <strong>{itemType || 'equipo'}</strong> valorado en <strong>RD$ {itemValue.toFixed(2)}</strong>.</p>
                      <p>El cliente se compromete a pagar una inicial de <strong>RD$ {initialPayment.toFixed(2)}</strong> ({initialPercentage}%) y el monto restante de <strong>RD$ {financingAmount.toFixed(2)}</strong> más intereses de <strong>RD$ {totalInterest.toFixed(2)}</strong> será pagado en <strong>{installments} cuotas quincenales</strong> de <strong>RD$ {biweeklyPayment.toFixed(2)}</strong> cada una.</p>
                      <p className="pt-4">La falta de pago resultará en el bloqueo del equipo con IMEI <strong>{imei || "PENDIENTE"}</strong>.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><CardTitle>Firma del Cliente</CardTitle><Button variant="ghost" size="sm" onClick={clearSignature} type="button"><Trash2 className="mr-2 h-4 w-4"/>Limpiar</Button></div>
                  <CardDescription>El cliente debe firmar en el recuadro.</CardDescription>
                  <div className="w-full h-48 bg-white rounded-lg border-2 border-dashed">
                      <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{ className: "w-full h-full" }} onEnd={handleSignatureEnd} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <div>
              {currentStep > 1 && (<Button variant="outline" onClick={prevStep} type="button"><ChevronLeft className="mr-2" /> Anterior</Button>)}
              {currentStep === 1 && (<Button variant="ghost" asChild><Link href="/internal/dashboard">Cancelar</Link></Button>)}
            </div>
            <div>
              {currentStep < steps.length ? (
                <Button type="submit">Siguiente <ChevronRight className="ml-2" /></Button>
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


export default function NewRequestPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <NewRequestForm />
        </Suspense>
    );
}
