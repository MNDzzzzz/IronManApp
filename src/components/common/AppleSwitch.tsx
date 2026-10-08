'use client';

// ====================================================================
// COMPONENTE: AppleSwitch (Interruptor Háptico estilo iOS / visionOS)
// Interruptor interactivo con interpolación elástica spring viscosa,
// bisel especular Liquid Glass y accesibilidad WCAG 2.2 AA.
// Idioma: Español (Strict TypeScript / Clean Architecture)
// ====================================================================

import React from 'react';

export interface AppleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
  description?: string;
  size?: 'sm' | 'md';
  activeColor?: 'emerald' | 'clay' | 'blue';
}

export const AppleSwitch: React.FC<AppleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  label,
  description,
  size = 'md',
  activeColor = 'emerald',
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  // Dimensiones según tamaño (escala milimétrica de Apple Human Interface Guidelines)
  const isSm = size === 'sm';
  const trackWidthClass = isSm ? 'w-10 h-6' : 'w-12 h-7';
  const thumbSizeClass = isSm ? 'w-5 h-5' : 'w-6 h-6';
  const translateClass = checked
    ? isSm
      ? 'translate-x-4'
      : 'translate-x-5'
    : 'translate-x-0.5';

  // Paleta de color activo en sincronía con los acentos de la aplicación
  let activeBgClass = 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]';
  if (activeColor === 'clay') {
    activeBgClass = 'bg-[#D97757] shadow-[0_0_12px_rgba(217,119,87,0.35)]';
  } else if (activeColor === 'blue') {
    activeBgClass = 'bg-[#2D68C4] shadow-[0_0_12px_rgba(45,104,196,0.35)]';
  }

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
      onClick={handleClick}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        aria-label={label || 'Interruptor de estado'}
        id={id}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`group relative inline-flex items-center rounded-full transition-colors duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#D97757] active:scale-[0.96] touch-manipulation ${trackWidthClass} ${
          checked
            ? activeBgClass
            : 'bg-[var(--glass-surface-thick)] border border-[var(--glass-border)]'
        }`}
      >
        {/* Thumb circular con sombra de elevación física, bisel especular y deformación táctil */}
        <span
          className={`pointer-events-none inline-block rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2),0_0_1px_rgba(0,0,0,0.25)] ring-0 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${thumbSizeClass} ${translateClass} ${
            isSm ? 'group-active:w-[23px]' : 'group-active:w-[27px]'
          }`}
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && (
            <span className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[10px] text-[var(--text-secondary)] leading-normal">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
