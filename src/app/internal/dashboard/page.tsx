
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
import { Users, Wrench, DollarSign, Activity, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function InternalDashboard() {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clientes Activos</CardDescription>
            <CardTitle className="text-4xl">73</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              +5% desde el mes pasado
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Equipos Financiados</CardDescription>
            <CardTitle className="text-4xl">124</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              +10 equipos este mes
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pagos Procesados (Mes)</CardDescription>
            <CardTitle className="text-4xl">$125,832</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              75 transacciones
            </div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardDescription>Solicitudes Pendientes</CardDescription>
            <CardTitle className="text-4xl">5</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              3 nuevas hoy
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader className="px-7">
             <div className="flex justify-between items-center">
              <div>
                <CardTitle>Actividad Reciente del Sistema</CardTitle>
                <CardDescription>
                  Un resumen de las últimas acciones importantes en la plataforma.
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/internal/requests">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nueva Solicitud
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Acción
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Estado
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Gestor 1</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      gestor1@alza.com
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    Aprobación de Crédito
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className="text-xs" variant="outline">
                      Completada
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    2024-07-20
                  </TableCell>
                  <TableCell className="text-right">Cliente ID: 54321</TableCell>
                </TableRow>
                <TableRow>
                   <TableCell>
                    <div className="font-medium">Sistema</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      -
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    Pago Recibido
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                     <Badge className="text-xs" variant="outline">
                      Automático
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    2024-07-20
                  </TableCell>
                  <TableCell className="text-right">Pago ID: PAY088</TableCell>
                </TableRow>
                 <TableRow>
                  <TableCell>
                    <div className="font-medium">Nuevo Cliente</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      cliente.nuevo@constructora.com
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    Registro de Cuenta
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className="text-xs" variant="secondary">
                      Pendiente Verificación
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    2024-07-19
                  </TableCell>
                  <TableCell className="text-right">Cliente ID: 54322</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
