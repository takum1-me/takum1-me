import React, { useRef, useCallback } from "react";
import { gsap } from "gsap";

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "error";
  size?: "small" | "medium" | "large";
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}

export default function Button({
  href,
  onClick,
  variant = "primary",
  size = "medium",
  className = "",
  children,
  target,
  rel,
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const backgroundRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const baseClasses = "button";
  const variantClasses = {
    primary: "button-primary",
    secondary: "button-secondary",
    error: "button-error-primary",
  };
  const sizeClasses = {
    small: "button-small",
    medium: "button-medium",
    large: "button-large",
  };

  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleMouseEnter = useCallback(() => {
    if (!buttonRef.current || !backgroundRef.current || !textRef.current)
      return;

    // 既存のアニメーションを停止
    if (tlRef.current) {
      tlRef.current.kill();
    }

    const button = buttonRef.current;
    const background = backgroundRef.current;
    const text = textRef.current;

    tlRef.current = gsap.timeline();

    // ボタンの位置アニメーション
    tlRef.current.to(button, {
      y: -2,
      duration: 0.3,
      ease: "power2.out",
    });

    // 背景アニメーション
    if (variant === "primary") {
      // Primary: 上から下に背景が広がる
      tlRef.current.to(
        background,
        {
          height: "100%",
          duration: 0.4,
          ease: "power2.out",
        },
        0,
      );
      // テキストの色を変更
      tlRef.current.to(
        text,
        {
          color: "#fff",
          duration: 0.2,
          delay: 0.2,
          ease: "power2.out",
        },
        0,
      );
    } else if (variant === "secondary") {
      // Secondary: 左から右に背景が広がる
      tlRef.current.to(
        background,
        {
          left: "0%",
          duration: 0.4,
          ease: "power2.out",
        },
        0,
      );
      // テキストの色を変更
      tlRef.current.to(
        text,
        {
          color: "#fff",
          duration: 0.2,
          delay: 0.2,
          ease: "power2.out",
        },
        0,
      );
    } else if (variant === "error") {
      // Error: 左から右に背景が広がる
      tlRef.current.to(
        background,
        {
          width: "100%",
          duration: 0.5,
          ease: "power2.out",
        },
        0,
      );
      // テキストの色とボタンの位置を変更
      tlRef.current.to(
        text,
        {
          color: "#fff",
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
      tlRef.current.to(
        button,
        {
          y: -2,
          boxShadow: "0 0.5rem 1.5625rem rgba(107, 114, 128, 0.3)",
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
    }
  }, [variant]);

  const handleMouseLeave = useCallback(() => {
    if (!buttonRef.current || !backgroundRef.current || !textRef.current)
      return;

    // 既存のアニメーションを停止
    if (tlRef.current) {
      tlRef.current.kill();
    }

    const button = buttonRef.current;
    const background = backgroundRef.current;
    const text = textRef.current;

    tlRef.current = gsap.timeline();

    // ボタンの位置リセット
    tlRef.current.to(button, {
      y: 0,
      duration: 0.3,
      ease: "power2.out",
    });

    // 背景アニメーション
    if (variant === "primary") {
      tlRef.current.to(
        background,
        {
          height: "0%",
          duration: 0.4,
          ease: "power2.out",
        },
        0,
      );
      tlRef.current.to(
        text,
        {
          color: "var(--color-secondary)",
          duration: 0.2,
          ease: "power2.out",
        },
        0,
      );
    } else if (variant === "secondary") {
      tlRef.current.to(
        background,
        {
          left: "-100%",
          duration: 0.4,
          ease: "power2.out",
        },
        0,
      );
      tlRef.current.to(
        text,
        {
          color: "var(--color-text-primary)",
          duration: 0.2,
          ease: "power2.out",
        },
        0,
      );
    } else if (variant === "error") {
      tlRef.current.to(
        background,
        {
          width: "0%",
          duration: 0.5,
          ease: "power2.out",
        },
        0,
      );
      tlRef.current.to(
        text,
        {
          color: "var(--color-muted)",
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
      tlRef.current.to(
        button,
        {
          y: 0,
          boxShadow: "none",
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
    }
  }, [variant]);

  // 初期化: 背景要素の初期状態を設定
  React.useEffect(() => {
    if (backgroundRef.current && textRef.current && buttonRef.current) {
      if (variant === "primary") {
        gsap.set(backgroundRef.current, {
          height: "0%",
          backgroundColor: "var(--color-secondary)",
        });
        gsap.set(textRef.current, {
          color: "var(--color-secondary)",
        });
      } else if (variant === "secondary") {
        gsap.set(backgroundRef.current, {
          left: "-100%",
          backgroundColor: "var(--color-text-primary)",
        });
        gsap.set(textRef.current, {
          color: "var(--color-text-primary)",
        });
      } else if (variant === "error") {
        gsap.set(backgroundRef.current, {
          width: "0%",
          backgroundColor: "var(--color-muted)",
        });
        gsap.set(textRef.current, {
          color: "var(--color-muted)",
        });
        // パルスアニメーションを開始
        gsap.to(buttonRef.current, {
          scale: 1.05,
          duration: 1,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      }
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
        <span ref={backgroundRef} className="button-background" />
        <span ref={textRef} className="button-text">
          {children}
        </span>
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
      <span ref={backgroundRef} className="button-background" />
      <span ref={textRef} className="button-text">
        {children}
      </span>
    </button>
  );
}
