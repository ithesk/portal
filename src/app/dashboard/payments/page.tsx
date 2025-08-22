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

const payments = [
  {
    id: "PAY001",
    date: "2024-06-30",
    amount: "$250.00",
    method: "Transferencia Bancaria",
    status: "Completado",
    equipment: "Excavadora CAT 320D",
  },
  {
    id: "PAY002",
    date: "2024-06-25",
    amount: "$150.00",
    method: "Tarjeta de Crédito",
    status: "Completado",
    equipment: "Compactadora Wacker",
  },
  {
    id: "PAY003",
    date: "2024-05-30",
    amount: "$250.00",
    method: "Transferencia Bancaria",
    status: "Completado",
    equipment: "Excavadora CAT 320D",
  },
  {
    id: "PAY004",
    date: "2024-05-25",
    amount: "$150.00",
    method: "Tarjeta de Crédito",
    status: "Completado",
    equipment: "Compactadora Wacker",
  },
  {
    id: "PAY005",
    date: "2024-04-30",
    amount: "$250.00",
    method: "Transferencia Bancaria",
    status: "Completado",
    equipment: "Excavadora CAT 320D",
  },
    {
    id: "PAY006",
    date: "2024-04-25",
    amount: "$150.00",
    method: "Tarjeta de Crédito",
    status: "Completado",
    equipment: "Compactadora Wacker",
  },
  {
    id: "PAY007",
    date: "2024-03-15",
    amount: "$500.00",
    method: "Transferencia Bancaria",
    status: "Reembolsado",
    equipment: "Camión Volquete",
  },
];

export default function PaymentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Pagos</CardTitle>
        <CardDescription>
          Un registro detallado de todos sus pagos realizados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                ID Pago
              </TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="hidden sm:table-cell font-medium">
                  {payment.id}
                </TableCell>
                <TableCell className="font-medium">{payment.equipment}</TableCell>
                <TableCell>{payment.method}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      payment.status === "Completado" ? "outline" : "secondary"
                    }
                  >
                    {payment.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {payment.date}
                </TableCell>
                <TableCell className="text-right">{payment.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
