import FooterSnsLinks from "./FooterSnsLinks";
import "./footer-sns-links.css";

interface FooterProps {
  className?: string;
}

export default function Footer({ className = "" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`site-footer ${className}`}>
      <div className="footer-content">
        <div className="footer-sns">
          <FooterSnsLinks />
        </div>
        <div className="footer-copyright">
          <p>© {currentYear} takum1. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
