import React, { useState, useEffect, useCallback } from "react";
import "./sidebar.css";

const SCROLL_THRESHOLD = 50;

const Sidebar = () => {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setIsVisible(window.scrollY > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (!isVisible) return null;

  const navItems = [
    { href: "/about", label: "About" },
    { href: "/blog", label: "Blog" },
    { href: "/works", label: "Works" },
  ];

  return React.createElement(
    'div',
    { className: "sidebar" },
    React.createElement(
      'div',
      { className: "sidebar-content" },
      React.createElement(
        'nav',
        { className: "sidebar-nav" },
        navItems.map(({ href, label }) =>
          React.createElement(
            'a',
            { key: href, href: href, className: "sidebar-link" },
            label
          )
        )
      )
    )
  );
};

export default Sidebar;
