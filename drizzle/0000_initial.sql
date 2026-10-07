CREATE TABLE `agent_jobs` (
	`question_id` text PRIMARY KEY NOT NULL,
	`response_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_agent_jobs_status_lease` ON `agent_jobs` (`status`,`lease_until`);--> statement-breakpoint
CREATE TABLE `clustering` (
	`run_id` text,
	`response_id` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`job_started_at` integer,
	`attempt_started_at` integer,
	`work_lease_until` integer DEFAULT 0 NOT NULL,
	`question_ids` text DEFAULT '[]' NOT NULL,
	`job_input_hash` text DEFAULT '' NOT NULL,
	`duration_ms` integer,
	`id` integer PRIMARY KEY NOT NULL,
	`snapshot` text DEFAULT '[]' NOT NULL,
	`input_hash` text DEFAULT '' NOT NULL,
	`updated_at` integer,
	`last_checked` integer,
	`next_run` integer DEFAULT 0 NOT NULL,
	`lock_until` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`is_agent` integer DEFAULT 0 NOT NULL,
	`sources` text DEFAULT '[]' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`body` text NOT NULL,
	`author_id` text NOT NULL,
	`name` text,
	`ministry` text,
	`anonymous` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_comments_question_created` ON `comments` (`question_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`can_cluster` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`author_id` text NOT NULL,
	`name` text,
	`ministry` text,
	`anonymous` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_questions_created` ON `questions` (`created_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `theme_assignment_jobs` (
	`question_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_theme_assignment_status_lease` ON `theme_assignment_jobs` (`status`,`lease_until`);--> statement-breakpoint
CREATE TABLE `votes` (
	`count` integer DEFAULT 1 NOT NULL,
	`question_id` text NOT NULL,
	`participant_id` text NOT NULL,
	PRIMARY KEY(`question_id`, `participant_id`),
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action
);
