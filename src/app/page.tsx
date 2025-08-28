
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublicProducts, PublicProduct } from "@/ai/flows/fetch-public-products-flow";
import { LogoIcon } from "@/components/shared/logo";


function DesktopStoreView() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProducts = async () => {
      try {
        setLoading(true);
        const productsData = await fetchPublicProducts();
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products: ", error);
      } finally {
        setLoading(false);
      }
    };
    getProducts();
  }, []);

  return (
    <div className="hidden sm:block">
        <div className="my-8 text-center">
            <div className="inline-block mx-auto p-3 rounded-full mb-4">
                <LogoIcon className="h-12 w-12" />
            </div>
            <h1 className="text-4xl font-bold">Elige tu Equipo</h1>
            <p className="text-muted-foreground text-lg mt-2">Financiamiento fácil y rápido con Alza.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
            {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index} className="flex flex-col">
                        <CardHeader className="p-0 relative">
                            <Skeleton className="w-full aspect-square" />
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-between text-center p-6">
                             <div className="flex-grow space-y-2">
                                <Skeleton className="h-8 w-3/4 mx-auto" />
                                <Skeleton className="h-6 w-1/2 mx-auto" />
                                <Skeleton className="h-6 w-1/2 mx-auto" />
                                <Skeleton className="h-4 w-1/3 mx-auto" />
                            </div>
                            <Skeleton className="h-11 w-full mt-6" />
                        </CardContent>
                    </Card>
                ))
            ) : (
                products.map((product) => (
                    <Card key={product.id} className="flex flex-col">
                        <CardHeader className="p-0 relative">
                            {product.popular && <Badge variant="secondary" className="absolute top-4 right-4 bg-yellow-400 text-yellow-900">MÁS POPULAR</Badge>}
                            <div className="w-full aspect-square relative">
                                <Image src={product.imageUrl} alt={product.name} fill className="object-contain p-8" data-ai-hint={product.aiHint}/>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-between text-center p-6">
                            <div className="flex-grow">
                                <CardTitle className="text-2xl mb-2">{product.name}</CardTitle>
                                <p className="text-lg font-semibold text-green-600">Inicial desde {product.currency} {product.initialPayment}</p>
                                <p className="text-lg font-semibold text-blue-600 mt-1">{product.currency} {product.biweeklyPayment} quincenal</p>
                                <CardDescription className="mt-2">Precio total: {product.currency} {product.totalPrice}</CardDescription>
                            </div>
                            <Button asChild className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white">
                                <Link href={`/apply?product=${encodeURIComponent(product.name)}`}>
                                    Solicitar ahora <ShoppingCart className="ml-2"/>
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    </div>
  )
}

function MobileWelcomeView() {
    return (
        <div className="sm:hidden flex flex-col h-screen w-full bg-background">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <Image
                    src="https://picsum.photos/800/600"
                    alt="Bienvenida a Alza"
                    width={400}
                    height={300}
                    className="w-full max-w-[300px] aspect-[4/3] object-cover rounded-2xl shadow-lg"
                    data-ai-hint="happy people technology"
                />
                <h1 className="text-4xl font-bold mt-8">Adelanta tus metas</h1>
                <p className="text-muted-foreground text-lg mt-2 max-w-xs">
                    El equipo que necesitas, a tu alcance. Financiamiento rápido y seguro.
                </p>
            </div>
            <div className="p-6 space-y-3">
                <Button size="lg" className="w-full h-14 text-lg font-bold" asChild>
                    <Link href="/register">
                        <UserPlus /> Crear Cuenta
                    </Link>
                </Button>
                 <Button size="lg" variant="ghost" className="w-full h-14 text-lg" asChild>
                    <Link href="/login">
                        <LogIn /> Iniciar Sesión
                    </Link>
                </Button>
            </div>
        </div>
    )
}


export default function HomePage() {

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-muted/40 p-4 sm:p-6 md:p-8">
      {/* Mobile View: Welcome Screen */}
      <MobileWelcomeView />
      
      {/* Desktop View: Product Store */}
      <DesktopStoreView />

       <div className="mt-8 text-center text-sm">
             <Link href="/internal/login" className="underline text-muted-foreground">
                Acceso Interno
            </Link>
        </div>
    </div>
  );
}
