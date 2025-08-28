
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MobileNavProps {
    items: {
        href: string;
        label: string;
        icon: React.ElementType;
    }[]
}

export function MobileNav({ items }: MobileNavProps) {
    const pathname = usePathname();
    
    // Divide items for layout
    const leftItems = items.slice(0, 2);
    const rightItems = items.slice(2);

    return (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t shadow-[0_-1px_4px_rgba(0,0,0,0.05)]">
            <div className="grid h-full grid-cols-[1fr_1fr_auto_1fr_1fr] items-center justify-center text-muted-foreground">
                {leftItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 p-2 transition-colors",
                                isActive ? "text-primary font-medium" : "hover:text-primary"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="text-xs">{item.label}</span>
                        </Link>
                    )
                })}
                
                {/* Placeholder for the central FAB */}
                <div className="w-16"></div>

                {rightItems.map((item) => {
                     const isActive = pathname === item.href;
                     return (
                         <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 p-2 transition-colors",
                                isActive ? "text-primary font-medium" : "hover:text-primary"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="text-xs">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
