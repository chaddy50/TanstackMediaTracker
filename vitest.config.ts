import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
	test: {
		environment: "node",
		environmentMatchGlobs: [["src/components/**", "jsdom"]],
		setupFiles: ["./src/test-setup.ts"],
	},
});
