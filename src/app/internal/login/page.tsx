
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "lucide-react";

const AlzaIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M19 5C15.866 5 13 7.68629 13 11V13C13 16.3137 15.866 19 19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="9" cy="12" r="2" fill="currentColor"/>
    </svg>
);


export default function InternalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/internal/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

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
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="gestor@alza.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader className="animate-spin" /> : 'Iniciar Sesión'}
            </Button>
            <div className="mt-4 text-center text-sm">
                No tienes cuenta?{" "}
                <Link href="/internal/register" className="underline">
                  Crear cuenta
                </Link>
            </div>
            <div className="mt-1 text-center text-sm">
                <Link href="/login" className="underline">
                  Ir al portal de clientes
                </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
