
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

export default function SettingsPage() {
  const [interestRate, setInterestRate] = useState(12.68);
  const [initialPercentage, setInitialPercentage] = useState([30, 70]);
  const [installments, setInstallments] = useState([3, 7]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Financiamiento</CardTitle>
          <CardDescription>
            Ajusta los parámetros globales para los cálculos de financiamiento.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interest-rate">Tasa de Interés Quincenal (%)</Label>
              <Input
                id="interest-rate"
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Rango de Porcentaje de Inicial</Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={initialPercentage}
              onValueChange={setInitialPercentage}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{initialPercentage[0]}%</span>
              <span>{initialPercentage[1]}%</span>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Rango de Cuotas Quincenales</Label>
            <Slider
              min={1}
              max={12}
              step={1}
              value={installments}
              onValueChange={setInstallments}
            />
             <div className="flex justify-between text-sm text-muted-foreground">
              <span>{installments[0]} Cuotas</span>
              <span>{installments[1]} Cuotas</span>
            </div>
          </div>
        </CardContent>
        <CardHeader className="pt-0">
             <Button>Guardar Cambios</Button>
        </CardHeader>
      </Card>
    </div>
  );
}
