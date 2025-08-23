
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyButton } from "../ui/copy-button";
import { Banknote, Landmark } from "lucide-react";

interface PaymentInstructionsDialogProps {
    children: React.ReactNode;
    referenceCode?: string;
}

export function PaymentInstructionsDialog({ children, referenceCode }: PaymentInstructionsDialogProps) {

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-6 w-6" /> Cómo Realizar tu Pago
          </DialogTitle>
          <DialogDescription>
            Sigue estas instrucciones para procesar tu pago de forma segura.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div>
                <h3 className="font-semibold text-lg mb-2">Paso 1: Datos para Transferencia</h3>
                <div className="text-sm space-y-2 rounded-md border p-4 bg-muted/50">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Banco:</span>
                        <span className="font-medium">Banco Popular Dominicano</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo de Cuenta:</span>
                        <span className="font-medium">Cuenta Corriente</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Número de Cuenta:</span>
                        <span className="font-medium">801-123456-7</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Beneficiario:</span>
                        <span className="font-medium">ALZA, SRL</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">RNC:</span>
                        <span className="font-medium">1-30-12345-6</span>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-lg mb-2">Paso 2: Código de Referencia</h3>
                <p className="text-sm text-muted-foreground mb-3">
                    Es **muy importante** que incluyas tu número de cédula como referencia o concepto del pago para que podamos identificarlo.
                </p>
                <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="link" className="sr-only">
                            Código de Referencia
                        </Label>
                        <Input
                        id="link"
                        defaultValue={referenceCode || "Tu-Cédula"}
                        readOnly
                        />
                    </div>
                    <CopyButton valueToCopy={referenceCode || ""} />
                </div>
            </div>

             <div>
                <h3 className="font-semibold text-lg mb-2">Paso 3: Notificación</h3>
                <p className="text-sm text-muted-foreground">
                    Una vez realizada la transferencia, tu pago se reflejará en el sistema en un plazo de 24 a 48 horas laborables. Recibirás una notificación por correo electrónico cuando se haya aplicado a tu cuenta.
                </p>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
