
"use client";

import { useState } from "react";
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

const steps = [
  { id: 1, title: "Verificación de Identidad" },
  { id: 2, title: "Verificación Telefónica" },
  { id: 3, title: "Detalles del Financiamiento" },
  { id: 4, title: "Confirmación" },
];

export default function NewRequestPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [itemValue, setItemValue] = useState(0);
  const [initialPercentage, setInitialPercentage] = useState(30);

  const initialPayment = itemValue * (initialPercentage / 100);
  const financingAmount = itemValue - initialPayment;
  const interestRate = 0.1268;
  const totalInterest = financingAmount * interestRate * 6;
  const totalToPay = financingAmount + totalInterest;
  const biweeklyPayment = financingAmount > 0 ? totalToPay / 6 : 0;

  const progress = (currentStep / steps.length) * 100;

  const nextStep = () =>
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

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
        <CardContent className="min-h-[400px]">
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
                  <Select>
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
                    <span>6 Quincenales</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tasa de Interés:</span>
                    <span>12.68% Quincenal</span>
                  </div>
                   <div className="flex justify-between text-muted-foreground">
                    <span>Total Intereses:</span>
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
              <CheckCircle className="h-16 w-16 text-green-500" />
              <CardTitle className="text-3xl">Solicitud Lista</CardTitle>
              <CardDescription className="max-w-md">
                Se ha completado el formulario de solicitud. Revisa la
                información y envíala para su procesamiento.
              </CardDescription>
              <div className="rounded-lg border bg-card p-4 text-left w-full max-w-md">
                <h3 className="font-semibold mb-2">Resumen</h3>
                 <p><strong>Cliente:</strong> V-12.345.678</p>
                 <p><strong>Teléfono:</strong> +58 412-1234567</p>
                 <p><strong>Artículo:</strong> Teléfono</p>
                 <p><strong>Valor:</strong> ${itemValue.toFixed(2)}</p>
                 <p><strong>Inicial:</strong> ${initialPayment.toFixed(2)}</p>
                 <p><strong>Cuota Quincenal:</strong> ${biweeklyPayment.toFixed(2)}</p>
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
             {currentStep === 4 && (
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
                    <CheckCircle className="mr-2" /> Enviar Solicitud
                </Link>
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
