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

const capsuleIdSchema = z.string().length(26);
const messageIdSchema = z.number().int();
const slugSchema = z.string().min(1).max(50).regex(slugPattern);
const titleSchema = z.string().min(1).max(100);
const versionSchema = z.number().int();
const passwordHashSchema = z.string().min(1).max(255);
const nicknameSchema = z.string().min(1).max(20);
const messageContentSchema = z.string().min(1);

export const selectCapsuleBaseSchema = z.object({
  id: capsuleIdSchema,
  slug: slugSchema,
  title: titleSchema,
  openAt: isoDateTimeStringSchema,
  expiresAt: isoDateTimeStringSchema,
  version: versionSchema,
  passwordHash: passwordHashSchema,
  createdAt: isoDateTimeStringSchema,
  updatedAt: isoDateTimeStringSchema,
});

export const insertCapsuleBaseSchema = z.object({
  id: capsuleIdSchema.optional(),
  slug: slugSchema,
  title: titleSchema,
  openAt: isoDateTimeStringSchema,
  expiresAt: isoDateTimeStringSchema.optional(),
  version: versionSchema.optional(),
  passwordHash: passwordHashSchema.optional(),
  createdAt: isoDateTimeStringSchema.optional(),
  updatedAt: isoDateTimeStringSchema.optional(),
});

export const selectMessageBaseSchema = z.object({
  id: messageIdSchema,
  capsuleId: capsuleIdSchema,
  nickname: nicknameSchema,
  content: messageContentSchema,
  createdAt: isoDateTimeStringSchema,
});

export const insertMessageBaseSchema = z.object({
  id: messageIdSchema.optional(),
  capsuleId: capsuleIdSchema.optional(),
  nickname: nicknameSchema,
  content: messageContentSchema,
  createdAt: isoDateTimeStringSchema.optional(),
});
