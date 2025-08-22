
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const equipment = [
  {
    id: "CAT320D-01",
    name: "Excavadora CAT 320D",
    client: "Constructora XYZ",
    status: "Financiado",
  },
  {
    id: "WACKER-01",
    name: "Compactadora Wacker",
    client: "Constructora XYZ",
    status: "Financiado",
  },
  {
    id: "VOLVO-DUMP-01",
    name: "Camión Volquete Volvo",
    client: "Ingeniería ABC",
    status: "Pagado",
  },
   {
    id: "GROVE-RT540E-01",
    name: "Grúa Grove RT540E",
    client: "Ingeniería ABC",
    status: "En Proceso",
  },
];

export default function InternalEquipmentPage() {
  return (
     <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Equipos</CardTitle>
                <CardDescription>
                Consulta el inventario de equipos y su estado.
                </CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Equipo
            </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por ID, nombre, o cliente..." className="pl-8" />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Equipo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Cliente Asignado</TableHead>
              <TableHead className="text-right">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipment.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.client}</TableCell>
                <TableCell className="text-right">
                   <Badge
                    variant={
                      item.status === "Pagado" ? "default" 
                      : item.status === "Financiado" ? "outline"
                      : "secondary"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
