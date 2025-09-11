
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
import { doc, setDoc, serverTimestamp, getDocs, query, where, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, User, Fingerprint, Lock, Phone, Mail, UserCheck, AlertCircle } from "lucide-react";
import { linkEquipmentToUser } from "@/ai/flows/link-equipment-flow";
import { LogoIcon } from "@/components/shared/logo";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getFunctions, httpsCallable } from "firebase/functions";

const steps = [
    { id: 1, title: "Identificación", icon: Fingerprint },
    { id: 2, title: "Datos de Contacto", icon: User },
    { id: 3, title: "Seguridad", icon: Lock },
]

interface ExistingUser {
    id: string; // Firestore document ID, which IS the Auth UID
    name: string;
    email: string;
}


export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [existingUser, setExistingUser] = useState<ExistingUser | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  const handleCedulaCheck = async () => {
    if (!cedula) {
      toast({ variant: "destructive", title: "Cédula requerida", description: "Por favor, ingresa tu cédula." });
      return;
    }
    setIsSearching(true);
    try {
        const q = query(collection(db, "users"), where("cedula", "==", cedula));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const clientDoc = querySnapshot.docs[0];
            const clientData = clientDoc.data();
            
            // **DIAGNÓSTICO**: Verificamos que el ID del documento es el que esperamos
            console.log("Found existing user document. ID:", clientDoc.id, "Data:", clientData);

            setExistingUser({ 
                id: clientDoc.id, // This IS the auth UID
                name: clientData.name, 
                email: clientData.email 
            });
            setName(clientData.name);
            setEmail(clientData.email);
            setPhone(clientData.phone || '');
            setStep(3); // Skip to password step
        } else {
            setExistingUser(null);
            setStep(2); // Proceed to enter details
        }

    } catch (error: any) {
        toast({ variant: "destructive", title: "Error de Búsqueda", description: "No se pudo verificar la cédula." });
    } finally {
        setIsSearching(false);
    }
  }


  const nextStep = () => {
    if (step === 1) {
      handleCedulaCheck();
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

    if (existingUser) {
        // --- Logic for existing user activation ---
        if (!password) {
            toast({ variant: "destructive", title: "Contraseña requerida", description: "Por favor, establece una contraseña." });
            setLoading(false);
            return;
        }

        // **DIAGNÓSTICO**: Log del objeto exacto que se va a enviar
        console.log("Attempting to activate existing user. Sending this object to Cloud Function:", {
            userId: existingUser.id,
            password: "HIDDEN_FOR_LOGS"
        });

        try {
            const functions = getFunctions();
            const updateUserByAdmin = httpsCallable(functions, 'updateUserByAdmin');
            
            // This function requires admin privileges on the backend
            // to set the password for an existing user.
            const result: any = await updateUserByAdmin({
                userId: existingUser.id, // <-- PASS THE CORRECT AUTH UID
                password: password
            });

            if (result.data.success) {
                toast({ title: "Cuenta Activada", description: "Tu contraseña ha sido establecida. Ahora puedes iniciar sesión." });
                router.push('/login');
            } else {
                 throw new Error(result.data.message || 'La función de actualización falló.');
            }


        } catch (error: any) {
            console.error("Error activating account:", error);
            toast({ variant: "destructive", title: "Error de Activación", description: `No se pudo establecer la contraseña: ${error.message}` });
        } finally {
            setLoading(false);
        }

    } else {
        // --- Logic for new user registration ---
         if (!email || !password || !cedula) {
            toast({ variant: "destructive", title: "Faltan datos", description: "Correo, contraseña y cédula son requeridos." });
            setLoading(false);
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, { displayName: name });

            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                name,
                email,
                cedula,
                phone,
                role: "Cliente",
                status: "Activo",
                since: new Date().toLocaleDateString('es-DO'),
                createdAt: serverTimestamp(),
            });

            const linkResult = await linkEquipmentToUser({ userId: user.uid, cedula });
            if (linkResult.success && linkResult.linkedCount > 0) {
                toast({ title: "¡Todo en orden!", description: `Hemos vinculado ${linkResult.linkedCount} equipo(s) a tu cuenta.` });
            }
            
            router.push('/dashboard');

        } catch (error: any) {
             const errorCode = error.code;
             const errorMessage = error.message;
             if (errorCode === 'auth/email-already-in-use') {
                toast({ variant: "destructive", title: "Correo ya registrado", description: "Este correo ya tiene una cuenta. Por favor, inicia sesión.", action: (<Button variant="secondary" size="sm" asChild><Link href="/login">Iniciar Sesión</Link></Button>) });
            } else {
                console.error("Error during registration:", error);
                toast({ variant: "destructive", title: "Error de registro", description: errorMessage });
            }
        } finally {
            setLoading(false);
        }
    }
  };

  const CurrentIcon = steps[step - 1]?.icon || Fingerprint;

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
                    <p className="text-muted-foreground text-sm">Ingresa tu número de identificación para comenzar. Si ya tienes solicitudes, las vincularemos a tu cuenta.</p>
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
                     <Alert>
                        <User className="h-4 w-4" />
                        <AlertTitle>¡Eres nuevo por aquí!</AlertTitle>
                        <AlertDescription>
                            Completa tus datos para crear tu perfil.
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                        <Label htmlFor="name"><User className="inline h-4 w-4 mr-1"/>Nombre Completo</Label>
                        <Input id="name" placeholder="Juan Pérez" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email"><Mail className="inline h-4 w-4 mr-1"/>Correo Electrónico</Label>
                        <Input id="email" type="email" placeholder="tu@correo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone"><Phone className="inline h-4 w-4 mr-1"/>Teléfono</Label>
                        <Input id="phone" type="tel" placeholder="809-555-1234" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 animate-in fade-in-20">
                    {existingUser && (
                        <Alert variant="default" className="bg-green-50 border-green-200">
                            <UserCheck className="h-4 w-4 !text-green-700" />
                            <AlertTitle className="text-green-800">¡Hola, {existingUser.name}!</AlertTitle>
                            <AlertDescription className="text-green-900">
                                Encontramos tu perfil. Tu correo es <b className="break-all">{existingUser.email}</b>. Solo necesitas crear una contraseña para acceder.
                            </AlertDescription>
                        </Alert>
                    )}
                     <div className="space-y-2 text-left pt-2">
                        <Label htmlFor="password"><Lock className="inline h-4 w-4 mr-1"/>Crea tu Contraseña</Label>
                        <Input 
                            id="password" 
                            type="password"
                            placeholder="Elige una contraseña segura"
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
                 <Button onClick={handleRegister} type="button" disabled={loading || isSearching}>
                    {(loading || isSearching) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {step < steps.length ? "Siguiente" : (existingUser ? "Activar Cuenta" : "Finalizar Registro")}
                    {step < steps.length && !loading && !isSearching && <ChevronRight className="ml-2" />}
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
