import type { SocialLink } from "../../shared/types.ts";

interface HeaderProps {
  socials?: SocialLink[];
  currentPath: string;
}

export function Header({ socials = [], currentPath }: HeaderProps) {
  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="header">
      <div className="container header__inner">
        <a href="/" className="header__logo">
          <span className="header__logo-symbol">&gt;</span>
          console_memories
        </a>
        <nav className="header__nav">
          <a
            href="/"
            className={`header__link ${isActive("/") && currentPath === "/" ? "header__link--active" : ""}`}
          >
            posts
          </a>
          <a
            href="/about"
            className={`header__link ${isActive("/about") ? "header__link--active" : ""}`}
          >
            about
          </a>
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.url}
              className="header__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {social.name.toLowerCase()}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
