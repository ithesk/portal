
"use client";

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
import { PlusCircle, Search, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const products = [
  {
    id: "iphone-15",
    name: "iPhone 15",
    status: "Publicado",
    imageUrl: "https://placehold.co/64x64.png",
    aiHint: "iphone 15 white",
    price: "45,000",
    initialPayment: "13,500",
    stock: 25,
  },
  {
    id: "samsung-galaxy-s24",
    name: "Samsung Galaxy S24",
    status: "Publicado",
    imageUrl: "https://placehold.co/64x64.png",
    aiHint: "samsung galaxy s24",
    price: "40,000",
    initialPayment: "12,000",
    stock: 15,
  },
  {
    id: "ipad-air",
    name: "iPad Air",
    status: "Borrador",
    imageUrl: "https://placehold.co/64x64.png",
    aiHint: "ipad air",
    price: "60,000",
    initialPayment: "18,000",
    stock: 0,
  },
   {
    id: "xiaomi-redmi-note-13",
    name: "Xiaomi Redmi Note 13",
    status: "Publicado",
    imageUrl: "https://placehold.co/64x64.png",
    aiHint: "xiaomi redmi note 13",
    price: "28,000",
    initialPayment: "8,000",
    stock: 50,
  },
];


export default function ProductsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Productos</CardTitle>
                <CardDescription>
                Gestiona los equipos que se muestran en la página pública.
                </CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Producto
            </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar producto por nombre..." className="pl-8" />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Imagen</span>
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Precio Total (RD$)</TableHead>
              <TableHead className="hidden md:table-cell">Inicial (RD$)</TableHead>
              <TableHead className="hidden md:table-cell">Inventario</TableHead>
               <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                 <TableCell className="hidden sm:table-cell">
                        <Image
                          alt={product.name}
                          className="aspect-square rounded-md object-contain"
                          height="64"
                          src={product.imageUrl}
                          width="64"
                          data-ai-hint={product.aiHint}
                        />
                      </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant={product.status === "Publicado" ? "outline" : "secondary"}>
                    {product.status}
                  </Badge>
                </TableCell>
                 <TableCell>{product.price}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {product.initialPayment}
                </TableCell>
                <TableCell className="hidden md:table-cell">{product.stock}</TableCell>
                <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
