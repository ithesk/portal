
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader, ChevronLeft, ChevronRight, User, Fingerprint, Lock, Phone } from "lucide-react";
import { linkEquipmentToUser } from "@/ai/flows/link-equipment-flow";
import { LogoIcon } from "@/components/shared/logo";
import { Progress } from "@/components/ui/progress";

const steps = [
    { id: 1, title: "Identificación", icon: Fingerprint },
    { id: 2, title: "Datos de Contacto", icon: User },
    { id: 3, title: "Seguridad", icon: Lock },
]

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const nextStep = () => {
    // Add validation before going to the next step
    if (step === 1 && !cedula) {
        toast({ variant: "destructive", title: "Cédula requerida", description: "Por favor, ingresa tu cédula." });
        return;
    }
     if (step === 2 && (!name || !email || !phone)) {
        toast({ variant: "destructive", title: "Campos requeridos", description: "Por favor, completa nombre, correo y teléfono." });
        return;
    }
    setStep(prev => prev + 1);
  }
  const prevStep = () => setStep(prev => prev - 1);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step < steps.length) {
        nextStep();
        return;
    }

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

      // 3. Create user document in Firestore, using the Auth UID as the document ID
      const userDocRef = doc(db, "users", user.uid);
      const userData = {
        name,
        email,
        cedula,
        phone,
        role: "Cliente",
        status: "Activo",
        since: new Date().toLocaleDateString('es-DO'),
        createdAt: serverTimestamp(),
      };
      await setDoc(userDocRef, userData);


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

  const CurrentIcon = steps[step - 1].icon;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <div className="mb-6 text-center">
             <div className="inline-block mx-auto p-3 rounded-full mb-4">
                <LogoIcon className="h-12 w-12" />
            </div>
            <h1 className="text-3xl font-bold">Crear tu Cuenta</h1>
            <p className="text-muted-foreground">Estás a unos pocos pasos de acceder a tu portal.</p>
        </div>
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
           <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-muted-foreground">
              Paso {step} de {steps.length}: {steps[step-1].title}
            </h2>
          </div>
          <Progress value={(step / steps.length) * 100} className="w-full" />
        </CardHeader>
        <CardContent className="min-h-[250px]">
          <form onSubmit={handleRegister} className="grid gap-4 pt-4">
            {step === 1 && (
                 <div className="space-y-4 text-center animate-in fade-in-20">
                    <CurrentIcon className="h-12 w-12 text-primary mx-auto" />
                    <CardTitle>Tu Cédula</CardTitle>
                    <p className="text-muted-foreground text-sm">Comencemos con tu número de identificación.</p>
                    <div className="space-y-2 text-left pt-2">
                        <Label htmlFor="cedula">Cédula de Identidad</Label>
                        <Input 
                            id="cedula" 
                            type="tel"
                            inputMode="numeric"
                            placeholder="001-1234567-8" 
                            required 
                            value={cedula}
                            onChange={(e) => setCedula(e.target.value)}
                        />
                    </div>
                 </div>
            )}
            
            {step === 2 && (
                <div className="space-y-4 animate-in fade-in-20">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input 
                            id="name" 
                            placeholder="Juan Pérez" 
                            required 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="809-555-1234"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
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
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 text-center animate-in fade-in-20">
                    <CurrentIcon className="h-12 w-12 text-primary mx-auto" />
                    <CardTitle>Crea tu Contraseña</CardTitle>
                    <p className="text-muted-foreground text-sm">Elige una contraseña segura para tu cuenta.</p>
                     <div className="space-y-2 text-left pt-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input 
                            id="password" 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
            )}

          </form>
        </CardContent>
         <CardFooter className="flex justify-between border-t pt-6">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={prevStep} type="button">
                  <ChevronLeft className="mr-2" /> Anterior
                </Button>
              )}
            </div>
            <div>
                 <Button onClick={handleRegister} type="button" disabled={loading}>
                    {loading && step === steps.length ? (
                        <Loader className="animate-spin" />
                    ) : (
                        step < steps.length ? <>Siguiente <ChevronRight className="ml-2" /></> : "Crear Cuenta"
                    )}
                 </Button>
            </div>
        </CardFooter>
      </Card>
      <div className="mt-4 text-center text-sm">
        ¿Ya tienes una cuenta?{" "}
        <Link href="/login" className="underline">
            Inicia Sesión
        </Link>
      </div>
    </div>
  );
}
