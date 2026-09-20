ALTER TABLE "order"
ADD COLUMN "initial_trigger_price" numeric(30, 10) DEFAULT 0 NOT NULL;

ALTER TABLE "order"
ALTER COLUMN "initial_trigger_price" DROP DEFAULT;
