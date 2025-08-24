
"use client";

import Image from 'next/image';

export const LogoIcon = (props: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'>) => (
    <Image
        src="/logo.svg"
        alt="Alza Logo"
        width={props.width || 40}
        height={props.height || 40}
        {...props}
    />
);
