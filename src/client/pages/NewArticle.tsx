import { useState } from "react";
import type { Article } from "../../shared/types.ts";

export function NewArticle() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, featured }),
      });

      if (!res.ok) {
        throw new Error("Failed to create article");
      }

      const article = await res.json() as Article;

      // Navigate to the new article
      window.history.pushState({}, "", `/article/${article.slug}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  const handleCancel = () => {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <main className="main">
      <div className="container">
        <div className="editor">
          <header className="editor__header">
            <h1 className="editor__title">New Article</h1>
            <p className="editor__subtitle text-muted">Write in markdown</p>
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
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="content" className="form-label">Content</label>
              <textarea
                id="content"
                className="form-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Hello World&#10;&#10;Write your article in **markdown**..."
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
                {saving ? "Publishing..." : "Publish"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
