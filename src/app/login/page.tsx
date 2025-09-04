
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader, Lock, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Set persistence based on the "Remember me" checkbox
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: "Correo o contraseña incorrectos. Por favor, verifica tus datos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Correo Requerido",
        description: "Por favor, ingresa tu correo electrónico para restablecer la contraseña.",
      });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Correo Enviado",
        description: "Revisa tu bandeja de entrada para ver el enlace de restablecimiento de contraseña.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 md:bg-background p-4">
       <div className="w-full max-w-md space-y-8 md:hidden">
         <div>
            <h1 className="text-3xl font-bold">¡Hola de nuevo!</h1>
            <p className="text-muted-foreground">Inicia sesión en tu cuenta</p>
         </div>
          <form onSubmit={handleLogin} className="space-y-6">
             <div className="space-y-4">
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        id="email"
                        type="email"
                        placeholder="Correo Electrónico"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12"
                    />
                </div>
                 <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        id="password" 
                        type="password" 
                        placeholder="Contraseña"
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-12"
                    />
                </div>
             </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-2">
                    <Checkbox id="remember-me-mobile" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(!!checked)} />
                    <label
                        htmlFor="remember-me-mobile"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Recordarme
                    </label>
                </div>
                 <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto font-semibold text-sm"
                    onClick={handlePasswordReset}
                    disabled={loading}
                    >
                    ¿Olvidaste tu contraseña?
                </Button>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
              {loading ? <Loader className="animate-spin" /> : 'Iniciar Sesión'}
            </Button>
             <div className="text-center text-sm">
                ¿No tienes una cuenta?{" "}
                <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Crear Cuenta
                </Link>
            </div>
          </form>
      </div>

      {/* --- Desktop View --- */}
      <Card className="mx-auto max-w-sm w-full hidden md:block">
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tu correo electrónico para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email-desktop">Correo Electrónico</Label>
              <Input
                id="email-desktop"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password-desktop">Contraseña</Label>
                 <Button
                  type="button"
                  variant="link"
                  className="ml-auto inline-block text-sm underline p-0 h-auto"
                  onClick={handlePasswordReset}
                  disabled={loading}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
              <Input 
                id="password-desktop" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
             <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(!!checked)} />
                <label
                    htmlFor="remember-me"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Recordarme
                </label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader className="animate-spin" /> : 'Iniciar Sesión'}
            </Button>
             <div className="mt-4 text-center text-sm">
                ¿No tienes una cuenta?{" "}
                <Link href="/register" className="underline">
                  Crear Cuenta
                </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
