import { integer, timestamp, pgTable, text, primaryKey } from 'drizzle-orm/pg-core';
import { accounts, users, sessions, verificationTokens } from './schema'
import { and, eq } from 'drizzle-orm/expressions'

export const users = pgTable('users', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable("accounts", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => ({
  nameDoesntMatter: primaryKey(account.provider, account.providerAccountId)
}))

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull()
}, (vt) => ({
  nameDoesntMatter: primaryKey(vt.identifier, vt.token)
}))

/** @param {import("drizzle-orm/postgres-js").PostgresJsDatabase} [db] */
export default function DrizzleAuthAdapterPG(db) {
  return {
    createUser: async (data) => {
      return db
        .insert(users)
        .values(data)
        .returning()
        .then(res => res[0])
    },
    getUser: async (data) => {
      return db
        .select()
        .from(users)
        .where(eq(users.id, data))
        .then(res => res[0])
        ?? null
    },
    getUserByEmail: async (data) => {
      return db
        .select()
        .from(users)
        .where(eq(users.email, data))
        .then(res => res[0])
        ?? null
    },
    createSession: async (data) => {
      return db
        .insert(sessions)
        .values(data)
        .returning()
        .then(res => res[0])
    },
    getSessionAndUser: async (data) => {
      return db.select({
        session: sessions,
        user: users
      })
        .from(sessions)
        .where(eq(sessions.sessionToken, data))
        .innerJoin(users, eq(users.id, sessions.userId))
        .then(res => res[0])
        ?? null
    },
    updateUser: async (data) => {
      if (!data.id) {
        throw new Error("No user id.")
      }
      return db
        .update(users)
        .set(data)
        .where(eq(users.id, data.id))
        .returning()
        .then(res => res[0])
    },
    updateSession: async (data) => {
      return db
        .update(sessions)
        .set(data)
        .where(eq(sessions.sessionToken, data.sessionToken))
        .returning()
        .then(res => res[0])
    },
    linkAccount: async (rawAccount) => {
      const updatedAccount = await db
        .insert(accounts)
        .values(rawAccount)
        .returning()
        .then(res => res[0])
      const account = {
        ...updatedAccount,
        access_token: updatedAccount.access_token ?? undefined,
        token_type: updatedAccount.token_type ?? undefined,
        id_token: updatedAccount.id_token ?? undefined,
        refresh_token: updatedAccount.refresh_token ?? undefined,
        scope: updatedAccount.scope ?? undefined,
        expires_at: updatedAccount.expires_at ?? undefined,
        session_state: updatedAccount.session_state ?? undefined
      }
      return account
    },
    getUserByAccount: async (account) => {
      return db.select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        image: users.image,
        name: users.name
      })
        .from(users)
        .innerJoin(accounts, (
          and(
            eq(accounts.providerAccountId, account.providerAccountId),
            eq(accounts.provider, account.provider)
          )
        ))
        .then(res => res[0])
        ?? null
    }
    ,
    deleteSession: async (sessionToken) => {
      await db
        .delete(sessions)
        .where(eq(sessions.sessionToken, sessionToken))

    },
    createVerificationToken: async (token) => {
      return db
        .insert(verificationTokens)
        .values(token)
        .returning()
        .then(res => res[0])
    },
    useVerificationToken: async (token) => {
      try {
        return db
          .delete(verificationTokens)
          .where(
            and(
              eq(verificationTokens.identifier, token.identifier),
              eq(verificationTokens.token, token.token)
            )
          )
          .returning()
          .then(res => res[0])
          ?? null

      } catch (err) {
        throw new Error("No verification token found.")
      }
    },
    deleteUser: async (id) => {
      await db
        .delete(users)
        .where(eq(users.id, id))
        .returning()
        .then(res => res[0])
    },
    unlinkAccount: async (account) => {
      await db.delete(accounts)
        .where(
          and(
            eq(accounts.providerAccountId, account.providerAccountId),
            eq(accounts.provider, account.provider),
          )
        )

      return undefined
    }
  }
}