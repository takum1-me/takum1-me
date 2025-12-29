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
  const baseClasses = "relative";
  const variantClasses = {
    default:
      "max-w-[calc(95vw-8.25rem)] mx-auto ml-[8.25rem] mr-[2.5vw] py-xl px-md max-[1024px]:max-w-[calc(95vw-6.5rem)] max-[1024px]:ml-[6.5rem] max-[768px]:max-w-[calc(100vw-2.5rem)] max-[768px]:ml-10 max-[768px]:mr-0",
    blog: "max-w-[calc(95vw-8.25rem)] mx-auto ml-[8.25rem] mr-[2.5vw] px-5 max-[1024px]:max-w-[calc(95vw-6.5rem)] max-[1024px]:ml-[6.5rem] max-[768px]:max-w-[calc(95vw-6.5rem)] max-[768px]:ml-[6.5rem]",
    about:
      "max-w-[calc(95vw-8.25rem)] mx-auto ml-[8.25rem] mr-[2.5vw] px-md max-[1024px]:max-w-[calc(95vw-6.5rem)] max-[1024px]:ml-[6.5rem] max-[768px]:max-w-[calc(100vw-2.5rem)] max-[768px]:ml-10 max-[768px]:mr-0",
    works:
      "max-w-[var(--max-content-width)] mx-auto ml-40 py-xl px-md max-[1024px]:ml-32 max-[768px]:ml-20 max-[480px]:ml-14 max-[320px]:ml-10",
    error:
      "flex justify-center items-center min-h-[60vh] py-xl px-md ml-40 max-[1024px]:ml-32 max-[768px]:ml-20 max-[480px]:ml-14 max-[320px]:ml-10",
  };

  const containerClasses = [baseClasses, variantClasses[variant], className]
    .filter(Boolean)
    .join(" ");

  return <div className={containerClasses}>{children}</div>;
}
