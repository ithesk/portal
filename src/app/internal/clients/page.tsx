
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { PlusCircle, Search, Loader2, MoreHorizontal, Eye, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { collection, getDocs, QueryDocumentSnapshot, DocumentData, addDoc, serverTimestamp, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  contact: string;
  phone?: string;
  status: string;
  since: string;
  equipmentCount: number;
  role?: string;
}

function NewClientDialog({ onClientAdded }: { onClientAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        cedula: ""
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        if (!formData.name || !formData.email || !formData.cedula) {
            toast({
                variant: "destructive",
                title: "Campos requeridos",
                description: "Por favor, completa nombre, correo y cédula."
            });
            setLoading(false);
            return;
        }

        try {
            // Check for duplicate cedula
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("cedula", "==", formData.cedula));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                toast({
                    variant: "destructive",
                    title: "Cédula duplicada",
                    description: "Ya existe un cliente con este número de cédula."
                });
                setLoading(false);
                return;
            }


            await addDoc(collection(db, "users"), {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                cedula: formData.cedula,
                role: "Cliente",
                status: "Activo",
                since: new Date().toLocaleDateString('es-DO'),
                createdAt: serverTimestamp()
            });

            toast({
                title: "Cliente Creado",
                description: "El nuevo cliente ha sido agregado exitosamente."
            });
            onClientAdded();
            setOpen(false);
            setFormData({ name: "", email: "", phone: "", cedula: "" });
        } catch (error: any) {
            console.error("Error creating client: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Hubo un problema al crear el cliente: " + error.message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Cliente
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
                    <DialogDescription>
                        Ingresa los datos del nuevo cliente. El cliente podrá usar su correo para iniciar sesión en el futuro (después de establecer una contraseña).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nombre</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Correo</Label>
                        <Input id="email" type="email" value={formData.email} onChange={handleInputChange} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="cedula" className="text-right">Cédula</Label>
                        <Input id="cedula" value={formData.cedula} onChange={handleInputChange} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Teléfono</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cliente
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editFormData, setEditFormData] = useState({ email: "", phone: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const fetchClients = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "users"));
        const clientsData = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                contact: data.email,
                status: data.status || 'Activo',
                since: data.since || 'N/A',
                equipmentCount: 0, // Placeholder
                ...data,
            }
        }).filter(user => user.role === 'Cliente'); // Only show clients
        setClients(clientsData as Client[]);
      } catch (error) {
        console.error("Error fetching clients: ", error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleEditClick = (client: Client) => {
    setSelectedClient(client);
    setEditFormData({
        email: client.contact,
        phone: client.phone || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditFormData(prev => ({...prev, [id]: value }));
  };

  const handleUpdateSubmit = async () => {
    if (!selectedClient) return;
    setIsUpdating(true);
    try {
        const clientRef = doc(db, "users", selectedClient.id);
        await updateDoc(clientRef, {
            email: editFormData.email,
            contact: editFormData.email, // Assuming contact is email
            phone: editFormData.phone,
        });
        toast({ title: "Cliente Actualizado", description: "La información del cliente ha sido actualizada." });
        setIsEditDialogOpen(false);
        fetchClients(); // Refresh data
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el cliente." });
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
                <CardTitle>Clientes</CardTitle>
                <CardDescription>
                Gestiona la información y el estado de los clientes.
                </CardDescription>
            </div>
            <NewClientDialog onClientAdded={fetchClients} />
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente por nombre o contacto..." className="pl-8" />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Cliente</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Cliente Desde</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium"><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.contact}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        client.status === "Activo" ? "default" 
                        : client.status === "Inactivo" ? "destructive"
                        : "secondary"
                      }
                      className="capitalize"
                    >
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {client.since}
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
                            <DropdownMenuItem asChild>
                                <Link href={`/internal/clients/${client.id}`}>
                                    <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(client)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar Cliente
                            </DropdownMenuItem>
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
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Editar Cliente</DialogTitle>
                <DialogDescription>
                   Modifica la información de contacto de {selectedClient?.name}.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">Correo</Label>
                    <Input id="email" type="email" value={editFormData.email} onChange={handleEditFormChange} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">Teléfono</Label>
                    <Input id="phone" type="tel" value={editFormData.phone} onChange={handleEditFormChange} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleUpdateSubmit} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
