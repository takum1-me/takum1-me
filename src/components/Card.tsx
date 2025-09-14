import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'interests' | 'organizations' | 'qualifications';
}

export default function Card({
  children,
  className = '',
  variant = 'default',
}: CardProps) {
  const baseClasses = 'card';
  const variantClasses = {
    default: 'card-default',
    interests: 'card-interests',
    organizations: 'card-organizations',
    qualifications: 'card-qualifications',
  };

  const cardClasses = [
    baseClasses,
    variantClasses[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <section className={cardClasses}>
      {children}
    </section>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`card-header ${className}`}>
      {children}
    </div>
  );
}
