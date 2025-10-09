import SnsLinks from "../../shared/sns-links/SnsLinks";
import "../../shared/sns-links/sns-links.css";

interface FooterProps {
  className?: string;
}

export default function Footer({ className = "" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`site-footer ${className}`}>
      <div className="footer-content">
        <div className="footer-sns">
          <SnsLinks />
        </div>
        <div className="footer-copyright">
          <p>© {currentYear} takum1. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
