import React from 'react';

export type IconName =
  | 'patient'
  | 'asha'
  | 'doctor'
  | 'hospital'
  | 'district'
  | 'admin'
  | 'passport'
  | 'consent'
  | 'timeline'
  | 'emergency'
  | 'alert'
  | 'check'
  | 'sync'
  | 'search'
  | 'scan'
  | 'phone'
  | 'location'
  | 'blood'
  | 'calendar'
  | 'chevron-right'
  | 'chevron-left'
  | 'close'
  | 'print'
  | 'lock'
  | 'info'
  | 'menu'
  | 'arrow-right'
  | 'network'
  | 'chart'
  | 'pulse'
  | 'stethoscope'
  | 'send'
  | 'user'
  | 'brain'
  | 'clock'
  | 'lightning'
  | 'chevron-up'
  | 'chevron-down'
  | 'xray'
  | 'home'
  | 'plus'
  | 'add'
  | 'arrow-left'
  | 'warning';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  title?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  color = 'currentColor',
  className = '',
  title,
}) => {
  const renderPath = () => {
    switch (name) {
      case 'patient':
        return (
          <>
            <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" fill="none" />
            <path d="M5.5 21 C5.5 16.5 8.5 14 12 14 C15.5 14 18.5 16.5 18.5 21" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M17 11 C18.5 12 20 13.5 20 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </>
        );
      case 'asha':
        return (
          <>
            <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" fill="none" />
            <path d="M6 21 C6 16.5 8.5 14 12 14 C15.5 14 18 16.5 18 21" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="12" cy="18" r="2" fill={color} />
          </>
        );
      case 'doctor':
        return (
          <>
            <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" fill="none" />
            <path d="M6 21 C6 16.5 8.5 14 12 14 C15.5 14 18 16.5 18 21" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M12 10 L12 14 M10 12 L14 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          </>
        );
      case 'hospital':
        return (
          <>
            <path d="M4 21 L4 5 C4 4.5 4.5 4 5 4 L19 4 C19.5 4 20 4.5 20 5 L20 21" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M12 7 L12 13 M9 10 L15 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <path d="M9 21 L9 17 L15 17 L15 21" stroke={color} strokeWidth="2" fill="none" />
          </>
        );
      case 'district':
      case 'chart':
        return (
          <>
            <path d="M4 20 L20 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <path d="M7 16 L7 20 M12 11 L12 20 M17 6 L17 20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case 'admin':
        return (
          <>
            <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none" />
            <path d="M12 2 L12 4 M12 20 L12 22 M2 12 L4 12 M20 12 L22 12 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M4.9 19.1 L6.3 17.7 M17.7 6.3 L19.1 4.9" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'passport':
        return (
          <>
            <rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth="2" fill="none" />
            <circle cx="12" cy="10" r="2.5" stroke={color} strokeWidth="1.5" fill="none" />
            <path d="M8 17 C8 15.5 9.5 14.5 12 14.5 C14.5 14.5 16 15.5 16 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </>
        );
      case 'consent':
      case 'lock':
        return (
          <>
            <rect x="5" y="10" width="14" height="11" rx="2" stroke={color} strokeWidth="2" fill="none" />
            <path d="M8 10 L8 6 C8 4 9.5 2.5 12 2.5 C14.5 2.5 16 4 16 6 L16 10" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        );
      case 'timeline':
      case 'calendar':
        return (
          <>
            <rect x="4" y="5" width="16" height="16" rx="2" stroke={color} strokeWidth="2" fill="none" />
            <path d="M8 2 L8 5 M16 2 L16 5 M4 10 L20 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'emergency':
      case 'alert':
        return (
          <>
            <path d="M12 3 L22 20 L2 20 Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill="none" />
            <path d="M12 9 L12 14 M12 17 L12.01 17" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'check':
        return <path d="M5 12 L10 17 L19 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
      case 'sync':
        return (
          <>
            <path d="M20 11 A8 8 0 0 0 5 8 L3 8 M3 4 L3 8 L7 8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M4 13 A8 8 0 0 0 19 16 L21 16 M21 20 L21 16 L17 16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        );
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" fill="none" />
            <path d="M16 16 L21 21" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      case 'scan':
        return (
          <>
            <path d="M4 9 L4 5 C4 4.5 4.5 4 5 4 L9 4" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M15 4 L19 4 C19.5 4 20 4.5 20 5 L20 9" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M20 15 L20 19 C20 19.5 19.5 20 19 20 L15 20" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M9 20 L5 20 C4.5 20 4 19.5 4 19 L4 15" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M4 12 L20 12" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
          </>
        );
      case 'phone':
        return (
          <path
            d="M5 4 C4.5 4 4 4.5 4 5 C4 13.5 10.5 20 19 20 C19.5 20 20 19.5 20 19 L17.5 14.5 L14.5 16 C12 14.5 9.5 12 8 9.5 L9.5 6.5 Z"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
        );
      case 'location':
        return (
          <>
            <path d="M12 2 C8 2 5 5 5 9 C5 14.5 12 22 12 22 C12 22 19 14.5 19 9 C19 5 16 2 12 2 Z" stroke={color} strokeWidth="2" fill="none" />
            <circle cx="12" cy="9" r="2.5" fill={color} />
          </>
        );
      case 'blood':
      case 'pulse':
        return (
          <path
            d="M12 3 C12 3 6 10.5 6 15 A6 6 0 0 0 18 15 C18 10.5 12 3 12 3 Z"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
        );
      case 'chevron-right':
        return <path d="M9 6 L15 12 L9 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
      case 'chevron-left':
        return <path d="M15 6 L9 12 L15 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
      case 'close':
        return <path d="M6 6 L18 18 M18 6 L6 18" stroke={color} strokeWidth="2" strokeLinecap="round" />;
      case 'print':
        return (
          <>
            <path d="M6 9 L6 4 L18 4 L18 9" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <rect x="4" y="9" width="16" height="8" rx="1" stroke={color} strokeWidth="2" fill="none" />
            <path d="M6 14 L6 20 L18 20 L18 14" stroke={color} strokeWidth="2" fill="none" />
          </>
        );
      case 'info':
        return (
          <>
            <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
            <path d="M12 8 L12 9 M12 12 L12 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'menu':
        return <path d="M4 6 L20 6 M4 12 L20 12 M4 18 L20 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />;
      case 'arrow-right':
        return <path d="M5 12 L19 12 M13 6 L19 12 L13 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
      case 'network':
        return (
          <>
            <circle cx="12" cy="5" r="2.5" stroke={color} strokeWidth="2" fill="none" />
            <circle cx="6" cy="18" r="2.5" stroke={color} strokeWidth="2" fill="none" />
            <circle cx="18" cy="18" r="2.5" stroke={color} strokeWidth="2" fill="none" />
            <path d="M12 7.5 L6 15.5 M12 7.5 L18 15.5" stroke={color} strokeWidth="1.5" />
          </>
        );
      case 'stethoscope':
        return (
          <>
            <path d="M6 3 L6 10 C6 13.5 8.5 16 12 16 C15.5 16 18 13.5 18 10 L18 3" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="6" cy="3" r="1.5" fill={color} />
            <circle cx="18" cy="3" r="1.5" fill={color} />
            <path d="M12 16 L12 19 C12 20.5 13.5 21 15 21 L17 21" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="19" cy="21" r="2" stroke={color} strokeWidth="2" fill="none" />
          </>
        );
      case 'send':
        return (
          <path d="M22 2 L11 13 M22 2 L15 22 L11 13 L2 9 Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      case 'user':
        return (
          <>
            <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" fill="none" />
            <path d="M5.5 21 C5.5 16.5 8.5 14 12 14 C15.5 14 18.5 16.5 18.5 21" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        );
      case 'brain':
        return (
          <>
            <path d="M9.5 4 C7 4 5 6 5 8.5 C5 9.5 5.5 10.5 6 11 C4.5 12 4 14 4 15.5 C4 18 6 20 8.5 20 L12 20 M14.5 4 C17 4 19 6 19 8.5 C19 9.5 18.5 10.5 18 11 C19.5 12 20 14 20 15.5 C20 18 18 20 15.5 20 L12 20 M12 4 L12 20" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </>
        );
      case 'clock':
        return (
          <>
            <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
            <path d="M12 7 L12 12 L15 15" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'lightning':
        return (
          <path d="M13 2 L4 14 L11 14 L10 22 L20 10 L13 10 Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      case 'chevron-up':
        return (
          <path d="M18 15 L12 9 L6 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      case 'chevron-down':
        return (
          <path d="M6 9 L12 15 L18 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        );
      case 'xray':
        return (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" fill="none" />
            <path d="M7 8 L17 16 M17 8 L7 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth="1.5" />
          </>
        );
      case 'home':
        return (
          <>
            <path d="M3 9.5 L12 3 L21 9.5 V20 C21 20.5 20.5 21 20 21 H15 V15 H9 V21 H4 C3.5 21 3 20.5 3 20 V9.5 Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        );
      case 'plus':
      case 'add':
        return <path d="M12 5 V19 M5 12 H19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
      case 'arrow-left':
        return <path d="M19 12 L5 12 M11 18 L5 12 L11 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
      case 'warning':
        return (
          <>
            <path d="M12 3 L22 20 L2 20 Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill="none" />
            <path d="M12 9 L12 14 M12 17 L12.01 17" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </>
        );
      default:
        return <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" fill="none" />;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`dori-icon ${className}`}
      aria-hidden={!title}
      role={title ? 'img' : 'presentation'}
    >
      {title && <title>{title}</title>}
      {renderPath()}
    </svg>
  );
};
