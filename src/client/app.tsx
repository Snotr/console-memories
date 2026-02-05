import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Header } from "./components/Header.tsx";
import { Footer } from "./components/Footer.tsx";
import { Home } from "./pages/Home.tsx";
import { About } from "./pages/About.tsx";
import { Article } from "./pages/Article.tsx";
import { NewArticle } from "./pages/NewArticle.tsx";
import { EditArticle } from "./pages/EditArticle.tsx";
import type { Profile } from "../shared/types.ts";
import "./styles/main.css";

type Route =
  | { type: "home" }
  | { type: "about" }
  | { type: "new" }
  | { type: "article"; slug: string }
  | { type: "edit"; slug: string };

function getRoute(): Route {
  const path = window.location.pathname;
  if (path === "/about") return { type: "about" };
  if (path === "/new") return { type: "new" };
  if (path.startsWith("/edit/")) {
    const slug = path.replace("/edit/", "");
    return { type: "edit", slug };
  }
  if (path.startsWith("/article/")) {
    const slug = path.replace("/article/", "");
    return { type: "article", slug };
  }
  return { type: "home" };
}

function App() {
  const [route, setRoute] = useState<Route>(getRoute());
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json() as Promise<Profile>)
      .then((data) => setProfile(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRoute());
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Simple client-side navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (
        anchor &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.target
      ) {
        e.preventDefault();
        window.history.pushState({}, "", anchor.href);
        setRoute(getRoute());
        setCurrentPath(window.location.pathname);
        window.scrollTo(0, 0);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const renderPage = () => {
    switch (route.type) {
      case "about":
        return <About />;
      case "new":
        return <NewArticle />;
      case "edit":
        return <EditArticle slug={route.slug} />;
      case "article":
        return <Article slug={route.slug} />;
      default:
        return <Home />;
    }
  };

  return (
    <>
      <Header socials={profile?.socials} currentPath={currentPath} />
      {renderPage()}
      <Footer socials={profile?.socials} />
    </>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
