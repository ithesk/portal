
"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
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
  Search,
  UserPlus,
  Mail,
  Phone,
  Home,
  MessageSquare,
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
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const steps = [
  { id: 1, title: "Buscar o Verificar Cliente" },
  { id: 2, title: "Detalles del Financiamiento" },
  { id: 3, title: "Enlace MDM" },
  { id: 4, title: "Contrato y Firma" },
];

interface Client {
    id: string;
    name: string;
    cedula: string;
    email: string;
    phone: string;
    address?: string;
}

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

// Helper to convert File to Base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

function NewRequestForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Client Info
  const [cedulaInput, setCedulaInput] = useState("");
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [clientFound, setClientFound] = useState<Client | null>(null);
  const [clientSearchPerformed, setClientSearchPerformed] = useState(false);
  
  // Step 1.5: Verification for new client
  const [idImage, setIdImage] = useState<File | null>(null);
  const [idImageUrl, setIdImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [verifiedClientData, setVerifiedClientData] = useState<Partial<Client> | null>(null);
  const idImageRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Step 1.5b: SMS Verification for existing client
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);
  const [isSmsVerified, setIsSmsVerified] = useState(false);
  const [existingClientPhone, setExistingClientPhone] = useState("");


  const handleClientSearch = useCallback(async () => {
    if (cedulaInput.length !== 11) {
        return;
    }
    setIsSearchingClient(true);
    setClientSearchPerformed(true);
    try {
        const q = query(collection(db, "users"), where("cedula", "==", cedulaInput));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const clientDoc = querySnapshot.docs[0];
            const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client
            setClientFound(clientData);
            setExistingClientPhone(clientData.phone || "");
            toast({ title: "Cliente Encontrado", description: `Se cargaron los datos de ${clientData.name}.` });
        } else {
            setClientFound(null);
            toast({ title: "Cliente No Encontrado", description: "Este cliente es nuevo. Procede con la verificación de identidad.", duration: 5000 });
        }
    } catch (error) {
        console.error("Error searching client:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo realizar la búsqueda." });
    } finally {
        setIsSearchingClient(false);
    }
  }, [cedulaInput, toast]);

  // useEffect to auto-trigger search when cedula is 11 digits
  useEffect(() => {
    if (cedulaInput.length === 11) {
      handleClientSearch();
    }
  }, [cedulaInput, handleClientSearch]);


  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters
    if (value.length <= 11) {
        setCedulaInput(value);
    }
  };


  const handleCheckVerificationStatus = async () => {
    if (!verificationId) return;

    setIsCheckingStatus(true);
    try {
        const docRef = doc(db, "verifications", verificationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data?.status === 'completed') {
                setVerificationData(data.apiResponse);
                if (data.apiResponse?.verification_passed) {
                    const clientInfo: Partial<Client> = {
                        cedula: data.apiResponse.document_info.cedula,
                        name: data.apiResponse.document_info.nombre_completo,
                    };
                    setVerifiedClientData(clientInfo);
                    toast({ title: "¡Verificación Completada!", description: `${clientInfo.name} ha sido verificado.` });
                } else {
                     toast({ variant: "destructive", title: "Verificación Fallida", description: data.apiResponse.verification_details?.error || "Los datos biométricos no coincidieron." });
                }
            } else if (data?.status === 'failed') {
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

  const handleGenerateQR = async () => {
    if (!cedulaInput || !idImage) {
        toast({ variant: "destructive", title: "Campos Requeridos", description: "Por favor, ingresa la cédula y sube la foto." });
        return;
    }
    
    setIsUploading(true);
    try {
        const idImageBase64 = await toBase64(idImage);
        
        const functions = getFunctions();
        const verifyIdFromApp = httpsCallable(functions, 'verifyIdFromApp');
        const result: any = await verifyIdFromApp({ cedula: cedulaInput, idImageBase64 });

        if (result.data.success) {
            setVerificationId(result.data.verificationId);
            toast({ title: "QR Generado", description: "Pídele al cliente que escanee el código para continuar." });
        } else {
            throw new Error(result.data.message || "La función para generar QR falló.");
        }

    } catch (error: any) {
        console.error("Error al generar QR:", error);
        toast({ variant: "destructive", title: "Error", description: `Hubo un problema al generar el QR: ${error.message}` });
    } finally {
        setIsUploading(false);
    }
  };


   // --- SMS Verification Logic ---
  const setupRecaptcha = () => {
    if (!recaptchaContainerRef.current) return;
    recaptchaContainerRef.current.innerHTML = ''; // Clear previous instance
    const authInstance = getAuth();
    window.recaptchaVerifier = new RecaptchaVerifier(authInstance, recaptchaContainerRef.current, {
      'size': 'invisible',
      'callback': (response: any) => console.log("reCAPTCHA solved"),
    });
  };

  const onSendSmsCode = async (phoneToSend: string) => {
    setSmsLoading(true);
    if (!phoneToSend) {
        toast({ variant: "destructive", title: "Número no encontrado", description: "No hay un número de teléfono para enviar el código." });
        setSmsLoading(false);
        return;
    }
    try {
        setupRecaptcha();
        const appVerifier = window.recaptchaVerifier;
        const result = await signInWithPhoneNumber(auth, phoneToSend, appVerifier);
        setConfirmationResult(result);
        toast({ title: "Código Enviado", description: `Se ha enviado un código a ${phoneToSend}.` });
    } catch (error: any) {
        console.error("Error sending SMS:", error);
        toast({ variant: "destructive", title: "Error al Enviar Código", description: error.message });
    } finally {
        setSmsLoading(false);
    }
  };
  
  const handleSaveAndSendSms = async () => {
    if (!clientFound || !existingClientPhone) {
        toast({ variant: "destructive", title: "Error", description: "No hay cliente o número de teléfono para guardar." });
        return;
    }
    setSmsLoading(true);
    try {
        const userDocRef = doc(db, "users", clientFound.id);
        await updateDoc(userDocRef, { phone: existingClientPhone });
        setClientFound(prev => prev ? {...prev, phone: existingClientPhone} : null);
        toast({ title: "Teléfono Guardado", description: "El número de teléfono del cliente ha sido actualizado." });
        await onSendSmsCode(existingClientPhone);
    } catch (error: any) {
         console.error("Error saving phone or sending SMS:", error);
         toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el teléfono o enviar el código." });
    } finally {
        setSmsLoading(false);
    }
  };

  const onVerifySmsCode = async () => {
    setSmsLoading(true);
    if (!confirmationResult || !verificationCode) {
        toast({ variant: "destructive", title: "Error", description: "Por favor, ingresa el código de verificación." });
        setSmsLoading(false);
        return;
    }
    try {
        await confirmationResult.confirm(verificationCode);
        setIsSmsVerified(true);
        toast({ title: "¡Teléfono Verificado!", description: "El número ha sido verificado exitosamente." });
    } catch (error: any) {
        console.error("Error verifying code:", error);
        toast({ variant: "destructive", title: "Código Incorrecto", description: "El código ingresado no es válido." });
    } finally {
        setSmsLoading(false);
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

  const nextStep = async () => {
    if (currentStep === 1) {
        if (clientFound) {
            // Logic for existing client
            if (!isSmsVerified) {
                toast({ variant: "destructive", title: "Verificación SMS Requerida", description: "Debes verificar el teléfono del cliente para continuar." });
                return;
            }
            setCurrentStep(2);
            return;
        }

        // Logic for new client
        if (!verifiedClientData) {
            toast({ variant: "destructive", title: "Verificación de ID Requerida", description: "Debes completar la verificación de identidad del cliente." });
            return;
        }
        if (verifiedClientData && (!email || !phone)) {
           toast({ variant: "destructive", title: "Datos de Contacto Requeridos", description: "Por favor, ingresa el correo y teléfono del nuevo cliente." });
           return;
        }
        
        setLoading(true);
        try {
            // This is a new user, create their document. Using cedula as ID for simplicity in this flow.
            const userDocRef = doc(db, "users", verifiedClientData.cedula!);
            const userData = {
                name: verifiedClientData.name,
                cedula: verifiedClientData.cedula,
                email: email,
                phone: phone,
                address: address, // Save the address
                role: "Cliente",
                status: "Activo",
                since: new Date().toLocaleDateString('es-DO'),
                createdAt: serverTimestamp(),
            }
            await setDoc(userDocRef, userData);
            
            // Set the newly created client as the one for the request
            setClientFound({
                id: userDocRef.id,
                ...userData
            });
            toast({ title: "Cliente Creado", description: "El nuevo cliente ha sido guardado." });
            setCurrentStep(2);
            
        } catch (error) {
            console.error("Error creating new client", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el nuevo cliente." });
        } finally {
            setLoading(false);
        }
    } else {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  }
  
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
    
    if (currentStep !== steps.length) {
        await nextStep();
        return; 
    }
    
    setLoading(true);
    
    if (sigPad.current?.isEmpty()) {
        toast({ variant: "destructive", title: "Firma Requerida", description: "El cliente debe firmar." });
        setLoading(false);
        return;
    }
    
    const finalClient = clientFound;
    if (!finalClient) {
        toast({ variant: "destructive", title: "Error de Cliente", description: "No se han encontrado los datos del cliente para finalizar." });
        setLoading(false);
        return;
    }

    try {
        const requestDocRef = await addDoc(collection(db, "requests"), {
            userId: finalClient.id,
            cedula: finalClient.cedula,
            client: finalClient.name,
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
        
        // Use a separate write for the equipment to avoid batch complexity here
        const equipmentDocRef = doc(collection(db, "equipment"));
        await setDoc(equipmentDocRef, {
            id: equipmentDocRef.id,
            userId: finalClient.id,
            requestId: requestDocRef.id,
            cedula: finalClient.cedula,
            name: itemType === 'phone' ? 'Teléfono' : 'Tablet',
            status: "Financiado",
            progress: 0,
            imageUrl: "https://placehold.co/600x400.png",
            aiHint: itemType,
            details: `Financiamiento creado el ${new Date().toLocaleDateString()}. IMEI: ${imei || 'N/A'}`,
            client: finalClient.name,
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

  const activeClientName = clientFound?.name || verifiedClientData?.name || "Cliente";


  return (
    <div className="max-w-3xl mx-auto">
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
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
               <div className="pt-6">
                <CardTitle>Buscar Cliente por Cédula</CardTitle>
                <div className="flex w-full max-w-sm items-center space-x-2 mt-4">
                    <Input id="cedula" placeholder="00112345678" value={cedulaInput} onChange={handleCedulaChange} disabled={isSearchingClient || !!clientFound}/>
                    <Button type="button" onClick={handleClientSearch} disabled={isSearchingClient || !!clientFound || cedulaInput.length !== 11}>
                       {isSearchingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                       Buscar
                    </Button>
                </div>

                {clientSearchPerformed && (
                    <div className="mt-8">
                        {clientFound ? (
                            <div>
                                <Alert variant="default" className="bg-green-50 border-green-200">
                                    <UserCheck className="h-4 w-4 !text-green-700" />
                                    <AlertTitle className="text-green-800">Cliente Encontrado</AlertTitle>
                                    <AlertDescription className="text-green-900">
                                    Se usarán los datos de <b>{clientFound.name}</b>.
                                    </AlertDescription>
                                </Alert>

                                <Card className="mt-4">
                                  <CardHeader>
                                    <CardTitle>Verificación por SMS</CardTitle>
                                    <CardDescription>
                                        {clientFound.phone 
                                            ? "Envía un código de verificación al teléfono del cliente para continuar."
                                            : "Este cliente no tiene teléfono. Agrégalo para enviar el código."
                                        }
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    <div className="flex w-full max-w-sm items-center space-x-2">
                                      <Input 
                                        type="tel" 
                                        value={existingClientPhone} 
                                        onChange={(e) => setExistingClientPhone(e.target.value)}
                                        placeholder="Ingresa el teléfono"
                                        readOnly={!!clientFound.phone} 
                                      />
                                      {clientFound.phone ? (
                                        <Button type="button" onClick={() => onSendSmsCode(clientFound.phone)} disabled={smsLoading || !!confirmationResult}>
                                            {smsLoading ? <Loader2 className="animate-spin" /> : "Enviar Código"}
                                        </Button>
                                      ) : (
                                         <Button type="button" onClick={handleSaveAndSendSms} disabled={smsLoading || !existingClientPhone}>
                                            {smsLoading ? <Loader2 className="animate-spin" /> : "Guardar y Enviar"}
                                        </Button>
                                      )}
                                    </div>
                                    {confirmationResult && (
                                      <div className="flex w-full max-w-sm items-center space-x-2 pt-2">
                                        <MessageSquare className="text-muted-foreground" />
                                        <Input
                                          id="verification-code"
                                          placeholder="Código de 6 dígitos"
                                          value={verificationCode}
                                          onChange={e => setVerificationCode(e.target.value)}
                                          disabled={isSmsVerified}
                                        />
                                        <Button type="button" onClick={onVerifySmsCode} disabled={smsLoading || isSmsVerified || verificationCode.length !== 6}>
                                          {isSmsVerified ? <CheckCircle /> : "Verificar"}
                                        </Button>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                            </div>
                        ) : (
                             <div>
                                <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                                    <UserPlus className="h-4 w-4 !text-amber-700" />
                                    <AlertTitle className="text-amber-800">Cliente Nuevo</AlertTitle>
                                    <AlertDescription className="text-amber-900">
                                       Este cliente no existe. Completa la verificación de identidad para crearlo.
                                    </AlertDescription>
                                </Alert>
                                
                                {verifiedClientData ? (
                                    <Card className="mt-6">
                                        <CardHeader>
                                            <CardTitle>Completa los Datos del Cliente</CardTitle>
                                            <CardDescription>Ingresa los datos de contacto para el nuevo cliente: <b>{verifiedClientData.name}</b></CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email"><Mail className="inline mr-2"/> Correo Electrónico</Label>
                                                <Input id="email" type="email" placeholder="cliente@correo.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                            </div>
                                             <div className="space-y-2">
                                                <Label htmlFor="phone"><Phone className="inline mr-2"/> Teléfono</Label>
                                                <Input id="phone" type="tel" placeholder="809-555-1234" value={phone} onChange={e => setPhone(e.target.value)} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="address"><Home className="inline mr-2"/> Dirección</Label>
                                                <Input id="address" type="text" placeholder="Calle Principal #123, Santo Domingo" value={address} onChange={e => setAddress(e.target.value)} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="flex flex-col md:flex-row gap-8 pt-6">
                                        <div className="flex-1 space-y-6">
                                            <div className="space-y-2">
                                            <Label htmlFor="id-image">Foto de la Cédula (Frente)</Label>
                                            <Input id="id-image" type="file" accept="image/*" ref={idImageRef} onChange={handleIdImageChange} className="hidden" disabled={!!verificationId}/>
                                                <Button variant="outline" className="w-full" type="button" onClick={() => idImageRef.current?.click()} disabled={!!verificationId}>
                                                    <Camera className="mr-2" /> {idImage ? idImage.name : "Subir Foto"}
                                                </Button>
                                            </div>
                                            {idImageUrl && <img src={idImageUrl} alt="Preview Cédula" className="mt-2 rounded-md border max-h-32 mx-auto" />}
                                            <Button className="w-full" type="button" onClick={handleGenerateQR} disabled={isUploading || !!verificationId}>
                                                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <QrCode className="mr-2" /> Generar QR para Selfie
                                            </Button>
                                        </div>
                                        <div className="flex-1 flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed p-4 min-h-[250px]">
                                            {verificationId ? (
                                                <>
                                                    <h3 className="text-lg font-semibold">Esperando Selfie...</h3>
                                                    <QRCode value={`${window.location.origin}/verify/${verificationId}`} size={128} />
                                                    <Button onClick={handleCheckVerificationStatus} disabled={isCheckingStatus} size="sm" variant="secondary">
                                                        {isCheckingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Verificar Estado
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="text-center text-muted-foreground">
                                                    <QrCode className="mx-auto h-12 w-12" />
                                                    <p className="mt-2 text-sm">El código QR aparecerá aquí.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                             </div>
                        )}
                    </div>
                )}
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
                      <p>En {format(requestDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}, se celebra este contrato entre <strong>ALZA C.A.</strong> y el cliente <strong>{activeClientName}</strong> con C.I. <strong>{clientFound?.cedula || verifiedClientData?.cedula}</strong>.</p>
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
              <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {currentStep < steps.length ? <>Siguiente <ChevronRight className="ml-2" /></> : <>Completar Solicitud <CheckCircle className="ml-2" /></>}
              </Button>
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

