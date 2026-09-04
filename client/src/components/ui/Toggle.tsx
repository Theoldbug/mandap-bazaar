import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, disabled, label, className }, ref) => {
    return (
      <button
        ref={ref}
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          checked ? 'bg-primary border-primary' : 'bg-gray-200 border-gray-300',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow',
            'transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
        {label && (
          <span className={cn('ml-3 text-sm font-medium text-text-secondary', disabled && 'text-gray-400')}>
            {label}
          </span>
        )}
      </button>
    );
  }
);

Toggle.displayName = 'Toggle';