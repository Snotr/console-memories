import { useState, useEffect } from "react";
import { ArticleCard } from "../components/ArticleCard.tsx";
import type { Article, Reactions } from "../../shared/types.ts";

// List view excludes content/contentHtml
type ArticleListItem = Omit<Article, "content" | "contentHtml">;

export function Home() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/articles")
      .then((res) => res.json() as Promise<ArticleListItem[]>)
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleReaction = async (articleId: string, reaction: keyof Reactions) => {
    try {
      const res = await fetch(`/api/articles/${articleId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: reaction }),
      });
      if (res.ok) {
        const data = await res.json() as { reactions: Reactions };
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId ? { ...a, reactions: data.reactions } : a
          )
        );
      }
    } catch {
      // Silently fail
    }
  };

  if (loading) {
    return (
      <main className="main">
        <div className="container">
          <p className="loading">loading</p>
        </div>
      </main>
    );
  }

  const featuredArticles = articles.filter((a) => a.featured);
  const regularArticles = articles.filter((a) => !a.featured);

  return (
    <main className="main">
      <div className="container">
        {/* Featured section */}
        {featuredArticles.length > 0 && (
          <section className="mb-xl">
            <div className="section-header">
              <h2 className="section-header__title">Featured</h2>
              <span className="section-header__badge">{featuredArticles.length}</span>
            </div>
            <div className="articles-grid">
              {featuredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onReact={handleReaction}
                />
              ))}
            </div>
          </section>
        )}

        {/* All posts section */}
        <section>
          <div className="section-header">
            <h2 className="section-header__title">All Posts</h2>
            <span className="section-header__badge">{regularArticles.length}</span>
          </div>
          {regularArticles.length === 0 ? (
            <div className="empty-state">
              <p>No articles yet.</p>
            </div>
          ) : (
            <div className="articles-grid">
              {regularArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onReact={handleReaction}
                />
              ))}
            </div>
          )}
        </section>

        <a href="/new" className="fab" title="New post">
          +
        </a>
      </div>
    </main>
  );
}
