import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { env } from '@/env';
import * as schema from "@/db/schema"
import * as relations from "@/db/relations"

export const db = drizzle(env.DATABASE_URL, { schema: { ...schema, ...relations } });