
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Search, AlertCircle, Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { collection, getDocs, query, doc, updateDoc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";


interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  lastLogin: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const [editFormData, setEditFormData] = useState({
      name: "",
      email: "",
      phone: "",
      role: "",
      password: ""
  });


  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const functions = getFunctions();
      const listAllUsers = httpsCallable(functions, 'listAllUsers');
      const result: any = await listAllUsers();

      if (result.data.users) {
        setUsers(result.data.users as User[]);
      } else {
        setError("No se recibieron datos de usuarios.");
      }
      
    } catch (err: any) {
      console.error("Error fetching users: ", err);
      if (err.code === 'permission-denied' || err.message.includes('permission-denied')) {
          setError("No tienes permiso para ver esta información. Solo los administradores pueden ver la lista de usuarios.");
      } else {
          setError("Ocurrió un error al cargar los usuarios.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // We need to wait for the user to be authenticated before calling the function
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchUsers();
      } else {
        // Handle case where user is not logged in, maybe redirect
        setLoading(false);
        setError("Debes iniciar sesión para ver esta página.");
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        password: "" // Always start with empty password
    });
    setIsEditDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditFormData(prev => ({...prev, [id]: value }));
  };

  const handleRoleChange = (value: string) => {
     setEditFormData(prev => ({...prev, role: value }));
  }
  
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setIsUpdating(true);
    try {
      const functions = getFunctions();
      const updateUserByAdmin = httpsCallable(functions, 'updateUserByAdmin');
      
      const payload: any = {
        userId: selectedUser.id,
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        role: editFormData.role,
      };
      
      if (editFormData.password) {
        payload.password = editFormData.password;
      }
      
      const result: any = await updateUserByAdmin(payload);
      
      if (result.data.success) {
        toast({
          title: "Éxito",
          description: `El usuario ${selectedUser.name} ha sido actualizado.`,
        });
        fetchUsers(); // Refresh user list
        setIsEditDialogOpen(false);
      } else {
        throw new Error(result.data.message || "La función falló sin un mensaje de error.");
      }
      
    } catch (err: any) {
      console.error("Error updating user: ", err);
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: err.message || "No se pudo actualizar el usuario.",
      });
    } finally {
      setIsUpdating(false);
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
              <div>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                  <CardDescription>
                  Administra los usuarios del portal interno y sus permisos.
                  </CardDescription>
              </div>
              <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Invitar Usuario
              </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar usuario por nombre o correo..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          {error && !loading && (
              <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Acceso Denegado o Error</AlertTitle>
                  <AlertDescription>
                    {error}
                    {error.includes("permiso") && (
                       <p className="font-mono text-xs mt-2">
                        <b>Solución Rápida:</b> Para asignar un rol de Admin, ve a la Consola de Firebase &gt; Firestore Database &gt; users &gt; (documento de tu usuario) y cambia el campo 'role' a 'Admin'.
                       </p>
                    )}
                  </AlertDescription>
              </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo Electrónico</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="hidden md:table-cell">Último Acceso</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                !error && users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.lastLogin || "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditClick(user)}>Editar Usuario</DropdownMenuItem>
                            <DropdownMenuItem>Reenviar Invitación</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Revocar Acceso</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Usuario: {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario. La contraseña es opcional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nombre</Label>
                <Input id="name" value={editFormData.name} onChange={handleInputChange} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Correo</Label>
                <Input id="email" type="email" value={editFormData.email} onChange={handleInputChange} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Teléfono</Label>
                <Input id="phone" type="tel" value={editFormData.phone} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Rol</Label>
              <div className="col-span-3">
                 <Select value={editFormData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Gestor">Gestor</SelectItem>
                        <SelectItem value="Cliente">Cliente</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                    <div className="flex flex-col items-end">
                       <span>Contraseña</span>
                       <span className="text-xs text-muted-foreground">(Opcional)</span>
                    </div>
                </Label>
                <div className="col-span-3 relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" value={editFormData.password} onChange={handleInputChange} placeholder="Dejar en blanco para no cambiar" className="pl-9" />
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    