import SnsLinks from "../../shared/sns-links/SnsLinks";
import "../../shared/sns-links/sns-links.css";

interface FooterProps {
  className?: string;
}

export default function Footer({ className = "" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`site-footer bg-[var(--color-background)] text-[var(--color-muted)] py-xl mt-auto border-t border-gray-200 max-[768px]:py-lg max-[480px]:py-5 ${className}`}
    >
      <div className="footer-content max-w-[var(--max-content-width)] mx-auto px-[var(--spacing-gap)] flex flex-col items-center gap-lg max-[768px]:gap-5 max-[480px]:gap-md">
        <div className="footer-sns flex justify-center">
          <SnsLinks />
        </div>
        <div className="footer-copyright text-center">
          <p className="m-0 text-sm text-[var(--color-muted)] font-normal max-[768px]:text-[0.8125rem]">
            © {currentYear} takum1. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
