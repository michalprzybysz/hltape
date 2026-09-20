CREATE TYPE "public"."execution_status" AS ENUM('success', 'failed', 'pending');--> statement-breakpoint
CREATE TYPE "public"."order_side" AS ENUM('long', 'short');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('open', 'filled', 'canceled', 'expired', 'closed');--> statement-breakpoint
CREATE TABLE "agent_wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"master_wallet_id" text NOT NULL,
	"agent_address" text NOT NULL,
	"encrypted_private_key" text NOT NULL,
	"label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"asset_index" integer,
	"instrument" text,
	"hl_order_id" text NOT NULL,
	"old_hl_order_id" text,
	"new_hl_order_id" text,
	"old_trigger_price" numeric(30, 10),
	"new_trigger_price" numeric(30, 10) NOT NULL,
	"status" "execution_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"api_response" jsonb,
	"execution_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"hl_order_id" text NOT NULL,
	"instrument" text NOT NULL,
	"asset_index" integer NOT NULL,
	"side" "order_side" DEFAULT 'long' NOT NULL,
	"trigger_price" numeric(30, 10) NOT NULL,
	"size" numeric(30, 10) NOT NULL,
	"status" "order_status" DEFAULT 'open' NOT NULL,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"trailing" boolean DEFAULT false NOT NULL,
	"trailing_distance" numeric(10, 6),
	"leverage" numeric(4, 0) DEFAULT 1 NOT NULL,
	CONSTRAINT "order_hl_order_id_unique" UNIQUE("hl_order_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_address" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address" text NOT NULL,
	"chain_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_wallet" ADD CONSTRAINT "agent_wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_wallet" ADD CONSTRAINT "agent_wallet_master_wallet_id_wallet_address_id_fk" FOREIGN KEY ("master_wallet_id") REFERENCES "public"."wallet_address"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_log" ADD CONSTRAINT "execution_log_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_log" ADD CONSTRAINT "execution_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_address" ADD CONSTRAINT "wallet_address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_wallet_user_main_idx" ON "agent_wallet" USING btree ("user_id","master_wallet_id");--> statement-breakpoint
CREATE INDEX "agent_active_idx" ON "agent_wallet" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "execution_log_order_idx" ON "execution_log" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "execution_log_user_idx" ON "execution_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "execution_log_created_idx" ON "execution_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "active_trailing_idx" ON "order" USING btree ("instrument") WHERE "order"."status" = 'open' AND "order"."trailing" = true;--> statement-breakpoint
CREATE INDEX "user_order_idx" ON "order" USING btree ("user_id","status");