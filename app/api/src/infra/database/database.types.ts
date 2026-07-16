import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema/users.schema';

export type AppDatabase = NodePgDatabase<typeof schema>;