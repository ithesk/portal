
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import {
  DollarSign,
  Home,
  LogOut,
  User,
  PanelLeft,
  Wrench,
  LifeBuoy,
  Loader,
  FileText,
  WifiOff,
  LayoutGrid,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoIcon } from "@/components/shared/logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MobileNav } from "@/components/shared/mobile-nav";
import { FloatingActionButton } from "@/components/shared/fab";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, loading, error] = useAuthState(auth);
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
    }

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { href: "/dashboard", icon: LayoutGrid, label: "Resumen" },
    { href: "/dashboard/requests", icon: FileText, label: "Mis Solicitudes" },
    { href: "/dashboard/equipment", icon: Wrench, label: "Equipo" },
    { href: "/dashboard/payments", icon: DollarSign, label: "Pagos" },
  ];

  const mobileNavItems = [
     ...navItems,
     { href: "/dashboard/profile", icon: User, label: "Perfil" },
  ]
  
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader className="h-12 w-12 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/dashboard"
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
                      pathname === item.href
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
           <TooltipProvider>
             <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/support"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 text-muted-foreground hover:text-foreground`}
                  >
                    <LifeBuoy className="h-5 w-5" />
                    <span className="sr-only">Soporte</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Soporte</TooltipContent>
              </Tooltip>
           </TooltipProvider>
        </nav>
      </aside>
      <div className="flex flex-col sm:pl-14">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <div className="sm:hidden">
                 <Link
                    href="/dashboard"
                    className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
                >
                    <LogoIcon className="h-4 w-4 transition-all group-hover:scale-110" />
                    <span className="sr-only">Alza</span>
                </Link>
            </div>
            <h1 className="text-xl font-semibold hidden sm:block">
              {navItems.find(item => item.href === pathname)?.label || 'Mi Cuenta'}
            </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="overflow-hidden rounded-full ml-auto"
              >
                 <Avatar>
                  <AvatarImage src={user.photoURL || undefined} alt={`@${user.displayName}`} />
                  <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/support">
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    <span>Soporte</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => auth.signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 pb-24 sm:pb-4">
           {isOffline && (
            <Alert variant="destructive" className="mb-4">
              <WifiOff className="h-4 w-4" />
              <AlertTitle>Sin Conexión a Internet</AlertTitle>
              <AlertDescription>
                No tienes conexión. Algunas funcionalidades pueden no estar disponibles.
              </AlertDescription>
            </Alert>
          )}
          {children}
        </main>
        {/* Mobile Navigation */}
        <FloatingActionButton />
        <MobileNav items={mobileNavItems} />
      </div>
    </div>
  );
}
