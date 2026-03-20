import { relations } from "drizzle-orm";
import {
  bigint,
  char,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const capsules = pgTable(
  "capsules",
  {
    id: char("id", { length: 26 }).primaryKey(),
    slug: varchar("slug", { length: 50 }).notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    openAt: timestamp("open_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
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

export const capsulesRelations = relations(capsules, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  capsule: one(capsules, {
    fields: [messages.capsuleId],
    references: [capsules.id],
  }),
}));
