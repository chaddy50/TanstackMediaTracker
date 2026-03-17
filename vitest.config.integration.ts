import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
	test: {
		environment: "node",
		globalSetup: ["./src/tests/integration/globalSetup.ts"],
		include: ["src/**/*.integration.test.ts"],
		passWithNoTests: true,
		fileParallelism: false,
	},
});
