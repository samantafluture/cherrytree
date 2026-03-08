CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outline_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_collapsed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) DEFAULT 'My Outline' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" varchar(255),
	"github_id" varchar(100),
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_outline_id_outlines_id_fk" FOREIGN KEY ("outline_id") REFERENCES "public"."outlines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlines" ADD CONSTRAINT "outlines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_nodes_parent" ON "nodes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_nodes_outline" ON "nodes" USING btree ("outline_id");--> statement-breakpoint
CREATE INDEX "idx_nodes_sibling_order" ON "nodes" USING btree ("parent_id","position");--> statement-breakpoint
CREATE INDEX "idx_sessions_token" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_sessions_expiry" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_users_github" ON "users" USING btree ("github_id");