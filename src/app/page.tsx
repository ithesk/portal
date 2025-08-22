
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";


const AlzaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

interface Product {
    id: string;
    name: string;
    popular: boolean;
    imageUrl: string;
    aiHint: string;
    initialPayment: string;
    biweeklyPayment: string;
    totalPrice: string;
    currency: string;
}


export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("status", "==", "Publicado"));
        const querySnapshot = await getDocs(q);
        
        const productsData = querySnapshot.docs
          .map((doc: QueryDocumentSnapshot<DocumentData>) => {
              const data = doc.data();
              return {
                  id: doc.id,
                  name: data.name || "",
                  popular: data.popular || false,
                  imageUrl: data.imageUrl || "https://placehold.co/400x400.png",
                  aiHint: data.aiHint || "product image",
                  initialPayment: data.initialPayment || "0",
                  biweeklyPayment: data.biweeklyPayment || "0",
                  totalPrice: data.price || "0",
                  currency: data.currency || "RD$",
              };
          });
          
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-muted/40 p-4">
      <div className="my-8 text-center">
         <div className="inline-block mx-auto bg-primary text-primary-foreground p-3 rounded-full mb-4">
            <AlzaIcon className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold">Elige tu Equipo</h1>
        <p className="text-muted-foreground text-lg mt-2">Financiamiento fácil y rápido con Alza.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
        {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="flex flex-col">
                    <CardHeader className="p-0 relative">
                         <div className="w-full aspect-square relative">
                             <Skeleton className="h-full w-full" />
                         </div>
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
                {product.popular && (
                    <Badge variant="secondary" className="absolute top-4 right-4 bg-yellow-400 text-yellow-900">MÁS POPULAR</Badge>
                )}
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
       <div className="mt-8 text-center text-sm">
            <Link href="/login" className="underline text-muted-foreground">
                ¿Ya tienes una cuenta? Inicia Sesión
            </Link>
             <span className="text-muted-foreground mx-2">|</span>
             <Link href="/internal/login" className="underline text-muted-foreground">
                Acceso Interno
            </Link>
        </div>
    </div>
  );
}
