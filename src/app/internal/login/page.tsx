
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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


export default function InternalLoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <div className="inline-block mx-auto bg-primary text-primary-foreground p-3 rounded-full mb-4">
             <AlzaIcon className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Alza - Portal Interno</CardTitle>
          <CardDescription>
            Inicia sesión para gestionar la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="gestor@alza.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              <Input id="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" asChild>
              <Link href="/internal/dashboard">Iniciar Sesión</Link>
            </Button>
            <div className="mt-4 text-center text-sm">
                <Link href="/login" className="underline">
                  Ir al portal de clientes
                </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
