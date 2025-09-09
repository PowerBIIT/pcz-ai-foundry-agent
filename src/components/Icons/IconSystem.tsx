// Professional Icon System - No Emoji
// Consistent SVG-based icons for enterprise application

import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

// Base Icon Component
const Icon: React.FC<{ children: React.ReactNode } & IconProps> = ({ 
  children, 
  size = 16, 
  color = 'currentColor',
  className = '',
  style = {}
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color}
    strokeWidth={1.5}
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    {children}
  </svg>
);

// Professional Icon Set
export const Icons = {
  // Core Actions
  Plus: (props: IconProps) => (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  
  Send: (props: IconProps) => (
    <Icon {...props}>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </Icon>
  ),
  
  Download: (props: IconProps) => (
    <Icon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </Icon>
  ),
  
  Attachment: (props: IconProps) => (
    <Icon {...props}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" strokeWidth={1.5} />
    </Icon>
  ),
  
  // Business/Expert Icons
  Building: (props: IconProps) => (
    <Icon {...props}>
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
      <path d="M9 9v.01M9 12v.01M9 15v.01M13 9v.01M13 12v.01M13 15v.01" />
    </Icon>
  ),
  
  DollarSign: (props: IconProps) => (
    <Icon {...props}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Icon>
  ),
  
  Search: (props: IconProps) => (
    <Icon {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </Icon>
  ),
  
  FileText: (props: IconProps) => (
    <Icon {...props}>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      <line x1="9" y1="9" x2="10" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </Icon>
  ),
  
  // User & Profile
  User: (props: IconProps) => (
    <Icon {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  ),
  
  Settings: (props: IconProps) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  ),
  
  Star: (props: IconProps) => (
    <Icon {...props}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Icon>
  ),
  
  Logout: (props: IconProps) => (
    <Icon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeWidth={1.5} />
      <polyline points="16,17 21,12 16,7" strokeWidth={1.5} />
      <line x1="21" y1="12" x2="9" y2="12" strokeWidth={1.5} />
    </Icon>
  ),
  
  Close: (props: IconProps) => (
    <Icon {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  ),
  
  Menu: (props: IconProps) => (
    <Icon {...props}>
      <line x1="3" y1="7" x2="21" y2="7" strokeWidth={1.5} />
      <line x1="3" y1="12" x2="21" y2="12" strokeWidth={1.5} />
      <line x1="3" y1="17" x2="21" y2="17" strokeWidth={1.5} />
    </Icon>
  ),
  
  Robot: (props: IconProps) => (
    <Icon {...props}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </Icon>
  ),

  // Chat & Communication Icons
  MessageSquare: (props: IconProps) => (
    <Icon {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
    </Icon>
  ),

  ChevronRight: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="9,18 15,12 9,6" />
    </Icon>
  ),

  ChevronLeft: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="15,18 9,12 15,6" />
    </Icon>
  ),

  Edit: (props: IconProps) => (
    <Icon {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Icon>
  ),

  Trash: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </Icon>
  ),

  RefreshCcw: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="1,4 1,10 7,10" />
      <polyline points="23,20 23,14 17,14" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </Icon>
  ),

  Clock: (props: IconProps) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </Icon>
  ),

  AlertCircle: (props: IconProps) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Icon>
  ),

  CheckCircle: (props: IconProps) => (
    <Icon {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </Icon>
  ),

  // Expert Icons
  Calculator: (props: IconProps) => (
    <Icon {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
      <line x1="16" y1="18" x2="16" y2="18" />
    </Icon>
  ),

  BarChart: (props: IconProps) => (
    <Icon {...props}>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </Icon>
  ),

  Scale: (props: IconProps) => (
    <Icon {...props}>
      <path d="M16 11c0 2.5-1.5 4.5-4 4.5s-4-2-4-4.5 1.5-4.5 4-4.5 4 2 4 4.5z" />
      <path d="M12 2v4" />
      <path d="M3 13h6l3-6 3 6h6" />
    </Icon>
  ),

  // Expert-specific Icons
  Audit: (props: IconProps) => (
    <Icon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </Icon>
  ),

  Procurement: (props: IconProps) => (
    <Icon {...props}>
      <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4V11Z" />
      <path d="M20 11h-4v7h4a2 2 0 0 0 2-2v-3c0-1.1-.9-2-2-2Z" />
      <path d="M15 11V6a3 3 0 0 0-6 0v5" />
      <path d="M9 11h6" />
    </Icon>
  ),

  Budget: (props: IconProps) => (
    <Icon {...props}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <circle cx="12" cy="12" r="10" stroke="none" fill="currentColor" opacity="0.1" />
    </Icon>
  ),

  Accounting: (props: IconProps) => (
    <Icon {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </Icon>
  ),

  Liquidity: (props: IconProps) => (
    <Icon {...props}>
      <path d="M7 18a4.6 4.4 0 0 0 0-9 5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1" />
      <polyline points="13,15 12,18 11,15" />
      <polyline points="13,9 12,12 11,9" />
    </Icon>
  ),

  Assets: (props: IconProps) => (
    <Icon {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="13" cy="12" r="1" />
    </Icon>
  ),

  Regulations: (props: IconProps) => (
    <Icon {...props}>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      <circle cx="10" cy="12" r="1" />
      <circle cx="10" cy="16" r="1" />
      <line x1="13" y1="12" x2="15" y2="12" />
      <line x1="13" y1="16" x2="15" y2="16" />
    </Icon>
  ),

  Legal: (props: IconProps) => (
    <Icon {...props}>
      <path d="M16 16v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4" />
      <rect x="4" y="12" width="16" height="4" />
      <path d="M12 12V8" />
      <path d="M8 8l4-4 4 4" />
    </Icon>
  ),

  Strategy: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
      <circle cx="12" cy="12" r="2" />
    </Icon>
  ),

  Mentor: (props: IconProps) => (
    <Icon {...props}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </Icon>
  ),

  // Theme Icons
  Sun: (props: IconProps) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </Icon>
  ),

  Moon: (props: IconProps) => (
    <Icon {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  ),

  Palette: (props: IconProps) => (
    <Icon {...props}>
      <circle cx="13.5" cy="6.5" r=".5" />
      <circle cx="17.5" cy="10.5" r=".5" />
      <circle cx="8.5" cy="7.5" r=".5" />
      <circle cx="6.5" cy="12.5" r=".5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </Icon>
  ),

  // Additional icons needed for Agent Response components
  Check: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="20,6 9,17 4,12" />
    </Icon>
  ),

  Copy: (props: IconProps) => (
    <Icon {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Icon>
  ),

  ChevronDown: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="6,9 12,15 18,9" />
    </Icon>
  ),

  TrendingUp: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
      <polyline points="16,7 22,7 22,13" />
    </Icon>
  ),

  ArrowRight: (props: IconProps) => (
    <Icon {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12,5 19,12 12,19" />
    </Icon>
  ),

  Shield: (props: IconProps) => (
    <Icon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icon>
  ),

  CheckSquare: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="9,11 12,14 22,4" />
      <path d="m21,3h0a2,2 0 0,1 2,2v14a2,2 0 0,1 -2,2H3a2,2 0 0,1 -2,-2V5A2,2 0 0,1 3,3H21z" />
    </Icon>
  ),

  Calendar: (props: IconProps) => (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Icon>
  ),

  AlertTriangle: (props: IconProps) => (
    <Icon {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Icon>
  ),

  Play: (props: IconProps) => (
    <Icon {...props}>
      <polygon points="5,3 19,12 5,21 5,3" />
    </Icon>
  )
};

export default Icons;