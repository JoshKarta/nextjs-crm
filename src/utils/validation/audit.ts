import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { auditEvents, type AuditEvent } from "@/db/schema";
import * as schema from "@/db/schema";

// Loosely typed so this helper works with any Drizzle transaction handle
// passed down from a service function, without importing the concrete `db`
// singleton (keeps this testable with a fake tx in unit tests).
export type Tx = PgTransaction<NodePgQueryResultHKT, typeof schema, any> | any;

export async function recordAuditEvent(
  tx: Tx,
  event: {
    entityType: AuditEvent["entityType"];
    entityId: string;
    action: AuditEvent["action"];
    performedBy: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await tx.insert(auditEvents).values(event);
}