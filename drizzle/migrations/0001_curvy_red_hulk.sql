CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'ARCHIVE', 'RESTORE', 'DELETE', 'FINALIZE', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('CONTACT', 'CONTACT_ADDRESS', 'CONTACT_NOTE', 'PRODUCT', 'INVOICE', 'PAYMENT');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"performed_by" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_performed_by_user_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_performed_by_idx" ON "audit_events" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "audit_events_timestamp_idx" ON "audit_events" USING btree ("timestamp");