import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ViewGroup } from "#/features/screens/customView/viewGroup";
import { SidebarGroupHeader } from "../SidebarGroupHeader";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: Record<string, unknown>) =>
			options?.name ? `${key}:${options.name}` : key,
	}),
}));

let registeredDraggableId: unknown;
vi.mock("@dnd-kit/core", () => ({
	useDraggable: (options: { id: unknown }) => {
		registeredDraggableId = options.id;
		return {
			attributes: {},
			listeners: {},
			setNodeRef: vi.fn(),
			isDragging: false,
		};
	},
}));

const TIMESTAMP = new Date("2026-01-01T00:00:00Z");

const GROUP = {
	id: 10,
	userId: "user-a",
	name: "Reading now",
	displayOrder: 0,
	isCollapsed: false,
	createdAt: TIMESTAMP,
	updatedAt: TIMESTAMP,
} as unknown as ViewGroup;

function renderHeader(props: { isOpen?: boolean } = {}) {
	const onToggleCollapsed = vi.fn();
	const onEdit = vi.fn();
	const registerRow = vi.fn();

	render(
		<SidebarGroupHeader
			group={GROUP}
			viewCount={2}
			isOpen={props.isOpen ?? true}
			registerRow={registerRow}
			onToggleCollapsed={onToggleCollapsed}
			onEdit={onEdit}
		/>,
	);

	return { onToggleCollapsed, onEdit, registerRow };
}

beforeEach(() => {
	registeredDraggableId = undefined;
});

afterEach(cleanup);

describe("SidebarGroupHeader", () => {
	it("registers itself under its row key", () => {
		renderHeader();

		expect(registeredDraggableId).toBe("groupHeader:10");
	});

	it("names the group and says whether it is open", () => {
		renderHeader();

		expect(screen.getByText("Reading now")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "viewGroups.collapse:Reading now" }),
		).toHaveAttribute("aria-expanded", "true");
	});

	it("reports itself closed when the group is collapsed", () => {
		renderHeader({ isOpen: false });

		expect(
			screen.getByRole("button", { name: "viewGroups.expand:Reading now" }),
		).toHaveAttribute("aria-expanded", "false");
	});

	it("names the group in every control, not just the toggle", () => {
		// An aria-label replaces a control's accessible name, so without the group
		// name each button announces identically and the visible name is lost.
		renderHeader();

		for (const key of [
			"viewGroups.collapse",
			"viewGroups.rename",
			"viewGroups.dragToReorder",
		]) {
			expect(
				screen.getByRole("button", { name: `${key}:Reading now` }),
			).toBeInTheDocument();
		}
	});

	it("renders the header alone, with none of the group's views inside it", () => {
		// A header that contained its own views would be a box overlapping every
		// box within it — the overlap that made drops near a group's edge
		// resolve unpredictably.
		renderHeader();

		expect(screen.queryByRole("link")).toBeNull();
	});

	it("toggles and edits through its own controls", () => {
		const { onToggleCollapsed, onEdit } = renderHeader();

		fireEvent.click(
			screen.getByRole("button", { name: "viewGroups.collapse:Reading now" }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "viewGroups.rename:Reading now" }),
		);

		expect(onToggleCollapsed).toHaveBeenCalledOnce();
		expect(onEdit).toHaveBeenCalledOnce();
	});
});
