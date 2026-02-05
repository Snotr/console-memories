import { useState } from "react";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError("Token is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error: string };
        throw new Error(data.error || "Login failed");
      }

      onLogin();
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  };

  return (
    <main className="main">
      <div className="container">
        <div className="editor">
          <header className="editor__header">
            <h1 className="editor__title">Login</h1>
            <p className="editor__subtitle text-muted">Enter admin token</p>
          </header>

          <form onSubmit={handleSubmit} className="editor__form">
            {error && <div className="editor__error">{error}</div>}

            <div className="form-group">
              <label htmlFor="token" className="form-label">
                Token
              </label>
              <input
                type="password"
                id="token"
                className="form-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your auth token..."
                disabled={submitting}
                autoFocus
              />
            </div>

            <div className="editor__actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting}
              >
                {submitting ? "Logging in..." : "Login"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
