import React from 'react';
import { cn } from './cn';

export function Card({ className = '', children, ...props }) {
  return (
    <div className={cn('cv-card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={cn('cv-card-header', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }) {
  return (
    <h3 className={cn('cv-card-title', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={cn('cv-card-content', className)} {...props}>
      {children}
    </div>
  );
}
