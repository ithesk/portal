

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
import { Check, X, Filter, PlusCircle } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

const requests = [
  {
    id: "REQ-001",
    client: "Proyectos Delta",
    type: "Solicitud de Financiamiento",
    date: "2024-07-19",
    status: "Pendiente de Aprobación",
  },
  {
    id: "REQ-002",
    client: "Constructora XYZ",
    type: "Ampliación de Límite",
    date: "2024-07-18",
    status: "En Revisión",
  },
    {
    id: "REQ-003",
    client: "Ingeniería ABC",
    type: "Solicitud de Nuevo Equipo",
    date: "2024-07-15",
    status: "Aprobado",
  },
     {
    id: "REQ-004",
    client: "Maquinaria Pesada Sol",
    type: "Reactivación de Cuenta",
    date: "2024-07-12",
    status: "Rechazado",
  },
];

export default function RequestsPage() {
  return (
    <Card>
      <CardHeader>
         <div className="flex justify-between items-center">
            <div>
                <CardTitle>Solicitudes</CardTitle>
                <CardDescription>
                Revisa y gestiona las solicitudes de los clientes.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Filtrar por Estado
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Estado</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Todas</DropdownMenuItem>
                        <DropdownMenuItem>Pendiente de Aprobación</DropdownMenuItem>
                        <DropdownMenuItem>En Revisión</DropdownMenuItem>
                        <DropdownMenuItem>Aprobado</DropdownMenuItem>
                        <DropdownMenuItem>Rechazado</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button asChild>
                  <Link href="/internal/requests/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva Solicitud
                  </Link>
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead>ID Solicitud</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo de Solicitud</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">{req.id}</TableCell>
                <TableCell>{req.client}</TableCell>
                <TableCell>{req.type}</TableCell>
                 <TableCell className="hidden md:table-cell">{req.date}</TableCell>
                <TableCell>
                   <Badge
                    variant={
                      req.status === "Aprobado" ? "default" 
                      : req.status === "Rechazado" ? "destructive"
                      : "secondary"
                    }
                  >
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                {req.status === "Pendiente de Aprobación" && (
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <Check className="h-4 w-4" />
                        </Button>
                         <Button variant="destructive" size="icon" className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

    