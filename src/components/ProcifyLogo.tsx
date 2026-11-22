import React from 'react';

interface ProcifyLogoProps {
  size?: number;
  className?: string;
}

/**
 * Custom Procify AI brand mark:
 * Stylized letter P formed from connected workflow nodes and directional edges.
 */
export function ProcifyLogo({ size = 32, className = '' }: ProcifyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#10172A" />
      {/* Vertical spine edge */}
      <path
        d="M13 10V30"
        stroke="#4361EE"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Upper P loop edges */}
      <path
        d="M13 10H23.5C26.5376 10 29 12.4624 29 15.5C29 18.5376 26.5376 21 23.5 21H13"
        stroke="#22D3EE"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Diagonal decision branch */}
      <path
        d="M20 21L27 29"
        stroke="#4361EE"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      {/* Workflow nodes forming the P vertices */}
      <circle cx="13" cy="10" r="3" fill="#FFFFFF" stroke="#4361EE" strokeWidth="2" />
      <circle cx="13" cy="21" r="3" fill="#FFFFFF" stroke="#22D3EE" strokeWidth="2" />
      <circle cx="13" cy="30" r="3" fill="#4361EE" />
      <circle cx="28.5" cy="15.5" r="3.2" fill="#22D3EE" />
      <circle cx="27" cy="29" r="2.5" fill="#22D3EE" />
    </svg>
  );
}
