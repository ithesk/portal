
"use client";

import { useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from 'next/navigation'
import Link from "next/link";
import { getFunctions, httpsCallable } from "firebase/functions";
import "@/lib/firebase"; // Ensure Firebase is initialized

import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Phone,
  MessageSquare,
  UserPlus,
  Fingerprint,
  Loader2,
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
import { Skeleton } from "@/components/ui/skeleton";
import { LogoIcon } from "@/components/shared/logo";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const steps = [
  { id: 1, title: "Verificación de Identidad" },
  { id: 2, title: "Verificación Telefónica" },
  { id: 3, title: "Casi Listo" },
];

function ApplyForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const searchParams = useSearchParams()
  const router = useRouter();
  const { toast } = useToast();
  const product = searchParams.get('product');

  // State for Phone Auth
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);


  const onSendCode = async () => {
      setLoading(true);
      if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber.replace(/\D/g, ''))) {
          toast({ variant: "destructive", title: "Número Inválido", description: "Por favor, ingresa un número de teléfono válido." });
          setLoading(false);
          return;
      }

      try {
          const functions = getFunctions();
          const sendSmsVerification = httpsCallable(functions, 'sendSmsVerification');
          const result: any = await sendSmsVerification({ phoneNumber });
          
          if (result.data.success) {
            setCodeSent(true);
            toast({ title: "Código Enviado", description: "Revisa tus mensajes para ver el código de 6 dígitos." });
          } else {
            throw new Error(result.data.message || 'Error desconocido al enviar SMS.');
          }

      } catch (error: any) {
          console.error("Error sending SMS via Cloud Function:", error);
          toast({ variant: "destructive", title: "Error al Enviar Código", description: error.message });
      } finally {
          setLoading(false);
      }
  };

  const onVerifyCode = async () => {
      setLoading(true);
      if (!phoneNumber || !verificationCode) {
          toast({ variant: "destructive", title: "Error", description: "Por favor, ingresa el código de verificación." });
          setLoading(false);
          return;
      }

      try {
           const functions = getFunctions();
           const verifySmsCode = httpsCallable(functions, 'verifySmsCode');
           const result: any = await verifySmsCode({ phoneNumber, code: verificationCode });

           if (result.data.success) {
             toast({ title: "¡Teléfono Verificado!", description: "Tu número ha sido verificado exitosamente." });
             nextStep();
           } else {
             throw new Error(result.data.message || 'El código es incorrecto.');
           }
      } catch (error: any) {
          console.error("Error verifying code via Cloud Function:", error);
          toast({ variant: "destructive", title: "Código Incorrecto", description: error.message });
      } finally {
          setLoading(false);
      }
  }


  const progress = (currentStep / steps.length) * 100;

  const nextStep = () =>
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  

  return (
     <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <div className="mb-6 text-center">
             <div className="inline-block mx-auto p-3 rounded-full mb-4">
                <LogoIcon className="h-12 w-12" />
            </div>
            <h1 className="text-3xl font-bold">Solicitud de Financiamiento</h1>
            <p className="text-muted-foreground">Estás a pocos pasos de obtener tu equipo: <strong>{product || 'un equipo'}</strong></p>
        </div>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-muted-foreground">
              Paso {currentStep} de {steps.length}: {steps[currentStep - 1].title}
            </h2>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
        <CardContent className="min-h-[300px] flex flex-col justify-center">
          {currentStep === 1 && (
             <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6">
              <Fingerprint className="h-12 w-12 text-primary" />
              <CardTitle>Tu Identificación</CardTitle>
              <CardDescription className="max-w-md">
                Ingresa tu número de cédula para iniciar.
              </CardDescription>
              <div className="w-full max-w-sm">
                  <Label htmlFor="cedula" className="sr-only">Número de Cédula</Label>
                  <Input id="cedula" placeholder="Ingresa tu número de cédula" className="text-center"/>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6">
              <Phone className="h-12 w-12 text-primary" />
              <CardTitle>Verificación Telefónica</CardTitle>
              <CardDescription>
                  Ingresa tu número para enviarte un código de verificación.
              </CardDescription>
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input 
                    type="tel" 
                    placeholder="8091234567" 
                    value={phoneNumber} 
                    onChange={e => setPhoneNumber(e.target.value)}
                    disabled={codeSent}
                />
                <Button type="button" onClick={onSendCode} disabled={loading || codeSent}>
                    {loading ? <Loader2 className="animate-spin" /> : "Enviar Código"}
                </Button>
              </div>
              {codeSent && (
                <div className="flex w-full max-w-xs items-center space-x-2 pt-4">
                    <MessageSquare className="text-muted-foreground" />
                    <Input
                    id="verification-code"
                    placeholder="Código de 6 dígitos"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    />
                </div>
              )}
            </div>
          )}

           {currentStep === 3 && (
             <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <CardTitle className="text-2xl">¡Casi Listo!</CardTitle>
                <CardDescription className="max-w-md">
                   Tu pre-solicitud ha sido recibida. El último paso es crear tu cuenta para completar las validaciones y dar seguimiento al estado de tu financiamiento.
                </CardDescription>
                <Button size="lg" asChild>
                    <Link href="/register">
                        <UserPlus className="mr-2" /> Crear Cuenta y Continuar
                    </Link>
                </Button>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep} disabled={loading}>
                <ChevronLeft className="mr-2" /> Anterior
              </Button>
            )}
             {currentStep === 1 && (
                 <Button variant="ghost" asChild>
                    <Link href="/">Cancelar</Link>
                </Button>
             )}
          </div>
          <div>
            {currentStep === 1 && (
              <Button onClick={nextStep}>
                Siguiente <ChevronRight className="ml-2" />
              </Button>
            )}
            {currentStep === 2 && (
              <Button onClick={onVerifyCode} disabled={loading || !codeSent}>
                 {loading ? <Loader2 className="animate-spin"/> : "Verificar y Continuar"}
                 {!loading && <CheckCircle className="ml-2" />}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
        <div className="mt-4 text-center text-sm">
            <Link href="/login" className="underline text-muted-foreground">
                ¿Ya tienes una cuenta? Inicia Sesión
            </Link>
        </div>
    </div>
  );
}

function ApplyPageFallback() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
            <div className="mb-6 text-center">
                <div className="inline-block mx-auto p-3 rounded-full mb-4">
                    <LogoIcon className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-bold">Solicitud de Financiamiento</h1>
                <Skeleton className="h-6 w-64 mt-2 mx-auto" />
            </div>
            <Card className="w-full max-w-lg">
                <CardHeader>
                  <Skeleton className="h-7 w-48 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="min-h-[300px] flex flex-col justify-center items-center">
                    <Skeleton className="h-48 w-full" />
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-6">
                   <Skeleton className="h-10 w-24" />
                   <Skeleton className="h-10 w-24" />
                </CardFooter>
            </Card>
        </div>
    )
}

export default function ApplyPage() {
    return (
        <Suspense fallback={<ApplyPageFallback />}>
            <ApplyForm />
        </Suspense>
    )
}
