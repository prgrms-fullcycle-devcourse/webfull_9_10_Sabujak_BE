import { createSchemaFactory } from "drizzle-orm/zod";
import {
  bigint,
  char,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "../openapi/zod-extend";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isoDateTimeStringSchema = z.string().datetime();

const {
  createSelectSchema: createOpenApiSelectSchema,
  createInsertSchema: createOpenApiInsertSchema,
} = createSchemaFactory({
  zodInstance: z,
});

export const capsules = pgTable(
  "capsules",
  {
    id: char("id", { length: 26 }).primaryKey(),
    slug: varchar("slug", { length: 50 }).notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    openAt: timestamp("open_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    version: integer("version").default(1).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex("capsules_slug_unq").on(table.slug),
    expiresAtIdx: index("capsules_expires_at_idx").on(table.expiresAt),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    capsuleId: char("capsule_id", { length: 26 })
      .notNull()
      .references(() => capsules.id, { onDelete: "cascade" }),
    nickname: varchar("nickname", { length: 20 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    capsuleNicknameUniqueIdx: uniqueIndex(
      "messages_capsule_id_nickname_unq",
    ).on(table.capsuleId, table.nickname),
    capsuleIdIdIdx: index("messages_capsule_id_id_idx").on(
      table.capsuleId,
      table.id,
    ),
  }),
);

export const selectCapsuleBaseSchema = createOpenApiSelectSchema(capsules, {
  slug: (schema: z.ZodString) => schema.regex(slugPattern),
  openAt: () => isoDateTimeStringSchema,
  expiresAt: () => isoDateTimeStringSchema,
  createdAt: () => isoDateTimeStringSchema,
  updatedAt: () => isoDateTimeStringSchema,
});

export const insertCapsuleBaseSchema = createOpenApiInsertSchema(capsules, {
  slug: (schema: z.ZodString) => schema.regex(slugPattern),
  openAt: () => isoDateTimeStringSchema,
  expiresAt: () => isoDateTimeStringSchema,
  createdAt: () => isoDateTimeStringSchema,
  updatedAt: () => isoDateTimeStringSchema,
});

export const selectMessageBaseSchema = createOpenApiSelectSchema(messages, {
  createdAt: () => isoDateTimeStringSchema,
});

export const insertMessageBaseSchema = createOpenApiInsertSchema(messages, {
  createdAt: () => isoDateTimeStringSchema,
});
