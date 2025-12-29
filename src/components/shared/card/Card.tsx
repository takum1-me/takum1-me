import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "interests" | "organizations" | "qualifications";
}

export default function Card({
  children,
  className = "",
  variant = "default",
}: CardProps) {
  const baseClasses =
    "bg-transparent rounded-xl py-xl px-xl shadow-none border-none relative before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-[#8b7355] before:rounded-sm max-[768px]:py-lg max-[768px]:px-lg";
  const variantClasses = {
    default: "",
    interests: "",
    organizations: "",
    qualifications: "",
  };

  const cardClasses = [baseClasses, variantClasses[variant], className]
    .filter(Boolean)
    .join(" ");

  return <section className={cardClasses}>{children}</section>;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-center mb-lg gap-md ${className}`}>
      {children}
    </div>
  );
}
