import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	plugins: [
		devtools(),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		VitePWA({
			registerType: "autoUpdate",
			injectRegister: null,
			manifest: false,
			workbox: {
				globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
				navigateFallback: null,
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/.+\.(png|jpg|jpeg|webp|svg)/,
						handler: "CacheFirst",
						options: {
							cacheName: "cover-images",
							expiration: {
								maxEntries: 500,
								maxAgeSeconds: 30 * 24 * 60 * 60,
							},
							cacheableResponse: { statuses: [0, 200] },
						},
					},
				],
			},
		}),
	],
});

export default config;
