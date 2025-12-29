import { useRef, useCallback } from "react";
import { gsap } from "gsap";
import InstagramIcon from "../../../assets/Instagram_Glyph_Gradient.svg?url";

interface SnsLinksProps {
  className?: string;
}

interface SnsDataItem {
  name: string;
  href: string;
  variant: "twitter" | "instagram" | "github";
}

const snsData: SnsDataItem[] = [
  {
    name: "X (Twitter)",
    href: "https://twitter.com/takum1_me",
    variant: "twitter",
  },
  {
    name: "Instagram",
    href: "https://instagram.com/takum1_me",
    variant: "instagram",
  },
  {
    name: "GitHub",
    href: "https://github.com/takum1-me",
    variant: "github",
  },
];

const renderIcon = (variant: "twitter" | "instagram" | "github") => {
  switch (variant) {
    case "twitter":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "instagram":
      return (
        <img
          src={InstagramIcon}
          alt="Instagram"
          className="instagram-icon sns-link__icon"
          style={{
            width: "20px",
            height: "20px",
          }}
        />
      );
    case "github":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      );
    default:
      return null;
  }
};

function SnsLinkItem({ sns }: { sns: SnsDataItem }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const shimmerRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<SVGElement | HTMLImageElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (!linkRef.current || !shimmerRef.current || !iconRef.current) return;

    if (tlRef.current) {
      tlRef.current.kill();
    }

    tlRef.current = gsap.timeline();
    tlRef.current
      .to(linkRef.current, {
        y: -2,
        scale: 1.1,
        boxShadow: "0 0.25rem 0.75rem rgba(0, 0, 0, 0.1)",
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
          scale: 1.1,
          filter: sns.variant === "instagram" ? "none" : undefined,
          opacity: sns.variant === "instagram" ? 1 : undefined,
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
  }, [sns.variant]);

  const handleMouseLeave = useCallback(() => {
    if (!linkRef.current || !shimmerRef.current || !iconRef.current) return;

    if (tlRef.current) {
      tlRef.current.kill();
    }

    tlRef.current = gsap.timeline();
    tlRef.current
      .to(linkRef.current, {
        y: 0,
        scale: 1,
        boxShadow: "none",
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
          scale: 1,
          filter:
            sns.variant === "instagram"
              ? "grayscale(100%) brightness(0.6) saturate(0)"
              : undefined,
          opacity: sns.variant === "instagram" ? 0.7 : undefined,
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
  }, [sns.variant]);

  return (
    <a
      ref={linkRef}
      href={sns.href}
      className={`sns-link ${sns.variant}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={sns.name}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        ref={shimmerRef}
        className="sns-link-shimmer"
        style={{
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.05), transparent)",
        }}
      />
      <span
        ref={(el) => {
          if (el) {
            const svg = el.querySelector("svg");
            const img = el.querySelector("img");
            iconRef.current = (svg || img) as SVGElement | HTMLImageElement;
          }
        }}
      >
        {renderIcon(sns.variant)}
      </span>
    </a>
  );
}

export default function SnsLinks({ className = "" }: SnsLinksProps) {
  return (
    <div className={`sns-links ${className}`}>
      {snsData.map((sns) => (
        <SnsLinkItem key={sns.name} sns={sns} />
      ))}
    </div>
  );
}
