import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, LifeBuoy } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-6 w-6" /> Preguntas Frecuentes (FAQ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  ¿Cómo puedo realizar un pago?
                </AccordionTrigger>
                <AccordionContent>
                  Puede realizar pagos a través de transferencia bancaria,
                  tarjeta de crédito/débito directamente desde la sección de
                  "Pagos" en su portal.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                  ¿Qué sucede si me atraso en un pago?
                </AccordionTrigger>
                <AccordionContent>
                  Si prevé un retraso en su pago, por favor contáctenos lo
                  antes posible para discutir las opciones disponibles. Pueden
                  aplicarse cargos por pago tardío según su contrato.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>
                  ¿Puedo pagar mi equipo por adelantado?
                </AccordionTrigger>
                <AccordionContent>
                  Sí, puede realizar pagos adicionales o liquidar el saldo
                  restante en cualquier momento sin penalizaciones. Póngase en
                  contacto con nuestro equipo de soporte para obtener el monto
                  exacto de liquidación.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>
                  ¿Cómo actualizo mi información de contacto?
                </AccordionTrigger>
                <AccordionContent>
                  Puede actualizar su información de contacto yendo a la
                  sección "Mi Perfil" en su cuenta.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-start gap-4">
              <Phone className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Teléfono</h3>
                <p className="text-muted-foreground">
                  Para soporte inmediato, llámenos.
                </p>
                <Button variant="link" asChild className="p-0 h-auto">
                   <a href="tel:+1-555-123-4567">+1 (555) 123-4567</a>
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Mail className="h-6 w-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold">Correo Electrónico</h3>
                <p className="text-muted-foreground">
                  Para consultas no urgentes.
                </p>
                 <Button variant="link" asChild className="p-0 h-auto">
                   <a href="mailto:soporte@alza.com">soporte@alza.com</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
