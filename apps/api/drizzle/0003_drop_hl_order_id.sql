ALTER TABLE "order" DROP COLUMN IF EXISTS "hl_order_id";--> statement-breakpoint
ALTER TABLE "execution_log" DROP COLUMN IF EXISTS "hl_order_id";--> statement-breakpoint
ALTER TABLE "execution_log" DROP COLUMN IF EXISTS "old_hl_order_id";--> statement-breakpoint
ALTER TABLE "execution_log" DROP COLUMN IF EXISTS "new_hl_order_id";
