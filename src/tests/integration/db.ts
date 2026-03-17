import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "#/db/schema";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
	throw new Error("DATABASE_URL_TEST is not set");
}

export const testDb = drizzle(testDatabaseUrl, { schema });
