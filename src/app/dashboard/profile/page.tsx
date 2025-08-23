
"use client";

import { useState, useEffect } from "react";
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
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, DocumentData } from "firebase/firestore";
import { Loader, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
    name: string;
    email: string;
    cedula: string;
    phone: string;
}

export default function ProfilePage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            console.log("No such document!");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        } finally {
          setLoadingProfile(false);
        }
      } else if (!loadingAuth) {
         setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user, loadingAuth]);

  if (loadingAuth || loadingProfile) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                         <Skeleton className="h-4 w-24" />
                         <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                         <Skeleton className="h-4 w-24" />
                         <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </CardContent>
             <CardFooter>
                <Skeleton className="h-10 w-32" />
            </CardFooter>
        </Card>
    );
  }

  if (!profile) {
    return <p>No se pudo cargar el perfil.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-6 w-6" /> Tu Perfil
        </CardTitle>
        <CardDescription>
          Esta es tu información personal registrada en el sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre Completo</Label>
          <Input id="name" value={profile.name} readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo Electrónico</Label>
          <Input id="email" type="email" value={profile.email} readOnly />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="cedula">Cédula</Label>
                <Input id="cedula" value={profile.cedula} readOnly />
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" type="tel" value={profile.phone} readOnly />
            </div>
        </div>
      </CardContent>
      <CardFooter>
      </CardFooter>
    </Card>
  );
}
