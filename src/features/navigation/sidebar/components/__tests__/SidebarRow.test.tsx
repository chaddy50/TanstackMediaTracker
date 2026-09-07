import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { View } from "#/features/screens/customView/view";
import { SidebarRow } from "../SidebarRow";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
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

		expect(
			screen.getByRole("button", { name: "viewGroups.dragToReorder" }),
		).toHaveClass("touch-none");
	});
});
