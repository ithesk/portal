
"use client";

import Link from "next/link";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FloatingActionButton() {
    return (
        <Button 
            asChild 
            className="sm:hidden fixed bottom-8 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full shadow-lg z-10 bg-primary hover:bg-primary/90"
        >
            <Link href="/dashboard/payments">
                <DollarSign className="h-7 w-7 text-primary-foreground" />
                <span className="sr-only">Registrar Pago</span>
            </Link>
        </Button>
    )
}
