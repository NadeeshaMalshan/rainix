import React, { useEffect, useState } from 'react';

export default function LiquidGlassText2D({ text, className = '' }) {
  // Use a unique ID to prevent conflicts if multiple components render
  const [idSuffix, setIdSuffix] = useState('');
  useEffect(() => {
    setIdSuffix(Math.random().toString(36).substring(2, 9));
  }, []);

  const maskId = `text-mask-${idSuffix}`;
  const filterId = `glass-bevel-${idSuffix}`;

  return (
    // Use inline-flex to auto-size the container to exactly the width of the invisible text
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      
      {/* Definitions for Mask and 3D Bevel Filters */}
      <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none z-0 overflow-visible">
        <defs>
          <mask id={maskId}>
            {/* Black background hides the blur, White text reveals the blur */}
            <rect width="100%" height="100%" fill="black" />
            <text 
              x="50%" 
              y="50%" 
              textAnchor="middle" 
              dominantBaseline="middle" 
              className="text-[12rem] md:text-[15rem] font-normal tracking-tighter"
              style={{ fontFamily: 'Poppins, sans-serif' }}
              fill="white"
            >
              {text}
            </text>
          </mask>

          <filter id={filterId}>
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
            <feSpecularLighting in="blur" surfaceScale="3" specularConstant="1.0" specularExponent="40" lightingColor="#ffffff" result="specOut">
              <fePointLight x="0" y="-1000" z="300" />
            </feSpecularLighting>
            <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
            <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        </defs>
      </svg>
      
      {/* The Glass Refraction (Background Blur) masked precisely to the text shape */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          mask: `url(#${maskId})`,
          WebkitMask: `url(#${maskId})`,
          backdropFilter: 'blur(30px) saturate(200%) brightness(1.2)',
          WebkitBackdropFilter: 'blur(30px) saturate(200%) brightness(1.2)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)', // Glass tint reduced
        }}
      ></div>

      {/* The 3D Bevel and Shiny Edges overlay */}
      <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none z-20 overflow-visible">
        <text 
          x="50%" 
          y="50%" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          className="text-[12rem] md:text-[15rem] font-normal tracking-tighter"
          style={{ fontFamily: 'Poppins, sans-serif' }}
          fill="rgba(255, 255, 255, 0.1)"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.5"
          filter={`url(#${filterId})`}
        >
          {text}
        </text>
      </svg>
      
      {/* Invisible HTML text to force the container to expand to the exact layout size needed! */}
      <span 
        className="opacity-0 pointer-events-none text-[12rem] md:text-[15rem] font-normal tracking-tighter px-4 leading-none"
        style={{ fontFamily: 'Poppins, sans-serif' }}
        aria-hidden="true"
      >
        {text}
      </span>
      {/* Real text for screen readers */}
      <span className="sr-only">{text}</span>
    </div>
  );
}
