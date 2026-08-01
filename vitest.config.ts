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
		exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
		env: {
			// Unit tests never connect, but importing src/database builds a drizzle
			// client eagerly and requires a URL. Integration tests use their own
			// config and get the real URL from globalSetup.
			DATABASE_URL: "postgresql://unit-tests@localhost:5432/unit-tests",
		},
	},
});
