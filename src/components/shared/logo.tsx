
"use client";

import * as React from 'react';

export const LogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="500" viewBox="0 0 375 374.999991" height="500" preserveAspectRatio="xMidYMid meet" version="1.2" {...props}>
        <defs>
            <clipPath id="ceaa8b3a5b"><path d="M 31.28125 31.28125 L 343.71875 31.28125 L 343.71875 343.71875 L 31.28125 343.71875 Z M 31.28125 31.28125 "/></clipPath>
            <clipPath id="a84c9745ca"><path d="M 104.496094 104.496094 L 270.246094 104.496094 L 270.246094 270.246094 L 104.496094 270.246094 Z M 104.496094 104.496094 "/></clipPath>
            <clipPath id="dbd6234f02"><path d="M 187.5 104.496094 C 141.65625 104.496094 104.496094 141.65625 104.496094 187.5 C 104.496094 233.339844 141.65625 270.503906 187.5 270.503906 C 233.339844 270.503906 270.503906 233.339844 270.503906 187.5 C 270.503906 141.65625 233.339844 104.496094 187.5 104.496094 Z M 187.5 104.496094 "/></clipPath>
            <clipPath id="e688dd576a"><path d="M 153.3125 181.25 L 188.601562 181.25 L 188.601562 216.542969 L 153.3125 216.542969 Z M 153.3125 181.25 "/></clipPath>
            <clipPath id="968fbf7c4b"><path d="M 170.957031 181.25 C 161.210938 181.25 153.3125 189.152344 153.3125 198.898438 C 153.3125 208.640625 161.210938 216.542969 170.957031 216.542969 C 180.703125 216.542969 188.601562 208.640625 188.601562 198.898438 C 188.601562 189.152344 180.703125 181.25 170.957031 181.25 Z M 170.957031 181.25 "/></clipPath>
            <clipPath id="6be2a7af6d"><path d="M 131 53 L 325 53 L 325 277 L 131 277 Z M 131 53 "/></clipPath>
            <clipPath id="56bd0a4b8f"><path d="M 201.929688 53.871094 L 324.097656 227.222656 L 253.757812 276.792969 L 131.59375 103.441406 Z M 201.929688 53.871094 "/></clipPath>
        </defs>
        <g id="0cad2fb03a">
            {/* Background Blue Circle */}
            <circle cx="187.5" cy="187.5" r="156.25" style={{ fill: '#004aad' }} />
            
            {/* Border Light Blue Circle */}
            <circle cx="187.5" cy="187.5" r="156.25" style={{ fill: 'none', stroke: '#509bff', strokeWidth: 8 }} />

            {/* Inner White Circle */}
            <g clipPath="url(#a84c9745ca)">
                <g clipRule="nonzero" clipPath="url(#dbd6234f02)">
                    <path style={{ fill: 'none', strokeWidth: 8, strokeLinecap: 'butt', strokeLinejoin: 'miter', stroke: '#ffffff', strokeOpacity: 1, strokeMiterlimit: 4 }} d="M 110.673242 0.00136615 C 49.548238 0.00136615 0.00136015 49.548244 0.00136015 110.673248 C 0.00136015 171.793044 49.548238 221.345131 110.673242 221.345131 C 171.793038 221.345131 221.345125 171.793044 221.345125 110.673248 C 221.345125 49.548244 171.793038 0.00136615 110.673242 0.00136615 Z M 110.673242 0.00136615 " transform="matrix(0.75,0,0,0.75,104.495074,104.495069)"/>
                </g>
            </g>
            {/* Small white circle */}
            <g clipPath="url(#e688dd576a)">
                <g clipRule="nonzero" clipPath="url(#968fbf7c4b)">
                    <circle cx="170.957031" cy="198.898438" r="17.644531" style={{ fill: '#ffffff' }} />
                </g>
            </g>
            {/* Angled blue shape */}
            <g clipPath="url(#6be2a7af6d)">
                <g clipRule="nonzero" clipPath="url(#56bd0a4b8f)">
                    <path style={{ stroke: 'none', fillRule: 'nonzero', fill: '#004aad', fillOpacity: 1 }} d="M 70.929688 0.871094 L 193.109375 174.246094 L 122.773438 223.8125 L 0.59375 50.441406 Z M 70.929688 0.871094 " transform="matrix(1,0,0,1,131,53)"/>
                </g>
            </g>
        </g>
    </svg>
);
