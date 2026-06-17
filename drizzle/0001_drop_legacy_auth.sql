ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_unique";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "username";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
