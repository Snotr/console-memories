import type { SocialLink } from "../../shared/types.ts";

interface FooterProps {
  socials?: SocialLink[];
}

export function Footer({ socials = [] }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__socials">
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.url}
              className="footer__social-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {social.name.toLowerCase()}
            </a>
          ))}
        </div>
        <p className="footer__copy">
          {year} / console_memories
        </p>
      </div>
    </footer>
  );
}
