ALTER TABLE "backup_codes" ADD COLUMN "code_lookup" text;--> statement-breakpoint
CREATE UNIQUE INDEX "backup_codes_code_lookup_idx" ON "backup_codes" USING btree ("code_lookup");--> statement-breakpoint
