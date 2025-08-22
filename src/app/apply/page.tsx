
"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  CheckCircle,
  Phone,
  MessageSquare,
  Smartphone,
  Tablet,
  Calculator,
  ScanLine,
  FileSignature,
  Trash2,
  UserPlus,
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
  { id: 3, title: "Detalles del Financiamiento" },
  { id: 4, title: "Contrato y Firma" },
  { id: 5, title: "Finalizar y Registrarse" },
];

export default function ApplyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [itemType, setItemType] = useState<string | undefined>();
  const [itemValue, setItemValue] = useState(500);
  const [initialPercentage, setInitialPercentage] = useState(30);
  const [installments, setInstallments] = useState(6);
  const [requestDate] = useState(new Date());
  const sigPad = useRef<SignatureCanvas>(null);

  const initialPayment = itemValue * (initialPercentage / 100);
  const financingAmount = itemValue - initialPayment;
  const interestRate = 0.1268;
  const totalInterest = financingAmount * interestRate;
  const totalToPay = financingAmount + totalInterest;
  const biweeklyPayment = financingAmount > 0 ? totalToPay / installments : 0;

  const paymentDates = Array.from({ length: installments }, (_, i) => {
    const date = new Date(requestDate);
    date.setDate(date.getDate() + (i + 1) * 15);
    return format(date, "dd/MM/yyyy");
  });

  const progress = (currentStep / steps.length) * 100;

  const nextStep = () =>
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  
  const clearSignature = () => {
    sigPad.current?.clear();
  };


  return (
     <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <div className="mb-6 text-center">
             <div className="inline-block mx-auto bg-primary text-primary-foreground p-3 rounded-full mb-4">
                <AlzaIcon className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">Solicitud de Financiamiento</h1>
            <p className="text-muted-foreground">Sigue los pasos para completar tu solicitud.</p>
        </div>
      <Card className="w-full max-w-3xl">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
              <div className="space-y-4">
                <CardTitle>Tu Identificación</CardTitle>
                <CardDescription>
                  Ingresa tu número de cédula y sube las fotos requeridas.
                </CardDescription>
                <div className="space-y-2">
                  <Label htmlFor="cedula">Número de Cédula</Label>
                  <Input id="cedula" placeholder="V-12.345.678" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Foto de tu Cédula (Frente)</Label>
                  <Button variant="outline" className="w-full">
                    <Camera className="mr-2" /> Subir o Tomar Foto
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Tómate una Selfie</Label>
                  <Button variant="outline" className="w-full">
                    <Camera className="mr-2" /> Subir o Tomar Foto
                  </Button>
                </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
              <div className="space-y-4">
                <CardTitle>Detalles del Artículo</CardTitle>
                <CardDescription>
                  Selecciona el tipo de artículo e ingresa su valor de mercado.
                </CardDescription>
                <div className="space-y-2">
                  <Label htmlFor="item-type">Tipo de Artículo</Label>
                  <Select onValueChange={setItemType} value={itemType}>
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

                {itemType === 'phone' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone-brand">Marca del Teléfono</Label>
                      <Select>
                        <SelectTrigger id="phone-brand">
                          <SelectValue placeholder="Selecciona una marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apple">Apple</SelectItem>
                          <SelectItem value="samsung">Samsung</SelectItem>
                          <SelectItem value="xiaomi">Xiaomi</SelectItem>
                          <SelectItem value="other">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                     <div className="space-y-4 pt-2">
                        <Label htmlFor="installments">Cuotas: {installments} Quincenales</Label>
                        <Slider
                          id="installments"
                          min={3}
                          max={7}
                          step={1}
                          value={[installments]}
                          onValueChange={(value) => setInstallments(value[0])}
                        />
                      </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="item-value">Valor del Artículo ($)</Label>
                  <Input
                    id="item-value"
                    type="number"
                    placeholder="Ej: 500"
                    value={itemValue || ""}
                    onChange={(e) => setItemValue(parseFloat(e.target.value) || 0)}
                  />
                </div>
                 <div className="space-y-4 pt-4">
                  <Label htmlFor="initial-percentage">Porcentaje de Inicial: {initialPercentage}%</Label>
                  <Slider
                    id="initial-percentage"
                    min={30}
                    max={100}
                    step={5}
                    value={[initialPercentage]}
                    onValue-Change={(value) => setInitialPercentage(value[0])}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <CardTitle className="flex items-center">
                  <Calculator className="mr-2 h-5 w-5" /> Cálculo de Financiamiento
                </CardTitle>
                <div className="rounded-lg border bg-muted p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Valor del Artículo:</span>
                    <span className="font-medium">${itemValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inicial ({initialPercentage}%):</span>
                    <span className="font-medium">${initialPayment.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base border-t pt-2">
                    <span>Monto a Financiar:</span>
                    <span>${financingAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cuotas:</span>
                    <span>{installments} Quincenales</span>
                  </div>
                   <div className="flex justify-between text-muted-foreground">
                    <span>Total Intereses (Aprox.):</span>
                    <span>${totalInterest.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg text-primary border-t pt-2 mt-2">
                    <span>Cuota Quincenal Aprox:</span>
                    <span>${biweeklyPayment.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
               <div>
                <CardTitle className="flex items-center mb-4">
                    <FileSignature className="mr-2" /> Contrato de Financiamiento
                </CardTitle>
                <div className="border rounded-lg p-4 h-[350px] overflow-y-auto text-sm space-y-4 bg-muted/50">
                    <p>En {format(requestDate, "dd 'de' MMMM 'de' yyyy")}, certifico que la información proporcionada es correcta y acepto los términos del financiamiento.</p>
                    <p>Solicito el financiamiento de un <strong>{itemType === 'phone' ? 'Teléfono' : 'Tablet'}</strong> valorado en <strong>${itemValue.toFixed(2)}</strong>.</p>
                    <p>Me comprometo a pagar una inicial de <strong>${initialPayment.toFixed(2)}</strong> ({initialPercentage}%) en la fecha de la compra.</p>
                    <p>El monto restante de <strong>${financingAmount.toFixed(2)}</strong> más los intereses aproximados de <strong>${totalInterest.toFixed(2)}</strong> será pagado en <strong>{installments} cuotas quincenales</strong> de aproximadamente <strong>${biweeklyPayment.toFixed(2)}</strong> cada una.</p>
                    
                    <div>
                        <h4 className="font-semibold mb-2">Calendario de Pagos (Estimado):</h4>
                        <ul className="list-disc pl-5">
                            {paymentDates.map((date, i) => (
                                <li key={i}>Cuota {i+1}: {date}</li>
                            ))}
                        </ul>
                    </div>
                     <p className="pt-4">Entiendo que la falta de pago resultará en el bloqueo del equipo a través del sistema de seguridad.</p>
                </div>
               </div>
               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <CardTitle>Tu Firma</CardTitle>
                     <Button variant="ghost" size="sm" onClick={clearSignature}>
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Limpiar
                     </Button>
                 </div>
                 <CardDescription>Firma en el recuadro para aceptar los términos.</CardDescription>
                 <div className="w-full h-48 bg-white rounded-lg border-2 border-dashed">
                    <SignatureCanvas
                        ref={sigPad}
                        penColor="black"
                        canvasProps={{ className: "w-full h-full" }}
                    />
                 </div>
               </div>
            </div>
          )}

           {currentStep === 5 && (
             <div className="flex flex-col items-center justify-center text-center space-y-4 pt-6">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <CardTitle className="text-2xl">¡Solicitud Enviada!</CardTitle>
                <CardDescription className="max-w-md">
                    Tu solicitud ha sido recibida y está siendo procesada. Nuestro equipo se pondrá en contacto contigo pronto.
                </CardDescription>
                <CardDescription className="max-w-lg font-semibold pt-4">
                    Para dar seguimiento al estado de tu solicitud, por favor crea una cuenta en nuestro portal.
                </CardDescription>
                <Button size="lg" asChild>
                    <Link href="/register">
                        <UserPlus className="mr-2" /> Crear Cuenta y ver Estado
                    </Link>
                </Button>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div>
            {currentStep > 1 && currentStep < 5 && (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2" /> Anterior
              </Button>
            )}
             {currentStep === 1 && (
                 <Button variant="ghost" asChild>
                    <Link href="/login">Ya tengo una cuenta</Link>
                </Button>
             )}
          </div>
          <div>
            {currentStep < 4 && (
              <Button onClick={nextStep}>
                Siguiente <ChevronRight className="ml-2" />
              </Button>
            )}
            {currentStep === 4 && (
              <Button onClick={nextStep}>
                <CheckCircle className="mr-2" /> Enviar Solicitud
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
        <div className="mt-4 text-center text-sm">
            <Link href="/internal/login" className="underline text-muted-foreground">
                Acceso Interno
            </Link>
        </div>
    </div>
  );
}
