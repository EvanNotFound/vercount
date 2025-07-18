import { relations } from "drizzle-orm/relations";
import { users, accounts, sessions, domains } from "./schema";

export const accountRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const userRelations = relations(users, ({many}) => ({
	accounts: many(accounts),
	sessions: many(sessions),
	domains: many(domains),
}));

export const sessionRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const domainRelations = relations(domains, ({one}) => ({
	user: one(users, {
		fields: [domains.userId],
		references: [users.id]
	}),
}));