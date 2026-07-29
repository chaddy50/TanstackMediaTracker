import "@testing-library/jest-dom/vitest";

// jsdom ships no ResizeObserver, and useAutoResizeTextarea constructs one on mount.
// `??=` leaves any suite-local capturing stub in place.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;
