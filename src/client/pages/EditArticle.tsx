import { useState, useEffect } from "react";
import type { Article } from "../../shared/types.ts";

interface EditArticleProps {
  slug: string;
}

export function EditArticle({ slug }: EditArticleProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [featured, setFeatured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/articles/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Article not found");
        return res.json() as Promise<Article>;
      })
      .then((data) => {
        setArticle(data);
        setTitle(data.title);
        setContent(data.content);
        setFeatured(data.featured);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!article || !title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, featured }),
      });

      if (!res.ok) {
        throw new Error("Failed to update article");
      }

      const updated = await res.json() as Article;

      // Navigate to the updated article
      window.history.pushState({}, "", `/article/${updated.slug}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (article) {
      window.history.pushState({}, "", `/article/${article.slug}`);
    } else {
      window.history.pushState({}, "", "/");
    }
    window.dispatchEvent(new PopStateEvent("popstate"));
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

  if (error && !article) {
    return (
      <main className="main">
        <div className="container">
          <div className="error-state">
            <h1>Article not found</h1>
            <p className="text-muted mt-md">
              The article you're trying to edit doesn't exist.
            </p>
            <a href="/" className="btn mt-lg" style={{ display: "inline-block" }}>
              Back to home
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <div className="container">
        <div className="editor">
          <header className="editor__header">
            <h1 className="editor__title">Edit Article</h1>
            <p className="editor__subtitle text-muted">Editing: {article?.title}</p>
          </header>

          <form onSubmit={handleSubmit} className="editor__form">
            {error && (
              <div className="editor__error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="title" className="form-label">Title</label>
              <input
                type="text"
                id="title"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title..."
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="content" className="form-label">Content</label>
              <textarea
                id="content"
                className="form-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article in markdown..."
                disabled={saving}
                rows={15}
              />
              <p className="form-hint">
                Supports markdown: **bold**, *italic*, `code`, lists, headers, blockquotes
              </p>
            </div>

            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  disabled={saving}
                />
                <span className="form-checkbox__mark"></span>
                <span className="form-checkbox__label">Featured article</span>
              </label>
            </div>

            <div className="editor__actions">
              <button
                type="button"
                className="btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
