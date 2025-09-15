import React, { useRef, useCallback } from 'react';
import { gsap } from 'gsap';

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'sns';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}

export default function Button({
  href,
  onClick,
  variant = 'primary',
  size = 'medium',
  className = '',
  children,
  target,
  rel,
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const baseClasses = 'button';
  const variantClasses = {
    primary: 'button-primary',
    secondary: 'button-secondary',
    sns: 'button-sns',
  };
  const sizeClasses = {
    small: 'button-small',
    medium: 'button-medium',
    large: 'button-large',
  };

  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].filter(Boolean).join(' ');

  const handleMouseEnter = useCallback(() => {
    if (!buttonRef.current) return;

    // 既存のアニメーションを停止
    if (tlRef.current) {
      tlRef.current.kill();
    }

    const button = buttonRef.current;
    
    tlRef.current = gsap.timeline();
    
    if (variant === 'sns') {
      // SNSボタンの特別なアニメーション
      tlRef.current
        .to(button, {
          y: -4,
          scale: 1.05,
          duration: 0.3,
          ease: "power2.out"
        })
        .to(button.querySelector('svg'), {
          rotation: 360,
          scale: 1.1,
          duration: 1.2,
          ease: "power2.out"
        }, 0)
        .to(button.querySelector('span'), {
          x: 2,
          duration: 0.3,
          ease: "power2.out"
        }, 0);
    } else {
      // 通常のボタンアニメーション
      tlRef.current
        .to(button, {
          y: -2,
          duration: 0.3,
          ease: "power2.out"
        });
    }
  }, [variant]);

  const handleMouseLeave = useCallback(() => {
    if (!buttonRef.current) return;

    // 既存のアニメーションを停止
    if (tlRef.current) {
      tlRef.current.kill();
    }

    const button = buttonRef.current;
    
    tlRef.current = gsap.timeline();
    
    if (variant === 'sns') {
      // SNSボタンのリセット
      tlRef.current
        .to(button, {
          y: 0,
          scale: 1,
          duration: 0.3,
          ease: "power2.out"
        })
        .to(button.querySelector('svg'), {
          rotation: 0,
          scale: 1,
          duration: 0.3,
          ease: "power2.out"
        }, 0)
        .to(button.querySelector('span'), {
          x: 0,
          duration: 0.3,
          ease: "power2.out"
        }, 0);
    } else {
      // 通常のボタンリセット
      tlRef.current
        .to(button, {
          y: 0,
          duration: 0.3,
          ease: "power2.out"
        });
    }
  }, [variant]);

  if (href) {
    return (
      <a
        ref={buttonRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        className={buttonClasses}
        target={target}
        rel={rel}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span>{children}</span>
      </a>
    );
  }

  return (
    <button
      ref={buttonRef as React.RefObject<HTMLButtonElement>}
      className={buttonClasses}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span>{children}</span>
    </button>
  );
}
