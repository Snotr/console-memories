import type { Article, Reactions } from "../../shared/types.ts";

// List view excludes content/contentHtml
type ArticleListItem = Omit<Article, "content" | "contentHtml">;

interface ArticleCardProps {
  article: ArticleListItem;
  onReact?: (articleId: string, reaction: keyof Reactions) => void;
}

export function ArticleCard({ article, onReact }: ArticleCardProps) {
  const createdDate = new Date(article.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const updatedDate = new Date(article.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const wasUpdated = createdDate !== updatedDate;

  const handleReaction = (e: React.MouseEvent, reaction: keyof Reactions) => {
    e.preventDefault();
    e.stopPropagation();
    onReact?.(article.id, reaction);
  };

  const totalReactions =
    article.reactions.fire +
    article.reactions.heart +
    article.reactions.thinking +
    article.reactions.clap;

  return (
    <a
      href={`/article/${article.slug}`}
      className={`article-card ${article.featured ? "article-card--featured" : ""}`}
    >
      <div className="article-card__header">
        <h2 className="article-card__title">{article.title}</h2>
        {article.featured && (
          <span className="article-card__featured-badge">* featured</span>
        )}
      </div>
      <p className="article-card__meta">
        {createdDate}
        {wasUpdated && <span className="article-card__updated"> (updated {updatedDate})</span>}
        {article.views > 0 && <span className="article-card__views"> · {article.views} {article.views === 1 ? "view" : "views"}</span>}
      </p>
      <p className="article-card__excerpt">{article.excerpt}</p>
      <div className="article-card__footer">
        <div className="reactions">
          <button
            className="reaction-btn"
            type="button"
            onClick={(e) => handleReaction(e, "fire")}
          >
            {"\u{1F525}"}
            <span className="reaction-btn__count">{article.reactions.fire}</span>
          </button>
          <button
            className="reaction-btn"
            type="button"
            onClick={(e) => handleReaction(e, "heart")}
          >
            {"\u{2764}\u{FE0F}"}
            <span className="reaction-btn__count">{article.reactions.heart}</span>
          </button>
          <button
            className="reaction-btn"
            type="button"
            onClick={(e) => handleReaction(e, "thinking")}
          >
            {"\u{1F914}"}
            <span className="reaction-btn__count">{article.reactions.thinking}</span>
          </button>
          <button
            className="reaction-btn"
            type="button"
            onClick={(e) => handleReaction(e, "clap")}
          >
            {"\u{1F44F}"}
            <span className="reaction-btn__count">{article.reactions.clap}</span>
          </button>
        </div>
        <span className="read-more">
          read more →
        </span>
      </div>
    </a>
  );
}
