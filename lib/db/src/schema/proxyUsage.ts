import { pgTable, text, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const proxyUsage = pgTable("proxy_usage", {
  membershipId:  text("membership_id").notNull(),
  billingMonth:  text("billing_month").notNull(), // YYYY-MM
  sessions:      integer("sessions").notNull().default(0),
  warnedAt80:    boolean("warned_at_80").notNull().default(false),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.membershipId, t.billingMonth] })]);
