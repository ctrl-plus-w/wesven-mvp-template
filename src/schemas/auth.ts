import { relations, sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const user = pgTable(
  'user',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),

    image: text('image'),

    role: text('role'),
    banned: boolean('banned').default(false),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    userNameSearchIndex: index('user_name_search_index').using('gin', sql`to_tsvector('simple', ${table.name})`),
  }),
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const session = pgTable('session', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  impersonatedBy: text('impersonated_by'),

  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const account = pgTable('account', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),

  providerId: text('provider_id').notNull(),

  accountId: uuid('account_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
  account: one(account, {
    fields: [account.accountId],
    references: [account.id],
  }),
}));

export const verification = pgTable('verification', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  identifier: text('identifier').notNull(),
  value: text('value').notNull(),

  expiresAt: timestamp('expires_at').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
