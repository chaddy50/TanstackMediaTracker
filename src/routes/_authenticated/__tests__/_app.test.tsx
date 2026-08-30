// @vitest-environment jsdom
// src/routes/** is not in the config's jsdom globs, and this suite renders the layout.

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: { component: () => React.ReactNode }) =>
		options,
	Outlet: () => <div data-testid="outlet" />,
}));

vi.mock("#/features/navigation/sidebar/Sidebar", () => ({
	Sidebar: () => <aside data-testid="sidebar" />,
}));
vi.mock("#/features/navigation/bottomNavBar/BottomNavBar", () => ({
	BottomNavBar: () => <nav data-testid="bottom-nav" />,
}));

// `createFileRoute` is stubbed above to hand back its options object, so the route's
// real type no longer describes what this import actually holds.
const routeModule = (await import(
	"#/routes/_authenticated/_app"
)) as unknown as { Route: { component: () => React.ReactElement } };
const AppLayout = routeModule.Route.component;

afterEach(cleanup);

// The app never scrolls `window`, so without this attribute the router falls back to
// a positional CSS selector and scroll restoration breaks silently.
describe("AppLayout scroll restoration id", () => {
	it("marks the scrolling container with the restoration id", () => {
		const { container } = render(<AppLayout />);

		const scrollContainer = container.querySelector(
			'[data-scroll-restoration-id="app-content"]',
		);

		expect(scrollContainer).not.toBeNull();
		expect(scrollContainer?.className).toContain("overflow-y-auto");
	});

	it("puts the id on the scrolling element rather than the outer wrapper", () => {
		const { container } = render(<AppLayout />);

		const outerWrapper = container.firstElementChild;

		expect(outerWrapper?.className).toContain("overflow-hidden");
		expect(outerWrapper?.hasAttribute("data-scroll-restoration-id")).toBe(
			false,
		);
	});
});
