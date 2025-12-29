import React, { useRef, useCallback } from "react";
import { gsap } from "gsap";

interface SnsLink {
  name: string;
  href: string;
  icon: React.ReactNode;
  variant: "twitter" | "instagram" | "github";
}

interface AboutSnsLinksProps {
  className?: string;
  title?: string;
}

const snsData: SnsLink[] = [
  {
    name: "X (Twitter)",
    href: "https://twitter.com/takum1_me",
    variant: "twitter",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://instagram.com/takum1_me",
    variant: "instagram",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com/takum1-me",
    variant: "github",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
];

function AboutSnsLinkItem({ sns }: { sns: SnsLink }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const shimmerRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLElement | SVGSVGElement | null>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (
      !linkRef.current ||
      !shimmerRef.current ||
      !iconRef.current ||
      !textRef.current
    )
      return;

    if (tlRef.current) {
      tlRef.current.kill();
    }

    tlRef.current = gsap.timeline();
    tlRef.current
      .to(linkRef.current, {
        y: -4,
        scale: 1.05,
        boxShadow: "0 0.5rem 1.5625rem rgba(0, 0, 0, 0.15)",
        duration: 0.3,
        ease: "power2.out",
      })
      .to(
        shimmerRef.current,
        {
          left: "100%",
          duration: 0.5,
          ease: "power2.out",
        },
        0,
      )
      .to(
        iconRef.current,
        {
          rotation: 360,
          scale: 1.1,
          duration: 1.2,
          ease: "power2.out",
        },
        0,
      )
      .to(
        textRef.current,
        {
          x: 2,
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (
      !linkRef.current ||
      !shimmerRef.current ||
      !iconRef.current ||
      !textRef.current
    )
      return;

    if (tlRef.current) {
      tlRef.current.kill();
    }

    tlRef.current = gsap.timeline();
    tlRef.current
      .to(linkRef.current, {
        y: 0,
        scale: 1,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        duration: 0.3,
        ease: "power2.out",
      })
      .to(
        shimmerRef.current,
        {
          left: "-100%",
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      )
      .to(
        iconRef.current,
        {
          rotation: 0,
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      )
      .to(
        textRef.current,
        {
          x: 0,
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
  }, []);

  return (
    <a
      ref={linkRef}
      href={sns.href}
      className={`about-sns-link about-sns-link--${sns.variant}`}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        ref={shimmerRef}
        className="about-sns-link-shimmer"
        style={{
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
        }}
      />
      <span
        ref={(el) => {
          if (el) {
            iconRef.current = el.querySelector("svg") || el;
          }
        }}
      >
        {sns.icon}
      </span>
      <span ref={textRef}>{sns.name}</span>
    </a>
  );
}

export default function AboutSnsLinks({
  className = "",
  title = "SNS",
}: AboutSnsLinksProps) {
  return (
    <section className={`about-sns-section ${className}`}>
      <h2>{title}</h2>
      <div className="about-sns-links">
        {snsData.map((sns) => (
          <AboutSnsLinkItem key={sns.name} sns={sns} />
        ))}
      </div>
    </section>
  );
}
