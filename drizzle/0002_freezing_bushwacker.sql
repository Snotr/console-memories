CREATE TABLE `article_views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` text NOT NULL,
	`count` integer DEFAULT 0,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_views_article_id_unique` ON `article_views` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_article_views_article` ON `article_views` (`article_id`);--> statement-breakpoint
CREATE TABLE `view_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`visitor_id` text NOT NULL,
	`article_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `view_logs_visitor_article` ON `view_logs` (`visitor_id`,`article_id`);--> statement-breakpoint
CREATE INDEX `idx_view_logs_article` ON `view_logs` (`article_id`);