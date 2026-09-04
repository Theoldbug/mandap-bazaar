import { cn } from '../../lib/utils';
import type { ButtonHTMLAttributes } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'filter';
  className?: string;
}

export function Chip({ children, selected = false, onClick, variant = 'default', className, ...props }: ChipProps) {
  const handleClick = () => onClick?.();

  if (variant === 'filter') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          selected
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface text-text-secondary border border-gray-200 hover:border-primary hover:text-primary',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200',
        selected
          ? 'bg-primary text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        className
      )}
      onClick={handleClick}
    >
      {children}
    </span>
  );
}