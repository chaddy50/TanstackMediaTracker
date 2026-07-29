import { act, cleanup, render, renderHook } from "@testing-library/react";
import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAutoResizeTextarea } from "#/components/hooks/useAutoResizeTextarea";
import {
	installResizeObserverStub,
	ResizeObserverStub,
	stubComputedStyle,
	stubScrollHeight,
} from "#/tests/autoResize";

// With the stubbed styles: lineHeight 24, paddingY 16, borderY 2.
// maxPx = maxRows * 24 + 18; height = min(scrollHeight + 2, maxPx).

let scrollHeightStub: ReturnType<typeof stubScrollHeight>;
let computedStyleSpy: MockInstance;
let latestResize: () => void;

// The ref has to be attached during render — the hook's effect runs before a test could
// assign it, so renderHook alone can only cover the unattached case.
function Harness({ value, maxRows }: { value: string; maxRows: number }) {
	const { textareaRef, resize } = useAutoResizeTextarea({ value, maxRows });
	latestResize = resize;
	return <textarea ref={textareaRef} value={value} readOnly />;
}

function renderHarness(value: string, maxRows: number) {
	const view = render(<Harness value={value} maxRows={maxRows} />);
	const textarea = view.container.querySelector(
		"textarea",
	) as HTMLTextAreaElement;
	return { ...view, textarea };
}

beforeEach(() => {
	scrollHeightStub = stubScrollHeight(0);
	computedStyleSpy = stubComputedStyle();
	installResizeObserverStub();
});

afterEach(() => {
	cleanup();
	scrollHeightStub.restore();
	computedStyleSpy.mockRestore();
});

describe("useAutoResizeTextarea", () => {
	it("sets an explicit pixel height on mount", () => {
		scrollHeightStub.set(100);

		const { textarea } = renderHarness("hello", 20);

		expect(textarea.style.height).toBe("102px");
		expect(textarea.style.overflowY).toBe("hidden");
	});

	it("resets height to auto before measuring scrollHeight", () => {
		scrollHeightStub.set(100);

		renderHarness("hello", 20);

		expect(scrollHeightStub.sawHeights).toContain("auto");
	});

	it("grows when the value gets longer", () => {
		scrollHeightStub.set(60);
		const { textarea, rerender } = renderHarness("short", 20);
		expect(textarea.style.height).toBe("62px");

		scrollHeightStub.set(140);
		rerender(<Harness value="a much longer review" maxRows={20} />);

		expect(textarea.style.height).toBe("142px");
		expect(textarea.style.overflowY).toBe("hidden");
	});

	it("shrinks when text is deleted", () => {
		scrollHeightStub.set(300);
		const { textarea, rerender } = renderHarness("a very long review", 20);
		expect(textarea.style.height).toBe("302px");

		scrollHeightStub.set(60);
		rerender(<Harness value="short" maxRows={20} />);

		expect(textarea.style.height).toBe("62px");
	});

	it("clamps at maxRows and enables internal scrolling", () => {
		scrollHeightStub.set(500);

		const { textarea } = renderHarness("a very long review", 6);

		expect(textarea.style.height).toBe("162px");
		expect(textarea.style.overflowY).toBe("auto");
	});

	it("tracks the maxRows prop when clamping", () => {
		scrollHeightStub.set(500);

		const { textarea, rerender } = renderHarness("a very long review", 3);
		expect(textarea.style.height).toBe("90px");
		expect(textarea.style.overflowY).toBe("auto");

		rerender(<Harness value="a very long review" maxRows={12} />);

		expect(textarea.style.height).toBe("306px");
		expect(textarea.style.overflowY).toBe("auto");
	});

	it("does not treat content exactly at the clamp as overflowing", () => {
		scrollHeightStub.set(160); // 160 + borderY === maxPx for maxRows 6

		const { textarea } = renderHarness("just fits", 6);

		expect(textarea.style.height).toBe("162px");
		expect(textarea.style.overflowY).toBe("hidden");
	});

	it("falls back to a derived line height when lineHeight computes to normal", () => {
		computedStyleSpy.mockRestore();
		computedStyleSpy = stubComputedStyle({
			lineHeight: "normal",
			fontSize: "16px",
		});
		scrollHeightStub.set(5000);

		const { textarea } = renderHarness("a very long review", 20);

		expect(textarea.style.height).toMatch(/^\d+(\.\d+)?px$/);
		expect(Number.parseFloat(textarea.style.height)).toBeLessThan(5002);
		expect(textarea.style.overflowY).toBe("auto");
	});

	it("does nothing when the ref is never attached", () => {
		const { result } = renderHook(() =>
			useAutoResizeTextarea({ value: "x", maxRows: 6 }),
		);

		expect(() => result.current.resize()).not.toThrow();
		const wasMeasured = computedStyleSpy.mock.calls.some(
			([element]) => element instanceof HTMLTextAreaElement,
		);
		expect(wasMeasured).toBe(false);
	});

	it("recomputes when the ResizeObserver fires", () => {
		scrollHeightStub.set(60);
		const { textarea } = renderHarness("unchanged text", 6);
		expect(textarea.style.height).toBe("62px");

		scrollHeightStub.set(500);
		const observer = ResizeObserverStub.instances[0];
		act(() => observer.callback([], observer as unknown as ResizeObserver));

		expect(textarea.style.height).toBe("162px");
		expect(textarea.style.overflowY).toBe("auto");
	});

	it("recomputes on demand when resize is called", () => {
		scrollHeightStub.set(60);
		const { textarea } = renderHarness("unchanged text", 20);
		expect(textarea.style.height).toBe("62px");

		scrollHeightStub.set(200);
		act(() => latestResize());

		expect(textarea.style.height).toBe("202px");
	});

	it("disconnects the observer on unmount", () => {
		const { unmount } = renderHarness("hello", 20);
		const observer = ResizeObserverStub.instances[0];

		unmount();

		expect(observer.disconnect).toHaveBeenCalledTimes(1);
	});
});
