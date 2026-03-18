import React from 'react';
import { cn } from './cn';

function Input({ className = '', ...props }) {
  return <input className={cn('cv-input', className)} {...props} />;
}

export default Input;
