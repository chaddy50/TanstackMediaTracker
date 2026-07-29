import { vi } from "vitest";

/**
 * Test helpers for the auto-resizing textarea. jsdom never lays out, so `scrollHeight` is
 * always 0 and `getComputedStyle` returns defaults — without these stubs every height
 * assertion collapses to `0px` and only the `line-height: normal` branch is ever reached.
 */

const DEFAULT_STYLE_OVERRIDES: Record<string, string> = {
	lineHeight: "24px",
	paddingTop: "8px",
	paddingBottom: "8px",
	borderTopWidth: "1px",
	borderBottomWidth: "1px",
	fontSize: "16px",
};

interface ScrollHeightStub {
	/** Heights read off `style.height` at each `scrollHeight` access, oldest first. */
	sawHeights: string[];
	set: (heightInPixels: number) => void;
	restore: () => void;
}

export function stubScrollHeight(initialHeight = 0): ScrollHeightStub {
	let currentHeight = initialHeight;
	const sawHeights: string[] = [];

	Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
		configurable: true,
		get(this: HTMLTextAreaElement) {
			sawHeights.push(this.style.height);
			return currentHeight;
		},
	});

	return {
		sawHeights,
		set(heightInPixels: number) {
			currentHeight = heightInPixels;
		},
		restore() {
			// MarkdownTextBlock and ExpandableTextBlock also read scrollHeight, so the stub
			// must not outlive the suite that installed it.
			Reflect.deleteProperty(HTMLTextAreaElement.prototype, "scrollHeight");
		},
	};
}

/**
 * Overrides only the requested properties, proxying everything else to the real
 * declaration — jsdom, Radix and jest-dom all call `getComputedStyle` on unrelated
 * elements, and a bare object literal breaks them.
 */
export function stubComputedStyle(overrides: Record<string, string> = {}) {
	const styleOverrides = { ...DEFAULT_STYLE_OVERRIDES, ...overrides };
	const realGetComputedStyle = window.getComputedStyle.bind(window);

	return vi
		.spyOn(window, "getComputedStyle")
		.mockImplementation((element: Element, pseudoElement?: string | null) => {
			const declaration = realGetComputedStyle(element, pseudoElement);
			return new Proxy(declaration, {
				get(target, property) {
					if (typeof property === "string" && property in styleOverrides) {
						return styleOverrides[property];
					}
					const value = Reflect.get(target, property);
					return typeof value === "function" ? value.bind(target) : value;
				},
			});
		});
}

/** Capturing ResizeObserver stub, so a test can fire the callback itself. */
export class ResizeObserverStub {
	static instances: ResizeObserverStub[] = [];

	readonly disconnect = vi.fn();

	constructor(readonly callback: ResizeObserverCallback) {
		ResizeObserverStub.instances.push(this);
	}

	observe() {}
	unobserve() {}

	static reset() {
		ResizeObserverStub.instances = [];
	}
}

export function installResizeObserverStub() {
	ResizeObserverStub.reset();
	vi.stubGlobal("ResizeObserver", ResizeObserverStub);
}
