
"use client";

import { useState } from "react";
import { Button } from "./button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CopyButtonProps {
    valueToCopy: string;
}

export function CopyButton({ valueToCopy }: CopyButtonProps) {
    const [hasCopied, setHasCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(valueToCopy);
        setHasCopied(true);
        toast({ title: "Copiado", description: "El código de referencia se ha copiado." });

        setTimeout(() => {
            setHasCopied(false);
        }, 2000);
    }

    return (
        <Button size="sm" className="px-3" onClick={handleCopy}>
            <span className="sr-only">Copiar</span>
            {hasCopied ? (
                <Check className="h-4 w-4" />
            ) : (
                <Copy className="h-4 w-4" />
            )}
        </Button>
    )
}
