
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, CheckCircle, AlertTriangle } from "lucide-react";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { LogoIcon } from "@/components/shared/logo";


export default function VerifyPage() {
    const { id: verificationId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'initial' | 'camera' | 'preview' | 'uploading' | 'completed' | 'error'>('initial');
    const [verificationStatus, setVerificationStatus] = useState<'pending' | 'validating' | 'not_found'>('validating');
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);

    // Check if verification document exists
    useEffect(() => {
        const checkVerificationDoc = async () => {
            if (!verificationId) {
                console.log("DEBUG: No verificationId found in URL.");
                setVerificationStatus('not_found');
                return;
            }
            console.log(`DEBUG: Checking for verificationId: ${verificationId}`);
            
            try {
                const docRef = doc(db, "verifications", verificationId as string);
                const docSnap = await getDoc(docRef);

                console.log(`DEBUG: Firestore document exists? -> ${docSnap.exists()}`);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    console.log("DEBUG: Document data:", data);
                    if (data.status === 'pending-selfie') {
                        setVerificationStatus('pending');
                    } else {
                        console.log(`DEBUG: Document status is '${data.status}', not 'pending-selfie'. Setting to not_found.`);
                        setVerificationStatus('not_found');
                    }
                } else {
                    setVerificationStatus('not_found');
                }
            } catch (error) {
                console.error("DEBUG: Error fetching verification document:", error);
                setVerificationStatus('not_found');
            }
        };
        checkVerificationDoc();
    }, [verificationId]);
    

    const startCamera = useCallback(async () => {
        setStep('camera');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            toast({ variant: "destructive", title: "Error de Cámara", description: "No se pudo acceder a la cámara. Revisa los permisos." });
            setStep('error');
        }
    }, [toast]);

    const takePicture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, canvas.width, canvas.height);
            setSelfieDataUrl(canvas.toDataURL('image/jpeg'));
            stopCamera();
            setStep('preview');
        }
    };
    
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const handleConfirmSelfie = async () => {
        if (!selfieDataUrl || !verificationId) return;

        setLoading(true);
        setStep('uploading');
        
        try {
            // 1. Upload selfie to storage
            const storage = getStorage();
            const storageRef = ref(storage, `verifications/${verificationId}/selfie.jpg`);
            await uploadString(storageRef, selfieDataUrl, 'data_url');
            const selfieUrl = await getDownloadURL(storageRef);

            // 2. Update verification document
            const docRef = doc(db, "verifications", verificationId as string);
            await updateDoc(docRef, {
                selfieUrl: selfieUrl,
                status: 'pending-verification'
            });

            // 3. Trigger server-side verification via Cloud Function
            const functions = getFunctions();
            // Ensure you use the correct region if your function is not in us-central1
            // const functions = getFunctions(getApp(), 'your-region'); 
            const runIdentityCheck = httpsCallable(functions, 'runIdentityCheck');
            const result = await runIdentityCheck({ verificationId: verificationId as string });
            
            console.log("Cloud Function result:", result);
            setStep('completed');
            toast({ title: "¡Gracias!", description: "Tu verificación ha sido enviada. Puedes cerrar esta ventana." });
            
        } catch (error: any) {
            console.error("Error in handleConfirmSelfie:", error);
            const errorMessage = error.message || "No se pudo enviar tu selfie.";
            toast({ variant: "destructive", title: "Error", description: errorMessage });
            setStep('error');
        } finally {
            setLoading(false);
        }
    };
    
     if (verificationStatus === 'validating') {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
                 <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 <p className="mt-4 text-muted-foreground">Validando enlace...</p>
            </div>
        );
    }
    
    if (verificationStatus === 'not_found') {
        return (
             <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4 text-center">
                 <AlertTriangle className="h-12 w-12 text-destructive" />
                 <h1 className="mt-4 text-2xl font-bold">Enlace no válido o expirado</h1>
                 <p className="mt-2 text-muted-foreground">Este enlace de verificación no es válido o ya ha sido utilizado. Por favor, solicita al gestor que genere un nuevo QR.</p>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                     <div className="inline-block mx-auto p-3 rounded-full mb-4">
                        <LogoIcon className="h-12 w-12" />
                    </div>
                    <CardTitle>Verificación de Identidad</CardTitle>
                    <CardDescription>
                        Necesitamos una foto de tu rostro para completar la solicitud.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 'initial' && (
                        <div className="space-y-4 py-8">
                            <p>Para proteger tu cuenta, necesitamos verificar que eres tú. Por favor, permítenos usar tu cámara para tomar una selfie.</p>
                            <Button size="lg" onClick={startCamera}>
                                <Camera className="mr-2"/> Iniciar Cámara
                            </Button>
                        </div>
                    )}
                    
                    {step === 'camera' && (
                        <div className="space-y-4">
                            <video ref={videoRef} className="w-full aspect-square rounded-md object-cover" autoPlay playsInline muted/>
                            <Button size="lg" className="w-full" onClick={takePicture}>Tomar Foto</Button>
                        </div>
                    )}
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    
                    {step === 'preview' && selfieDataUrl && (
                        <div className="space-y-4">
                            <img src={selfieDataUrl} alt="Tu selfie" className="w-full rounded-md"/>
                            <p>¿Se ve bien la foto?</p>
                            <div className="flex gap-4 justify-center">
                                <Button variant="outline" onClick={startCamera}>Tomar de Nuevo</Button>
                                <Button onClick={handleConfirmSelfie} disabled={loading}>Confirmar y Enviar</Button>
                            </div>
                        </div>
                    )}

                    {(step === 'uploading' || loading) && (
                         <div className="flex flex-col items-center justify-center space-y-4 py-12">
                           <Loader2 className="h-12 w-12 animate-spin text-primary" />
                           <p className="text-muted-foreground">Procesando, por favor espera...</p>
                        </div>
                    )}
                    
                    {step === 'completed' && (
                         <div className="flex flex-col items-center justify-center space-y-4 py-12 text-green-600">
                           <CheckCircle className="h-16 w-16" />
                           <h2 className="text-2xl font-bold">¡Verificación Enviada!</h2>
                           <p className="text-muted-foreground">Tu información ha sido enviada al gestor. Ya puedes cerrar esta ventana.</p>
                        </div>
                    )}

                     {step === 'error' && (
                         <div className="flex flex-col items-center justify-center space-y-4 py-12 text-destructive">
                           <AlertTriangle className="h-16 w-16" />
                           <h2 className="text-2xl font-bold">Ocurrió un Error</h2>
                           <p className="text-muted-foreground">No se pudo completar el proceso. Por favor, intenta de nuevo o contacta al gestor.</p>
                             <Button onClick={() => setStep('initial')}>Intentar de nuevo</Button>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
