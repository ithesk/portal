
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

const steps = [
  { id: 1, title: "Verificación de Identidad" },
  { id: 2, title: "Verificación Telefónica" },
  { id: 3, title: "Detalles del Financiamiento" },
  { id: 4, title: "Enlace MDM" },
  { id: 5, title: "Contrato y Firma" },
];

export default function NewRequestPage() {
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
    <div className="max-w-3xl mx-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                <CardTitle>Identificación del Cliente</CardTitle>
                <CardDescription>
                  Ingresa el número de cédula del solicitante y sube las fotos
                  requeridas.
                </CardDescription>
                <div className="space-y-2">
                  <Label htmlFor="cedula">Número de Cédula</Label>
                  <Input id="cedula" placeholder="V-12.345.678" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Foto de la Cédula (Frente)</Label>
                  <Button variant="outline" className="w-full">
                    <Camera className="mr-2" /> Subir o Tomar Foto
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Selfie del Cliente</Label>
                  <Button variant="outline" className="w-full">
                    <Camera className="mr-2" /> Subir o Tomar Foto
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Phone className="h-12 w-12 text-primary" />
              <CardTitle>Verificación Telefónica</CardTitle>
              <CardDescription className="max-w-md">
                Ingresa el número de teléfono del cliente para enviar un código
                de verificación.
              </CardDescription>
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input type="tel" placeholder="Número de teléfono" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
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
                    onValueChange={(value) => setInitialPercentage(value[0])}
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
            <div className="flex flex-col items-center justify-center text-center space-y-4">
                <Smartphone className="h-12 w-12 text-primary" />
                <CardTitle>Enlace con Sistema MDM</CardTitle>
                <CardDescription className="max-w-md">
                    Ingresa el IMEI del equipo para vincularlo a nuestro sistema de control y seguridad. Puedes escanear el código de barras de la caja.
                </CardDescription>
                <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input id="imei" placeholder="Ingresa el IMEI del equipo" />
                    <Button variant="outline" size="icon">
                        <ScanLine className="h-5 w-5" />
                        <span className="sr-only">Escanear IMEI</span>
                    </Button>
                </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
               <div>
                <CardTitle className="flex items-center mb-4">
                    <FileSignature className="mr-2" /> Contrato de Financiamiento
                </CardTitle>
                <div className="border rounded-lg p-4 h-[350px] overflow-y-auto text-sm space-y-4 bg-muted/50">
                    <p>En {format(requestDate, "dd 'de' MMMM 'de' yyyy")}, se celebra este contrato entre <strong>ALZA C.A.</strong> y el cliente con C.I. <strong>V-12.345.678</strong>.</p>
                    <p>El cliente solicita el financiamiento de un <strong>{itemType === 'phone' ? 'Teléfono' : 'Tablet'}</strong> valorado en <strong>${itemValue.toFixed(2)}</strong>.</p>
                    <p>El cliente se compromete a pagar una inicial de <strong>${initialPayment.toFixed(2)}</strong> ({initialPercentage}%) en la fecha de hoy.</p>
                    <p>El monto restante de <strong>${financingAmount.toFixed(2)}</strong> más los intereses aproximados de <strong>${totalInterest.toFixed(2)}</strong> será pagado en <strong>{installments} cuotas quincenales</strong> de aproximadamente <strong>${biweeklyPayment.toFixed(2)}</strong> cada una.</p>
                    
                    <div>
                        <h4 className="font-semibold mb-2">Calendario de Pagos (Estimado):</h4>
                        <ul className="list-disc pl-5">
                            {paymentDates.map((date, i) => (
                                <li key={i}>Cuota {i+1}: {date}</li>
                            ))}
                        </ul>
                    </div>
                     <p className="pt-4">La falta de pago resultará en el bloqueo del equipo con IMEI <strong>358494081234567</strong> a través del sistema MDM.</p>
                </div>
               </div>
               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <CardTitle>Firma del Cliente</CardTitle>
                     <Button variant="ghost" size="sm" onClick={clearSignature}>
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
                    />
                 </div>
                 <Button className="w-full">
                    <CheckCircle className="mr-2" /> Aceptar y Firmar Contrato
                 </Button>
               </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2" /> Anterior
              </Button>
            )}
             {currentStep === 5 && (
                 <Button variant="ghost" asChild>
                    <Link href="/internal/requests">Cancelar</Link>
                </Button>
             )}
          </div>
          <div>
            {currentStep < steps.length && (
              <Button onClick={nextStep}>
                Siguiente <ChevronRight className="ml-2" />
              </Button>
            )}
            {currentStep === steps.length && (
              <Button asChild>
                <Link href="/internal/requests">
                    <CheckCircle className="mr-2" /> Completar Solicitud
                </Link>
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
