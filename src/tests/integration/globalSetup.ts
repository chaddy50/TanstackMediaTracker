import { execSync } from "child_process";

export async function setup() {
	const testUrl = process.env.DATABASE_URL_TEST;
	if (!testUrl) {
		throw new Error(
			"DATABASE_URL_TEST is not set. Create .env.test with DATABASE_URL_TEST pointing to your test database.",
		);
	}

	// Run migrations against the test database.
	// drizzle.config.ts reads DATABASE_URL from env; dotenv won't override it
	// because the variable is already set in the child process environment.
	execSync("npx drizzle-kit migrate", {
		env: { ...process.env, DATABASE_URL: testUrl },
		stdio: "inherit",
	});
}
