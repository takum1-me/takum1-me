import { useState, useEffect, useCallback } from "react";
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

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <nav className="sidebar-nav">
          {navItems.map(({ href, label }) => (
            <a key={href} href={href} className="sidebar-link">
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
