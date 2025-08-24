
"use client";

import { useState } from "react";
import {
  Calculator,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function CalculatorPage() {
  const [itemValue, setItemValue] = useState(12500);
  const [initialPercentage, setInitialPercentage] = useState(40);
  const [installments, setInstallments] = useState(6);

  // --- Lógica de Cálculo Actualizada ---
  const initialPayment = itemValue * (initialPercentage / 100);
  const financingAmount = itemValue - initialPayment;
  const interestRate = 0.525; // 52.5% de interés fijo sobre el monto a financiar
  const totalInterest = financingAmount * interestRate;
  const totalToPayInInstallments = financingAmount + totalInterest;
  const biweeklyPayment = installments > 0 ? totalToPayInInstallments / installments : 0;
  const totalPaid = initialPayment + totalToPayInInstallments;
  // --- Fin de la Lógica de Cálculo ---

  return (
    <Card className="max-w-3xl mx-auto">
        <CardHeader>
            <CardTitle>Calculadora de Financiamiento</CardTitle>
            <CardDescription>
                Usa esta herramienta para simular y desglosar un plan de financiamiento.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
            <div className="space-y-6">
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
                <h3 className="text-lg font-semibold flex items-center">
                <Calculator className="mr-2 h-5 w-5" /> Desglose del Cálculo
                </h3>
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
        </CardContent>
    </Card>
  );
}
