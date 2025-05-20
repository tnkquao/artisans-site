import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ConstructionLogo({ size = 'md', className = '' }: LogoProps) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const sizeClass = sizeMap[size];

  return (
    <div className={`relative ${sizeClass} ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
        className="w-full h-full"
        aria-label="Artisans Construction Logo"
      >
        {/* House Foundation */}
        <rect
          x="30"
          y="70"
          width="60"
          height="25"
          fill="#D1D5DB" // Gray-300
          stroke="#6B7280" // Gray-500
          strokeWidth="2"
        />

        {/* House Walls */}
        <rect
          x="35"
          y="45"
          width="50"
          height="25"
          fill="#F3F4F6" // Gray-100
          stroke="#6B7280" // Gray-500
          strokeWidth="2"
        />

        {/* Roof made of Ruler/Level */}
        <path
          d="M30 45L60 20L90 45"
          fill="#F59E0B" // Amber-500
          stroke="#D97706" // Amber-600
          strokeWidth="3"
        />
        
        {/* Ruler markings on roof */}
        <line x1="38" y1="41" x2="38" y2="36" stroke="#27272A" strokeWidth="1.5" />
        <line x1="46" y1="36" x2="46" y2="31" stroke="#27272A" strokeWidth="1.5" />
        <line x1="54" y1="31" x2="54" y2="26" stroke="#27272A" strokeWidth="1.5" />
        <line x1="66" y1="31" x2="66" y2="26" stroke="#27272A" strokeWidth="1.5" />
        <line x1="74" y1="36" x2="74" y2="31" stroke="#27272A" strokeWidth="1.5" />
        <line x1="82" y1="41" x2="82" y2="36" stroke="#27272A" strokeWidth="1.5" />

        {/* Door made of wood plank */}
        <rect
          x="52.5"
          y="75"
          width="15"
          height="20"
          fill="#78350F" // Amber-900 (wooden)
          stroke="#57534E" // Stone-600
          strokeWidth="1.5"
        />
        <circle
          cx="56"
          cy="85"
          r="1.5"
          fill="#D1D5DB" // Gray-300 (doorknob)
          stroke="#6B7280" // Gray-500
          strokeWidth="0.5"
        />

        {/* Windows made of Measuring Tape */}
        <rect
          x="40"
          y="50"
          width="10"
          height="10"
          fill="#E4E4E7" // Zinc-200
          stroke="#52525B" // Zinc-600
          strokeWidth="1.5"
        />
        <rect
          x="70"
          y="50"
          width="10"
          height="10"
          fill="#E4E4E7" // Zinc-200
          stroke="#52525B" // Zinc-600
          strokeWidth="1.5"
        />
        <line x1="40" y1="55" x2="50" y2="55" stroke="#52525B" strokeWidth="1" />
        <line x1="45" y1="50" x2="45" y2="60" stroke="#52525B" strokeWidth="1" />
        <line x1="70" y1="55" x2="80" y2="55" stroke="#52525B" strokeWidth="1" />
        <line x1="75" y1="50" x2="75" y2="60" stroke="#52525B" strokeWidth="1" />

        {/* Hammer decoration on side of house */}
        <g transform="translate(92, 60) rotate(-10)">
          <rect
            x="-5"
            y="-2"
            width="15"
            height="3"
            rx="1"
            fill="#78350F" // Amber-900 (wooden handle)
            stroke="#57534E" // Stone-600
            strokeWidth="1"
          />
          <rect
            x="-10"
            y="-5"
            width="7"
            height="10"
            rx="1"
            fill="#71717A" // Zinc-500 (hammer head)
            stroke="#52525B" // Zinc-600
            strokeWidth="1"
          />
        </g>

        {/* Wrench decoration on other side */}
        <g transform="translate(28, 60) rotate(10)">
          <path
            d="M-8,-5 L8,-5 A5,5 0 0,1 8,5 L-8,5 A5,5 0 0,1 -8,-5 Z"
            fill="#71717A" // Zinc-500
            stroke="#52525B" // Zinc-600
            strokeWidth="1"
          />
          <circle
            cx="-4"
            cy="0"
            r="2.5"
            fill="#E4E4E7" // Zinc-200
            stroke="#52525B" // Zinc-600
            strokeWidth="1"
          />
          <circle
            cx="4"
            cy="0"
            r="2.5"
            fill="#E4E4E7" // Zinc-200
            stroke="#52525B" // Zinc-600
            strokeWidth="1"
          />
        </g>

        {/* Text: ARTISANS */}
        <text
          x="60"
          y="105"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          fontSize="12"
          fill="#334155" // Slate-700
        >
          ARTISANS
        </text>
      </svg>
    </div>
  );
}