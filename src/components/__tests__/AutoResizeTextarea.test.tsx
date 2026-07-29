import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { renderToString } from "react-dom/server";
import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutoResizeTextarea } from "#/components/AutoResizeTextarea";
import {
	installResizeObserverStub,
	stubComputedStyle,
	stubScrollHeight,
} from "#/tests/autoResize";

let scrollHeightStub: ReturnType<typeof stubScrollHeight>;
let computedStyleSpy: MockInstance;

// `value` is required, so anything that types into the box needs a controlling owner.
function ControlledTextarea({
	maxRows,
	onValueChange,
}: {
	maxRows?: number;
	onValueChange?: (value: string) => void;
}) {
	const [value, setValue] = useState("");
	return (
		<AutoResizeTextarea
			value={value}
			maxRows={maxRows}
			onChange={(e) => {
				setValue(e.target.value);
				onValueChange?.(e.target.value);
			}}
		/>
	);
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

describe("AutoResizeTextarea", () => {
	it("renders with rows=6 by default", () => {
		render(<AutoResizeTextarea value="" onChange={vi.fn()} />);

		expect(screen.getByRole("textbox")).toHaveAttribute("rows", "6");
	});

	it("honors an explicit minRows", () => {
		render(<AutoResizeTextarea value="" onChange={vi.fn()} minRows={4} />);

		expect(screen.getByRole("textbox")).toHaveAttribute("rows", "4");
	});

	it("adds field-sizing-fixed and resize-none on top of the base textarea", () => {
		render(<AutoResizeTextarea value="" onChange={vi.fn()} />);

		const textarea = screen.getByRole("textbox");
		expect(textarea).toHaveClass(
			"field-sizing-fixed",
			"resize-none",
			"min-h-16",
		);
		expect(textarea).toHaveAttribute("data-slot", "textarea");
		expect(textarea).not.toHaveClass("field-sizing-content");
	});

	it("merges a caller className without dropping its own", () => {
		render(
			<AutoResizeTextarea value="" onChange={vi.fn()} className="w-full" />,
		);

		expect(screen.getByRole("textbox")).toHaveClass("w-full", "resize-none");
	});

	it("forwards value and onChange", () => {
		const onValueChange = vi.fn();
		render(<ControlledTextarea onValueChange={onValueChange} />);

		const textarea = screen.getByRole("textbox");
		fireEvent.change(textarea, { target: { value: "hello" } });

		expect(onValueChange).toHaveBeenCalledWith("hello");
		expect(textarea).toHaveValue("hello");
	});

	it("forwards arbitrary textarea props", () => {
		render(
			// biome-ignore lint/correctness/useUniqueElementIds: a fixed id is the point here — the assertion is that the prop reaches the DOM node
			<AutoResizeTextarea
				value=""
				onChange={vi.fn()}
				id="review-field"
				placeholder="Write your review..."
				autoFocus
			/>,
		);

		const textarea = screen.getByPlaceholderText("Write your review...");
		expect(textarea).toHaveAttribute("id", "review-field");
		expect(document.activeElement).toBe(textarea);

		cleanup();
		render(<AutoResizeTextarea value="" onChange={vi.fn()} disabled />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});

	it("grows as the controlled value grows", () => {
		scrollHeightStub.set(60);
		render(<ControlledTextarea />);

		const textarea = screen.getByRole("textbox");
		expect(textarea.style.height).toBe("62px");

		scrollHeightStub.set(200);
		fireEvent.change(textarea, { target: { value: "a much longer review" } });

		expect(textarea.style.height).toBe("202px");
	});

	it("clamps using the maxRows prop", () => {
		scrollHeightStub.set(400);
		render(<AutoResizeTextarea value="long" onChange={vi.fn()} maxRows={3} />);

		const textarea = screen.getByRole("textbox");
		expect(textarea.style.height).toBe("90px");
		expect(textarea.style.overflowY).toBe("auto");
	});

	it("renders on the server without measuring anything", () => {
		// The sizing lives in effects, which never run during renderToString — make the
		// measurement APIs throw so a stray render-time call cannot pass silently.
		computedStyleSpy.mockImplementation(() => {
			throw new Error("getComputedStyle must not run while rendering");
		});
		vi.stubGlobal(
			"ResizeObserver",
			class {
				constructor() {
					throw new Error(
						"ResizeObserver must not be constructed while rendering",
					);
				}
			},
		);

		const html = renderToString(
			<AutoResizeTextarea value="some review" onChange={vi.fn()} minRows={6} />,
		);

		expect(html).toContain('rows="6"');
		expect(html).toContain("resize-none");
		expect(html).not.toContain("height:");
	});
});
