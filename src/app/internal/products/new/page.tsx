
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";


export default function NewProductPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState("");
    const [status, setStatus] = useState("Borrador");
    const [price, setPrice] = useState("");
    const [initialPayment, setInitialPayment] = useState("");
    const [biweeklyPayment, setBiweeklyPayment] = useState("");
    const [stock, setStock] = useState(0);
    const [popular, setPopular] = useState(false);
    const [imageUrl, setImageUrl] = useState("https://placehold.co/400x400.png");
    const [aiHint, setAiHint] = useState("");
    const [description, setDescription] = useState("");
    
    const imageUrlInputRef = useRef<HTMLInputElement>(null);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!name || !price || !initialPayment) {
            toast({
                variant: "destructive",
                title: "Campos Incompletos",
                description: "Por favor, completa todos los campos requeridos.",
            });
            setLoading(false);
            return;
        }

        try {
            await addDoc(collection(db, "products"), {
                name,
                status,
                price: parseFloat(price),
                initialPayment: parseFloat(initialPayment),
                biweeklyPayment: parseFloat(biweeklyPayment),
                stock,
                popular,
                imageUrl,
                aiHint,
                description,
                currency: "RD$",
                createdAt: new Date().toISOString(),
            });

            toast({
                title: "Producto Creado",
                description: "El nuevo producto ha sido guardado exitosamente.",
            });

            router.push("/internal/products");

        } catch (error: any) {
            console.error("Error al crear el producto:", error);
            toast({
                variant: "destructive",
                title: "Error al crear producto",
                description: "Hubo un problema al guardar en la base de datos: " + error.message,
            });
        } finally {
            setLoading(false);
        }
    };


  return (
    <form onSubmit={handleSubmit}>
      <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
          <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Producto</CardTitle>
                <CardDescription>
                  Ingresa la información principal del equipo a financiar.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="name">Nombre del Producto</Label>
                  <Input
                    id="name"
                    type="text"
                    className="w-full"
                    placeholder="Ej: iPhone 15 Pro"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="description">Descripción (Opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe brevemente el producto..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-3">
                        <Label htmlFor="price">Precio Total (RD$)</Label>
                        <Input
                            id="price"
                            type="number"
                            placeholder="50000"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="initialPayment">Inicial Mínimo (RD$)</Label>
                        <Input
                            id="initialPayment"
                            type="number"
                            placeholder="15000"
                            value={initialPayment}
                            onChange={(e) => setInitialPayment(e.target.value)}
                        />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-3">
                        <Label htmlFor="biweeklyPayment">Cuota Quincenal (RD$)</Label>
                        <Input
                            id="biweeklyPayment"
                            type="number"
                            placeholder="1500"
                            value={biweeklyPayment}
                            onChange={(e) => setBiweeklyPayment(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-3">
                         <Label htmlFor="stock">Inventario</Label>
                         <Input
                            id="stock"
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                         />
                    </div>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Imagen del Producto</CardTitle>
                    <CardDescription>
                        Sube o enlaza la imagen principal para este producto.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="grid gap-2">
                    <Image
                        alt="Product image"
                        className="aspect-square w-full rounded-md object-contain border"
                        height="300"
                        src={imageUrl}
                        width="300"
                        data-ai-hint={aiHint || 'product image'}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" type="button" onClick={() => imageUrlInputRef.current?.focus()}>
                            <Upload className="mr-2 h-4 w-4" />
                            Subir
                        </Button>
                         <Input
                            id="imageUrl"
                            type="text"
                            placeholder="O pega una URL de imagen"
                            value={imageUrl.startsWith('https://placehold.co') ? '' : imageUrl}
                            onChange={(e) => setImageUrl(e.target.value || 'https://placehold.co/400x400.png')}
                            ref={imageUrlInputRef}
                         />
                    </div>
                     <div className="grid gap-3 mt-4">
                        <Label htmlFor="aiHint">Pista para IA (2 palabras max)</Label>
                        <Input
                            id="aiHint"
                            type="text"
                            placeholder="Ej: smartphone silver"
                            value={aiHint}
                            onChange={(e) => setAiHint(e.target.value)}
                        />
                    </div>
                </div>
                </CardContent>
            </Card>
          </div>
          <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Estado del Producto</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status" aria-label="Seleccionar estado">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Borrador">Borrador</SelectItem>
                      <SelectItem value="Publicado">Publicado</SelectItem>
                      <SelectItem value="Archivado">Archivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Categorización</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Switch id="popular" checked={popular} onCheckedChange={setPopular} />
                        <Label htmlFor="popular">Marcar como Popular</Label>
                    </div>
                     <CardDescription className="mt-2">
                        Los productos populares se destacan en la página principal.
                    </CardDescription>
                </CardContent>
            </Card>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 md:hidden">
            <Button variant="outline" size="sm" asChild>
                <Link href="/internal/products">Descartar</Link>
            </Button>
            <Button size="sm" type="submit" disabled={loading}>
                 {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Producto
            </Button>
        </div>
         <div className="hidden items-center justify-end gap-2 md:flex">
             <Button variant="outline" asChild>
                <Link href="/internal/products">Descartar</Link>
            </Button>
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Producto
            </Button>
        </div>
      </div>
    </form>
  );
}
