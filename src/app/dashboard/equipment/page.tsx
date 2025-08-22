import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const equipment = [
  {
    name: "Excavadora CAT 320D",
    status: "Financiamiento Activo",
    progress: 45,
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "construction excavator",
    details: "Próximo pago: $250.00 el 30/07/2024",
  },
  {
    name: "Compactadora Wacker",
    status: "Financiamiento Activo",
    progress: 80,
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "compactor construction",
    details: "Próximo pago: $150.00 el 25/07/2024",
  },
  {
    name: "Camión Volquete Volvo",
    status: "Pagado",
    progress: 100,
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "dump truck",
    details: "Financiamiento completado el 15/03/2024",
  },
  {
    name: "Grúa Grove RT540E",
    status: "En Proceso",
    progress: 0,
    imageUrl: "https://placehold.co/600x400.png",
    aiHint: "mobile crane",
    details: "Aprobación de financiamiento pendiente",
  },
];

export default function EquipmentPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Estado del Equipo</h1>
        <p className="text-muted-foreground">
          Revise el estado de financiamiento de su equipo.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {equipment.map((item) => (
          <Card key={item.name}>
            <CardHeader className="p-0">
              <div className="relative h-48 w-full">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover rounded-t-lg"
                  data-ai-hint={item.aiHint}
                />
              </div>
               <div className="p-6 pb-2">
                <Badge
                  variant={item.status === "Pagado" ? "default" : "secondary"}
                  className="mb-2"
                >
                  {item.status}
                </Badge>
                <CardTitle>{item.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="mb-4">
                <Progress value={item.progress} aria-label={`${item.progress}% pagado`} />
                <p className="text-sm text-muted-foreground mt-2">{item.progress}% pagado</p>
              </div>
            </CardContent>
            <CardFooter>
               <p className="text-sm text-muted-foreground">{item.details}</p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
