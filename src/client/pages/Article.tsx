import { useState, useEffect } from "react";
import type { Article as ArticleType, Reactions } from "../../shared/types.ts";

interface ArticleProps {
  slug: string;
  isAuthenticated?: boolean;
}

export function Article({ slug, isAuthenticated }: ArticleProps) {
  const [article, setArticle] = useState<ArticleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [myReactions, setMyReactions] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/articles/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Article not found");
        return res.json() as Promise<ArticleType>;
      })
      .then((data) => {
        setArticle(data);
        setLoading(false);
        // Fetch visitor's reactions
        return fetch(`/api/articles/reactions/${data.id}/me`);
      })
      .then((res) => res?.json() as Promise<{ reacted: string[] } | undefined>)
      .then((data) => {
        if (data?.reacted) setMyReactions(data.reacted);
      })
      .catch((err) => {
        if (!article) {
          setError(err.message);
          setLoading(false);
        }
      });
  }, [slug]);

  const handleReaction = async (reaction: keyof Reactions) => {
    if (!article || myReactions.includes(reaction)) return;

    try {
      const res = await fetch(`/api/articles/${article.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: reaction }),
      });
      if (res.ok) {
        const data = await res.json() as { reactions: Reactions; alreadyReacted: boolean };
        setArticle((prev) => prev ? { ...prev, reactions: data.reactions } : null);
        if (!data.alreadyReacted) {
          setMyReactions((prev) => [...prev, reaction]);
        }
      }
    } catch {
      // Silently fail
    }
  };

  const handleToggleFeatured = async () => {
    if (!article) return;

    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !article.featured }),
      });
      if (res.ok) {
        const updated = await res.json() as ArticleType;
        setArticle(updated);
      }
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async () => {
    if (!article) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        window.history.pushState({}, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      } else {
        throw new Error("Failed to delete");
      }
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
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

  if (error || !article) {
    return (
      <main className="main">
        <div className="container">
          <div className="error-state">
            <h1>Article not found</h1>
            <p className="text-muted mt-md">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <a href="/" className="btn mt-lg" style={{ display: "inline-block" }}>
              Back to home
            </a>
          </div>
        </div>
      </main>
    );
  }

  const date = new Date(article.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="main">
      <div className="container">
        <article className="article">
          <header className="article__header">
            <div className="article__nav">
              <a href="/" className="article__back">
                ← back to posts
              </a>
              {isAuthenticated && (
                <div className="article__actions">
                  <button
                    type="button"
                    className={`icon-btn ${article.featured ? "icon-btn--active" : ""}`}
                    onClick={handleToggleFeatured}
                    title={article.featured ? "Remove from featured" : "Mark as featured"}
                  >
                    {article.featured ? "★" : "☆"}
                  </button>
                  <a
                    href={`/edit/${article.slug}`}
                    className="icon-btn"
                    title="Edit article"
                  >
                    ✎
                  </a>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    title="Delete article"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            {article.featured && (
              <span className="article__featured-badge">★ featured</span>
            )}
            <h1 className="article__title">{article.title}</h1>
            <p className="article__meta">{date}</p>
          </header>

          <div
            className="article__content markdown-body"
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />

          <footer className="article__footer">
            <div className="reactions">
              {(["fire", "heart", "thinking", "clap"] as const).map((type) => {
                const isReacted = myReactions.includes(type);
                const emoji = { fire: "\u{1F525}", heart: "\u{2764}\u{FE0F}", thinking: "\u{1F914}", clap: "\u{1F44F}" };
                return (
                  <button
                    key={type}
                    className={`reaction-btn ${isReacted ? "reaction-btn--active" : ""}`}
                    type="button"
                    onClick={() => handleReaction(type)}
                    disabled={isReacted}
                  >
                    {emoji[type]}
                    <span className="reaction-btn__count">{article.reactions[type]}</span>
                  </button>
                );
              })}
            </div>
          </footer>
        </article>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal__title">Delete article?</h2>
              <p className="modal__text">
                This action cannot be undone. The article "{article.title}" will be permanently deleted.
              </p>
              <div className="modal__actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
