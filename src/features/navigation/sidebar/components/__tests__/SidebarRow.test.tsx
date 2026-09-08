import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { View } from "#/features/screens/customView/view";
import { SidebarRow } from "../SidebarRow";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: Record<string, unknown>) =>
			options?.name ? `${key}:${options.name}` : key,
	}),
}));

// jsdom cannot synthesize a pointer drag, so the draggable hook is stubbed and
// the id it registers — plus the dragging state — is controlled from here.
let registeredDraggableId: unknown;
let isDragging = false;
vi.mock("@dnd-kit/core", () => ({
	useDraggable: (options: { id: unknown }) => {
		registeredDraggableId = options.id;
		return {
			attributes: {},
			listeners: {},
			setNodeRef: vi.fn(),
			isDragging,
		};
	},
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
	}: {
		children: ReactNode;
		params?: Record<string, string>;
	}) => <a href={`/views/${params?.viewId}`}>{children}</a>,
}));

const TIMESTAMP = new Date("2026-01-01T00:00:00Z");

const VIEW = {
	id: 7,
	userId: "user-a",
	name: "Fantasy books",
	subject: "items",
	filters: {},
	displayOrder: 0,
	groupId: null,
	createdAt: TIMESTAMP,
	updatedAt: TIMESTAMP,
} as unknown as View;

function renderRow(props: { isNested?: boolean } = {}) {
	const registerRow = vi.fn();
	render(<SidebarRow view={VIEW} registerRow={registerRow} {...props} />);
	return { registerRow };
}

beforeEach(() => {
	registeredDraggableId = undefined;
	isDragging = false;
});

afterEach(cleanup);

describe("SidebarRow", () => {
	it("registers itself under its row key", () => {
		renderRow();

		expect(registeredDraggableId).toBe("view:7");
	});

	it("hands its node to the measurer under the same key", () => {
		const { registerRow } = renderRow();

		expect(registerRow).toHaveBeenCalledWith("view:7", expect.anything());
	});

	it("indents a row that sits inside a group", () => {
		renderRow({ isNested: true });

		expect(screen.getByText("Fantasy books").closest("div")).toHaveClass(
			"pl-6",
		);
	});

	it("does not indent a row at the top level", () => {
		renderRow();

		expect(screen.getByText("Fantasy books").closest("div")).not.toHaveClass(
			"pl-6",
		);
	});

	it("applies no transform of its own", () => {
		// The row must not move for the duration of a drag: stillness is what
		// keeps the geometry measured at drag start true.
		isDragging = true;
		renderRow();

		const row = screen.getByText("Fantasy books").closest("div[style]");
		expect(row).not.toHaveStyle({ transform: "translate3d(0px, 0px, 0)" });
	});

	it("fades while it is the row being dragged", () => {
		isDragging = true;
		renderRow();

		const row = screen.getByText("Fantasy books").closest("div[style]");
		expect(row).toHaveStyle({ opacity: "0.4" });
	});

	it("puts the drag affordance on a handle that will not fight a touch scroll", () => {
		renderRow();

		// The name is in the label because an aria-label replaces the accessible
		// name — every handle would otherwise announce identically.
		expect(getHandle()).toHaveClass("touch-none");
	});

	// jsdom runs no CSS engine and Tailwind does not compile under Vitest, so
	// these assert that the utilities are applied — the layout they produce is
	// manual QA. They still pin the mechanism: a handle that reserves width is
	// the defect, and an opacity-only reveal is how it came back.
	describe("drag handle slot", () => {
		it("renders the view name in a truncating element", () => {
			renderRow();

			expect(screen.getByText("Fantasy books")).toHaveClass("truncate");
		});

		it("reserves no width for the handle until the row is wanted", () => {
			renderRow();

			expect(getHandle().parentElement).toHaveClass("w-0", "overflow-hidden");
		});

		it("opens the handle slot on hover", () => {
			renderRow();

			expect(getHandle().parentElement).toHaveClass("group-hover:w-6");
		});

		it("opens the handle slot when the handle takes focus", () => {
			// The keyboard reorder steers from this button, so a slot that only
			// opened on hover would hide the control the user is driving.
			renderRow();

			expect(getHandle().parentElement).toHaveClass("group-focus-within:w-6");
		});

		it("keeps the handle open where there is no hover", () => {
			// Clipped to w-0 the handle is untappable, and the drag registers a
			// TouchSensor — so a coarse pointer gets it permanently.
			renderRow();

			expect(getHandle().parentElement).toHaveClass("pointer-coarse:w-6");
		});

		it("keeps the handle in the tab order", () => {
			renderRow();

			expect(getHandle()).not.toHaveAttribute("tabindex", "-1");
		});

		it("hangs the hover slot off the row's group", () => {
			// Without the group on the row, every group-hover variant above is inert.
			renderRow();

			expect(
				screen.getByText("Fantasy books").closest("div[style]"),
			).toHaveClass("group");
		});
	});
});

function getHandle() {
	return screen.getByRole("button", {
		name: "viewGroups.dragToReorder:Fantasy books",
	});
}
