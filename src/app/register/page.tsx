
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
import { linkEquipmentToUser } from "@/ai/flows/link-equipment-flow";
import { LogoIcon } from "@/components/shared/logo";


export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name || !email || !password || !cedula) {
        toast({
            variant: "destructive",
            title: "Campos requeridos",
            description: "Por favor, completa todos los campos para registrarte."
        });
        setLoading(false);
        return;
    }
    
    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Update Auth profile
      await updateProfile(user, { displayName: name });

      // 3. Create user document in Firestore
      const userData = {
        name,
        email,
        cedula,
        phone,
        role: "Cliente",
        status: "Activo",
        since: new Date().toLocaleDateString('es-DO'),
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", user.uid), userData);

      // 4. Call the Genkit flow to link equipment (secure server-side operation)
      const linkResult = await linkEquipmentToUser({ userId: user.uid, cedula });

      if (linkResult.success && linkResult.linkedCount > 0) {
          toast({
              title: "¡Equipo vinculado!",
              description: `Hemos encontrado y vinculado ${linkResult.linkedCount} equipo(s) a tu cuenta.`,
          });
      }
      
      // 5. Redirect to dashboard
      router.push('/dashboard');

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            toast({
                variant: "destructive",
                title: "Correo ya registrado",
                description: "Este correo electrónico ya está en uso. Por favor, inicia sesión o utiliza otro correo.",
            });
        } else {
            console.error("¡ERROR! Ocurrió un problema durante el registro:", error);
            toast({
                variant: "destructive",
                title: "Error de registro",
                description: error.message,
            });
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <div className="inline-block mx-auto p-3 rounded-full mb-4">
                <LogoIcon className="h-8 w-8 text-primary" />
            </div>
          <CardTitle className="text-2xl font-bold">Crear tu Cuenta</CardTitle>
          <CardDescription>
            Ingresa tus datos para acceder a tu portal de cliente.
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
              <Label htmlFor="cedula">Cédula de Identidad</Label>
              <Input 
                id="cedula" 
                placeholder="001-1234567-8" 
                required 
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="tu@correo.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="phone">Teléfono (Opcional)</Label>
                    <Input
                        id="phone"
                        type="tel"
                        placeholder="809-555-1234"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>
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
              <Link href="/login" className="underline">
                Inicia Sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
