import React from "react";
import BaseHoverIndicator from "./BaseHoverIndicator";
import "./header-hover-indicator.css";

interface HeaderHoverIndicatorProps {
  items: Array<{
    id: string;
    label: string;
    href?: string;
  }>;
  onItemClick?: (id: string) => void;
  className?: string;
}

export default function HeaderHoverIndicator({
  items,
  onItemClick,
  className = "",
}: HeaderHoverIndicatorProps) {
  return React.createElement(BaseHoverIndicator, {
    items,
    onItemClick,
    className: `header-hover-indicator ${className}`,
    showBackground: false,
    variant: "header",
  });
}
