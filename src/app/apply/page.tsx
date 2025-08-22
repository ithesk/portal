
"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from 'next/navigation'
import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Phone,
  MessageSquare,
  UserPlus,
  Fingerprint,
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


const AlzaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);


const steps = [
  { id: 1, title: "Verificación de Identidad" },
  { id: 2, title: "Verificación Telefónica" },
  { id: 3, title: "Crea tu Cuenta" },
];

function ApplyForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const searchParams = useSearchParams()
  const product = searchParams.get('product')


  const progress = (currentStep / steps.length) * 100;

  const nextStep = () =>
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  

  return (
     <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <div className="mb-6 text-center">
             <div className="inline-block mx-auto bg-primary text-primary-foreground p-3 rounded-full mb-4">
                <AlzaIcon className="h-8 w-8" />
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
              <CardDescription className="max-w-md">
                Ingresa tu número de teléfono para enviar un código
                de verificación.
              </CardDescription>
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input type="tel" placeholder="Tu número de teléfono" />
                <Button>Enviar Código</Button>
              </div>
              <div className="flex w-full max-w-xs items-center space-x-2 pt-4">
                <MessageSquare className="text-muted-foreground" />
                <Input
                  id="verification-code"
                  placeholder="Código de Verificación"
                />
              </div>
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
            {currentStep > 1 && currentStep < 3 && (
              <Button variant="outline" onClick={prevStep}>
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
            {currentStep < 2 && (
              <Button onClick={nextStep}>
                Siguiente <ChevronRight className="ml-2" />
              </Button>
            )}
            {currentStep === 2 && (
              <Button onClick={nextStep}>
                 Finalizar Pre-solicitud <CheckCircle className="ml-2" />
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
                <div className="inline-block mx-auto bg-primary text-primary-foreground p-3 rounded-full mb-4">
                    <AlzaIcon className="h-8 w-8" />
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
