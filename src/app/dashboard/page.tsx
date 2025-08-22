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
import { Calendar, CreditCard, DollarSign } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Actual</CardDescription>
            <CardTitle className="text-4xl">$5,231.89</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              +10% desde el mes pasado
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Próximo Pago</CardDescription>
            <CardTitle className="text-4xl">$250.00</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Vence el 30 de Julio, 2024
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Equipo Financiado</CardDescription>
            <CardTitle className="text-4xl">3</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              2 activos, 1 pagado
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Último Pago</CardDescription>
            <CardTitle className="text-4xl">$250.00</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Recibido el 30 de Junio, 2024
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader className="px-7">
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Un resumen de sus pagos y actividades recientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Tipo
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Estado
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Pago Mensual</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      Excavadora CAT 320D
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className="text-xs" variant="outline">
                      Completado
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    2024-06-30
                  </TableCell>
                  <TableCell className="text-right">$250.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Próximo Pago Programado</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      Excavadora CAT 320D
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className="text-xs" variant="secondary">
                      Pendiente
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    2024-07-30
                  </TableCell>
                  <TableCell className="text-right">$250.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Pago Mensual</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      Compactadora Wacker
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className="text-xs" variant="outline">
                      Completado
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    2024-06-25
                  </TableCell>
                  <TableCell className="text-right">$150.00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
