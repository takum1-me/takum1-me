import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "blog" | "about" | "works" | "error";
}

export default function PageContainer({
  children,
  className = "",
  variant = "default",
}: PageContainerProps) {
  const baseClasses = "page-container";
  const variantClasses = {
    default: "page-container-default",
    blog: "page-container-blog",
    about: "page-container-about",
    works: "page-container-works",
    error: "page-container-error",
  };

  const containerClasses = [baseClasses, variantClasses[variant], className]
    .filter(Boolean)
    .join(" ");

  return <div className={containerClasses}>{children}</div>;
}
