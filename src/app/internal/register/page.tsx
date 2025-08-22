
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "lucide-react";


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

export default function InternalRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("Paso 1: Iniciando el proceso de registro para:", email);
    try {
      console.log("Paso 2: Intentando crear usuario en Firebase Authentication...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Paso 3: Usuario creado exitosamente en Authentication. UID:", user.uid);
      
      console.log("Paso 4: Intentando actualizar el perfil del usuario en Auth...");
      await updateProfile(user, { displayName: name });
      console.log("Paso 5: Perfil de Auth actualizado.");

      // Por defecto, los nuevos usuarios son 'Gestor'
      const userData = {
        name: name,
        email: email,
        role: "Gestor", 
        lastLogin: new Date().toISOString().split('T')[0],
      };
      
      console.log("Paso 6: Intentando escribir en Firestore en la ruta 'users/" + user.uid + "' con los datos:", userData);
      await setDoc(doc(db, "users", user.uid), userData);
      
      console.log("Paso 7: ¡Éxito! Documento escrito en Firestore correctamente.");
      router.push('/internal/dashboard');

    } catch (error: any) {
       console.error("¡ERROR! Ocurrió un problema durante el registro:", error);
       toast({
        variant: "destructive",
        title: "Error de registro (ver consola)",
        description: `El error fue: ${error.message}`,
      });
    } finally {
      console.log("Paso 8: Fin del proceso de registro (haya sido exitoso o no).");
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
          <CardTitle className="text-2xl font-bold">Crear Cuenta Interna</CardTitle>
          <CardDescription>
            Ingresa tus datos para registrarte en el portal interno.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input 
                id="name" 
                placeholder="Juan Pérez" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader className="animate-spin" /> : 'Crear Cuenta'}
            </Button>
            <div className="mt-4 text-center text-sm">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/internal/login" className="underline">
                Inicia Sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
