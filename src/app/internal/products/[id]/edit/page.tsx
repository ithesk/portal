
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";


export default function EditProductPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    
    const [product, setProduct] = useState<any>(null);
    const imageUrlInputRef = useRef<HTMLInputElement>(null);

    const { id: productId } = params;

    useEffect(() => {
        if (!productId) return;

        const fetchProduct = async () => {
            try {
                setFetching(true);
                const productRef = doc(db, "products", productId as string);
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                    const data = productSnap.data();
                    setProduct({
                        ...data,
                        price: data.price?.toString() || "",
                        initialPayment: data.initialPayment?.toString() || "",
                        biweeklyPayment: data.biweeklyPayment?.toString() || "",
                        stock: data.stock?.toString() || "0",
                    });
                } else {
                    toast({
                        variant: "destructive",
                        title: "Producto no encontrado",
                        description: "No se pudo encontrar el producto para editar.",
                    });
                    router.push("/internal/products");
                }
            } catch (error: any) {
                console.error("Error fetching product: ", error);
                toast({
                    variant: "destructive",
                    title: "Error al cargar",
                    description: "Hubo un problema al cargar los datos del producto.",
                });
            } finally {
                setFetching(false);
            }
        };

        fetchProduct();
    }, [productId, router, toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setProduct((prev: any) => ({ ...prev, [id]: value }));
    };

    const handleSwitchChange = (checked: boolean) => {
        setProduct((prev: any) => ({ ...prev, popular: checked }));
    };
    
    const handleStatusChange = (value: string) => {
        setProduct((prev: any) => ({ ...prev, status: value }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!product.name || !product.price || !product.initialPayment) {
            toast({
                variant: "destructive",
                title: "Campos Incompletos",
                description: "Por favor, completa todos los campos requeridos.",
            });
            setLoading(false);
            return;
        }

        try {
            const productRef = doc(db, "products", productId as string);
            await updateDoc(productRef, {
                ...product,
                price: parseFloat(product.price),
                initialPayment: parseFloat(product.initialPayment),
                biweeklyPayment: parseFloat(product.biweeklyPayment),
                stock: parseInt(product.stock, 10),
                updatedAt: serverTimestamp(),
            });

            toast({
                title: "Producto Actualizado",
                description: "El producto ha sido actualizado exitosamente.",
            });

            router.push("/internal/products");

        } catch (error: any) {
            console.error("Error al actualizar el producto:", error);
            toast({
                variant: "destructive",
                title: "Error al actualizar",
                description: "Hubo un problema al guardar los cambios: " + error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return <EditProductPageSkeleton />;
    }

  return (
    <form onSubmit={handleSubmit}>
         <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/internal/products">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Atrás</span>
                </Link>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Editar Producto
            </h1>
         </div>
      <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
          <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Producto</CardTitle>
                <CardDescription>
                  Modifica la información principal del equipo a financiar.
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
                    value={product?.name || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="description">Descripción (Opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe brevemente el producto..."
                    value={product?.description || ""}
                    onChange={handleInputChange}
                  />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-3">
                        <Label htmlFor="price">Precio Total (RD$)</Label>
                        <Input
                            id="price"
                            type="number"
                            placeholder="50000"
                            value={product?.price || ""}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="initialPayment">Inicial Mínimo (RD$)</Label>
                        <Input
                            id="initialPayment"
                            type="number"
                            placeholder="15000"
                            value={product?.initialPayment || ""}
                            onChange={handleInputChange}
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
                            value={product?.biweeklyPayment || ""}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="grid gap-3">
                         <Label htmlFor="stock">Inventario</Label>
                         <Input
                            id="stock"
                            type="number"
                            value={product?.stock || "0"}
                            onChange={handleInputChange}
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
                        src={product?.imageUrl || "https://placehold.co/400x400.png"}
                        width="300"
                        data-ai-hint={product?.aiHint || 'product image'}
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
                            value={product?.imageUrl.startsWith('https://placehold.co') ? '' : product?.imageUrl}
                            onChange={(e) => setProduct((prev: any) => ({...prev, imageUrl: e.target.value || 'https://placehold.co/400x400.png'}))}
                            ref={imageUrlInputRef}
                         />
                    </div>
                     <div className="grid gap-3 mt-4">
                        <Label htmlFor="aiHint">Pista para IA (2 palabras max)</Label>
                        <Input
                            id="aiHint"
                            type="text"
                            placeholder="Ej: smartphone silver"
                            value={product?.aiHint || ""}
                            onChange={handleInputChange}
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
                  <Select value={product?.status || "Borrador"} onValueChange={handleStatusChange}>
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
                        <Switch id="popular" checked={product?.popular || false} onCheckedChange={handleSwitchChange} />
                        <Label htmlFor="popular">Marcar como Popular</Label>
                    </div>
                     <CardDescription className="mt-2">
                        Los productos populares se destacan en la página principal.
                    </CardDescription>
                </CardContent>
            </Card>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-8">
             <Button variant="outline" asChild>
                <Link href="/internal/products">Descartar</Link>
            </Button>
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
            </Button>
        </div>
      </div>
    </form>
  );
}

function EditProductPageSkeleton() {
    return (
        <div>
            <div className="flex items-center gap-4 mb-4">
                 <Skeleton className="h-7 w-7 rounded-full" />
                 <Skeleton className="h-7 w-48" />
            </div>
            <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
                <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
                    <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-7 w-1/2" />
                                <Skeleton className="h-5 w-3/4" />
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-20 w-full" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-7 w-1/2" />
                                <Skeleton className="h-5 w-3/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="w-full h-64" />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
                        <Card>
                             <CardHeader>
                                <Skeleton className="h-7 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-10 w-full" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                               <Skeleton className="h-7 w-1/2" />
                           </CardHeader>
                           <CardContent>
                               <Skeleton className="h-10 w-full" />
                           </CardContent>
                       </Card>
                    </div>
                </div>
                 <div className="flex items-center justify-end gap-2 mt-8">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </div>
    );
}
