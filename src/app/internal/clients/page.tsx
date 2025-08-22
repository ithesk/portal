
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

const clients = [
  {
    name: "Constructora XYZ",
    contact: "juan.perez@xyz.com",
    status: "Activo",
    since: "2023-01-15",
    equipmentCount: 3,
  },
  {
    name: "Ingeniería ABC",
    contact: "maria.gomez@abc.com",
    status: "Activo",
    since: "2022-11-20",
    equipmentCount: 5,
  },
    {
    name: "Proyectos Delta",
    contact: "carlos.lopez@delta.com",
    status: "Verificación Pendiente",
    since: "2024-07-19",
    equipmentCount: 0,
  },
   {
    name: "Maquinaria Pesada Sol",
    contact: "ana.martinez@sol.com",
    status: "Inactivo",
    since: "2021-05-10",
    equipmentCount: 2,
  },
];

export default function ClientsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>
                Gestiona la información y el estado de los clientes.
                </CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Cliente
            </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente por nombre o contacto..." className="pl-8" />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Cliente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Cliente Desde</TableHead>
              <TableHead className="text-right">Equipos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.name}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.contact}</TableCell>
                <TableCell>
                   <Badge
                    variant={
                      client.status === "Activo" ? "default" 
                      : client.status === "Inactivo" ? "destructive"
                      : "secondary"
                    }
                    className="capitalize"
                  >
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {client.since}
                </TableCell>
                <TableCell className="text-right">{client.equipmentCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
