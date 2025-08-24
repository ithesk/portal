
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import {
  Users,
  Home,
  LogOut,
  User,
  PanelLeft,
  Wrench,
  FileText,
  Package,
  Cog,
  Loader,
  UserCog,
  Calculator,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LogoIcon } from "@/components/shared/logo";


export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, loading, error] = useAuthState(auth);
  const isAuthPage = pathname === '/internal/login' || pathname === '/internal/register';
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);


  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.push('/internal/login');
    }
  }, [user, loading, router, isAuthPage]);


  const navItems = [
    { href: "/internal/dashboard", icon: Home, label: "Resumen" },
    { href: "/internal/requests", icon: FileText, label: "Solicitudes" },
    { href: "/internal/clients", icon: Users, label: "Clientes" },
    { href: "/internal/equipment", icon: Wrench, label: "Equipos" },
    { href: "/internal/products", icon: Package, label: "Productos" },
    { href: "/internal/calculator", icon: Calculator, label: "Calculadora" },
    { href: "/internal/users", icon: UserCog, label: "Usuarios" },
    { href: "/internal/settings", icon: Cog, label: "Configuración" },
  ];

  if (loading && !isAuthPage) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader className="h-12 w-12 animate-spin" />
      </div>
    );
  }
  
  if (!user && !isAuthPage) {
    return null;
  }
  
  if (isAuthPage) {
      return <>{children}</>;
  }

  return (
    <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
        {user && (
            <>
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
                <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
                    <Link
                    href="/internal/dashboard"
                    className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
                    >
                    <LogoIcon className="h-4 w-4 transition-all group-hover:scale-110" />
                    <span className="sr-only">Alza</span>
                    </Link>
                    <TooltipProvider>
                    {navItems.map((item) => (
                        <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                            <Link
                            href={item.href}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 ${
                                pathname.startsWith(item.href)
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            >
                            <item.icon className="h-5 w-5" />
                            <span className="sr-only">{item.label}</span>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                    ))}
                    </TooltipProvider>
                </nav>
                <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="overflow-hidden rounded-full"
                        >
                            <Avatar>
                            <AvatarImage src="https://placehold.co/32x32.png" alt="@gestor" data-ai-hint="person portrait" />
                            <AvatarFallback>G</AvatarFallback>
                            </Avatar>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="right">
                        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setIsProfileDialogOpen(true)}>
                                <User className="mr-2 h-4 w-4" />
                                <span>Perfil</span>
                            </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => auth.signOut()}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </nav>
                </aside>

            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    <Sheet>
                    <SheetTrigger asChild>
                        <Button size="icon" variant="outline" className="sm:hidden">
                        <PanelLeft className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="sm:max-w-xs">
                        <nav className="grid gap-6 text-lg font-medium">
                        <Link
                            href="/internal/dashboard"
                            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                        >
                            <LogoIcon className="h-5 w-5 transition-all group-hover:scale-110" />
                            <span className="sr-only">Alza</span>
                        </Link>
                        {navItems.map((item) => (
                            <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 px-2.5 ${
                                pathname.startsWith(item.href)
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                            </Link>
                        ))}
                        </nav>
                    </SheetContent>
                    </Sheet>
                    <div className="relative ml-auto flex-1 md:grow-0">
                    <h1 className="text-xl font-semibold sm:block">
                        {navItems.find(item => pathname.startsWith(item.href))?.label}
                    </h1>
                    </div>
                </header>
                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                {children}
                </main>
            </div>
            </>
        )}
        </div>
         <DialogContent>
            <DialogHeader>
                <DialogTitle>Perfil de Usuario</DialogTitle>
                <DialogDescription>
                Información de la cuenta de {user?.email}.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <p><strong>Nombre:</strong> {user?.displayName || "No disponible"}</p>
                <p><strong>Email:</strong> {user?.email}</p>
            </div>
        </DialogContent>
    </Dialog>
  );
}
