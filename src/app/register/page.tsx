
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
import { doc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
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
    if (!cedula) {
        toast({
            variant: "destructive",
            title: "Cédula requerida",
            description: "Por favor, ingresa tu número de cédula.",
        });
        return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });
      
      const batch = writeBatch(db);

      const userData = {
        name: name,
        email: email,
        cedula: cedula,
        phone: phone,
        role: "Cliente", 
        createdAt: new Date().toISOString(),
      };
      
      const userDocRef = doc(db, "users", user.uid);
      batch.set(userDocRef, userData);

      // Search for unlinked equipment with the same cedula
      const equipmentQuery = query(collection(db, "equipment"), where("cedula", "==", cedula), where("userId", "==", null));
      const equipmentSnapshot = await getDocs(equipmentQuery);

      if (!equipmentSnapshot.empty) {
          equipmentSnapshot.forEach(doc => {
              const equipmentDocRef = doc.ref;
              batch.update(equipmentDocRef, { userId: user.uid, client: name });
          });
          toast({
              title: "¡Equipo vinculado!",
              description: "Hemos encontrado y vinculado tu equipo financiado a tu nueva cuenta.",
          });
      }
      
      await batch.commit();
      
      router.push('/dashboard');
      
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Error de registro",
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
          <CardTitle className="text-2xl font-bold">Crea tu Cuenta</CardTitle>
          <CardDescription>
            Ingresa tus datos para registrarte y ver el estado de tu solicitud.
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
                    placeholder="000-0000000-0" 
                    required 
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                />
            </div>
             <div className="grid gap-2">
                <Label htmlFor="phone">Número de Teléfono</Label>
                <Input 
                    id="phone" 
                    type="tel"
                    placeholder="809-555-1234" 
                    required 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>
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
