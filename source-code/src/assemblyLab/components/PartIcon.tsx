import React from 'react';
import { SubsystemCategory } from '../types/satellite';

interface PartIconProps {
  partId: string;
  category: SubsystemCategory;
  className?: string;
}

export const PartIcon: React.FC<PartIconProps> = ({
  partId,
  category,
  className = 'w-8 h-8',
}) => {
  const stroke = 'currentColor';

  switch (partId) {
    case 'bus_cubesat_6u':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <rect x="8" y="5" width="16" height="22" rx="1.5" stroke={stroke} strokeWidth="1.6" />
          <line x1="8" y1="12" x2="24" y2="12" stroke={stroke} strokeWidth="1.2" opacity="0.65" />
          <line x1="8" y1="20" x2="24" y2="20" stroke={stroke} strokeWidth="1.2" opacity="0.65" />
          <line x1="16" y1="5" x2="16" y2="27" stroke={stroke} strokeWidth="1.2" opacity="0.45" />
        </svg>
      );
    case 'bus_hex_telecom':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <polygon points="16,4 26,10 26,22 16,28 6,22 6,10" stroke={stroke} strokeWidth="1.6" />
          <polygon points="16,9 21.5,12.2 21.5,19.8 16,23 10.5,19.8 10.5,12.2" stroke={stroke} strokeWidth="1.1" opacity="0.55" />
        </svg>
      );
    case 'bus_octa_probe':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <polygon points="11,4 21,4 28,11 28,21 21,28 11,28 4,21 4,11" stroke={stroke} strokeWidth="1.6" />
          <circle cx="16" cy="16" r="5" stroke={stroke} strokeWidth="1.2" opacity="0.65" />
        </svg>
      );
    case 'pwr_wing_deployable':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <rect x="3" y="10" width="7" height="12" stroke={stroke} strokeWidth="1.4" />
          <rect x="12" y="10" width="8" height="12" stroke={stroke} strokeWidth="1.4" />
          <rect x="22" y="10" width="7" height="12" stroke={stroke} strokeWidth="1.4" />
          <line x1="10" y1="16" x2="12" y2="16" stroke={stroke} strokeWidth="1.6" />
          <line x1="20" y1="16" x2="22" y2="16" stroke={stroke} strokeWidth="1.6" />
        </svg>
      );
    case 'pwr_body_solar':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <rect x="6" y="7" width="20" height="18" rx="1" stroke={stroke} strokeWidth="1.6" />
          <line x1="6" y1="13" x2="26" y2="13" stroke={stroke} strokeWidth="1.1" opacity="0.6" />
          <line x1="6" y1="19" x2="26" y2="19" stroke={stroke} strokeWidth="1.1" opacity="0.6" />
          <line x1="16" y1="7" x2="16" y2="25" stroke={stroke} strokeWidth="1.1" opacity="0.6" />
        </svg>
      );
    case 'pwr_rtg_nuclear':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <rect x="11" y="6" width="10" height="20" rx="2" stroke={stroke} strokeWidth="1.6" />
          <line x1="6" y1="10" x2="11" y2="10" stroke={stroke} strokeWidth="1.4" />
          <line x1="21" y1="10" x2="26" y2="10" stroke={stroke} strokeWidth="1.4" />
          <line x1="6" y1="16" x2="11" y2="16" stroke={stroke} strokeWidth="1.4" />
          <line x1="21" y1="16" x2="26" y2="16" stroke={stroke} strokeWidth="1.4" />
          <line x1="6" y1="22" x2="11" y2="22" stroke={stroke} strokeWidth="1.4" />
          <line x1="21" y1="22" x2="26" y2="22" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );
    case 'pwr_battery_pack':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <rect x="5" y="9" width="22" height="15" rx="1.5" stroke={stroke} strokeWidth="1.6" />
          <rect x="9" y="6" width="4" height="3" stroke={stroke} strokeWidth="1.3" />
          <rect x="19" y="6" width="4" height="3" stroke={stroke} strokeWidth="1.3" />
          <polyline points="17,12 13,17 17,17 15,21" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'prop_hall_ion':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <circle cx="16" cy="14" r="8.5" stroke={stroke} strokeWidth="1.6" />
          <circle cx="16" cy="14" r="4.5" stroke={stroke} strokeWidth="1.4" opacity="0.8" />
          <line x1="11" y1="25" x2="9" y2="29" stroke={stroke} strokeWidth="1.4" />
          <line x1="16" y1="25" x2="16" y2="30" stroke={stroke} strokeWidth="1.4" />
          <line x1="21" y1="25" x2="23" y2="29" stroke={stroke} strokeWidth="1.4" />
        </svg>
      );
    case 'prop_biprop_main':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <rect x="12" y="5" width="8" height="6" stroke={stroke} strokeWidth="1.5" />
          <path d="M12 11 L7 25 L25 25 L20 11 Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <line x1="9" y1="19" x2="23" y2="19" stroke={stroke} strokeWidth="1.1" opacity="0.6" />
        </svg>
      );
    case 'prop_rcs_quad':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <circle cx="16" cy="16" r="5" stroke={stroke} strokeWidth="1.6" />
          <path d="M16 11 L13 5 L19 5 Z" stroke={stroke} strokeWidth="1.3" />
          <path d="M16 21 L13 27 L19 27 Z" stroke={stroke} strokeWidth="1.3" />
          <path d="M11 16 L5 13 L5 19 Z" stroke={stroke} strokeWidth="1.3" />
          <path d="M21 16 L27 13 L27 19 Z" stroke={stroke} strokeWidth="1.3" />
        </svg>
      );
    case 'comm_hga_dish':
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          <path d="M6 12 C6 21 26 21 26 12" stroke={stroke} strokeWidth="1.7" />
          <line x1="16" y1="19" x2="16" y2="27" stroke={stroke} strokeWidth="1.6" />
          <line x1="11" y1="27" x2="21" y2="27" stroke={stroke} strokeWidth="1.6" />
          <line x1="9" y1="14" x2="16" y2="7" stroke={stroke} strokeWidth="1.2" />
          <line x1="23" y1="14" x2="16" y2="7" stroke={stroke} strokeWidth="1.2" />
          <circle cx="16" cy="7" r="1.8" fill={stroke} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" fill="none" className={className}>
          {category === SubsystemCategory.AVIONICS && (
            <>
              <rect x="7" y="7" width="18" height="18" rx="2" stroke={stroke} strokeWidth="1.6" />
              <rect x="12" y="12" width="8" height="8" stroke={stroke} strokeWidth="1.2" />
              <line x1="4" y1="12" x2="7" y2="12" stroke={stroke} strokeWidth="1.4" />
              <line x1="4" y1="20" x2="7" y2="20" stroke={stroke} strokeWidth="1.4" />
              <line x1="25" y1="12" x2="28" y2="12" stroke={stroke} strokeWidth="1.4" />
              <line x1="25" y1="20" x2="28" y2="20" stroke={stroke} strokeWidth="1.4" />
            </>
          )}
          {category === SubsystemCategory.COMMS && (
            <>
              <line x1="16" y1="6" x2="16" y2="26" stroke={stroke} strokeWidth="1.6" />
              <path d="M10 10 C13 7 19 7 22 10" stroke={stroke} strokeWidth="1.4" />
              <path d="M7 7 C12 3 20 3 25 7" stroke={stroke} strokeWidth="1.2" opacity="0.65" />
              <line x1="10" y1="26" x2="22" y2="26" stroke={stroke} strokeWidth="1.6" />
            </>
          )}
          {category === SubsystemCategory.PAYLOAD && (
            <>
              <circle cx="16" cy="16" r="9" stroke={stroke} strokeWidth="1.6" />
              <circle cx="16" cy="16" r="4.5" stroke={stroke} strokeWidth="1.3" />
              <line x1="16" y1="4" x2="16" y2="7" stroke={stroke} strokeWidth="1.5" />
              <line x1="16" y1="25" x2="16" y2="28" stroke={stroke} strokeWidth="1.5" />
            </>
          )}
          {category === SubsystemCategory.THERMAL && (
            <>
              <rect x="7" y="6" width="18" height="20" rx="1" stroke={stroke} strokeWidth="1.6" />
              <line x1="12" y1="6" x2="12" y2="26" stroke={stroke} strokeWidth="1.2" opacity="0.7" />
              <line x1="20" y1="6" x2="20" y2="26" stroke={stroke} strokeWidth="1.2" opacity="0.7" />
            </>
          )}
          {(category === SubsystemCategory.BUS ||
            category === SubsystemCategory.POWER ||
            category === SubsystemCategory.PROPULSION) && (
            <rect x="8" y="8" width="16" height="16" rx="2" stroke={stroke} strokeWidth="1.6" />
          )}
        </svg>
      );
  }
};
