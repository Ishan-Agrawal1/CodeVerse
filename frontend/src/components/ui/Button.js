import React from 'react';
import { cn } from './cn';

const variants = {
  default: 'cv-btn cv-btn-default',
  secondary: 'cv-btn cv-btn-secondary',
  ghost: 'cv-btn cv-btn-ghost',
  destructive: 'cv-btn cv-btn-destructive',
};

const sizes = {
  sm: 'cv-btn-sm',
  md: 'cv-btn-md',
  lg: 'cv-btn-lg',
  icon: 'cv-btn-icon',
};

function Button({
  className = '',
  variant = 'default',
  size = 'md',
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
