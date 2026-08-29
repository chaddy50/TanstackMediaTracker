import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
	test: {
		environment: "node",
		environmentMatchGlobs: [
			["src/components/**", "jsdom"],
			["src/features/**", "jsdom"],
		],
		setupFiles: ["./src/tests/setup.ts"],
		// .claude/worktrees holds linked worktrees *inside* this checkout, each with
		// its own src/ — without excluding it, a run from the main checkout collects
		// every worktree's tests too.
		exclude: [
			"**/*.integration.test.ts",
			"**/node_modules/**",
			"**/.claude/**",
		],
		env: {
			// Unit tests never connect, but importing src/database builds a drizzle
			// client eagerly and requires a URL. Integration tests use their own
			// config and get the real URL from globalSetup.
			DATABASE_URL: "postgresql://unit-tests@localhost:5432/unit-tests",
		},
	},
});
