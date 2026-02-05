CREATE TABLE `reaction_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`visitor_id` text NOT NULL,
	`article_id` text NOT NULL,
	`reaction_type` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reaction_logs_visitor_article_type` ON `reaction_logs` (`visitor_id`,`article_id`,`reaction_type`);--> statement-breakpoint
CREATE INDEX `idx_reaction_logs_article` ON `reaction_logs` (`article_id`);