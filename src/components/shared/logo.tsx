"use client";

import * as React from 'react';

export const LogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    // Copia y pega el contenido de tu archivo logo.svg aquí, reemplazando esta etiqueta <svg>.
    // Asegúrate de que los atributos `width` y `height` se eliminen o se establezcan en "100%" o "24"
    // para permitir que el tamaño se controle dinámicamente.
    // Atributos como `fill="currentColor"` permitirán que el color del logo cambie con el tema.
    <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        {...props}
    >
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
        <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="currentColor"/>
        <path d="M2 12L12 17L22 12L12 7L2 12Z" fill="currentColor"/>
    </svg>
);
