import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getViews, type View } from "#/features/screens/customView/view";
import {
	getViewGroups,
	setViewGroupCollapsed,
	type ViewGroup,
} from "#/features/screens/customView/viewGroup";
import type { DropSlot } from "../dropSlots";
import { Sidebar } from "../Sidebar";
import { toSidebarRows } from "../sidebarRows";
import { useSidebarDrag } from "../useSidebarDrag";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/features/screens/customView/view", () => ({ getViews: vi.fn() }));
vi.mock("#/features/screens/customView/viewGroup", () => ({
	getViewGroups: vi.fn(),
	setViewGroupCollapsed: vi.fn(),
}));

// The drag hook has its own suite; here it is a controllable fixture so this
// stays about what the sidebar renders and wires up.
vi.mock("../useSidebarDrag", async () => {
	const actual =
		await vi.importActual<typeof import("../useSidebarDrag")>(
			"../useSidebarDrag",
		);
	return { ...actual, useSidebarDrag: vi.fn() };
});

vi.mock("@dnd-kit/core", () => ({
	DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	DragOverlay: ({
		children,
		zIndex,
		dropAnimation,
	}: {
		children: ReactNode;
		zIndex?: number;
		dropAnimation?: unknown;
	}) => (
		<div
			data-testid="drag-overlay"
			data-z-index={zIndex}
			data-drop-animation={dropAnimation === null ? "off" : "on"}
		>
			{children}
		</div>
	),
	useDraggable: () => ({
		attributes: {},
		listeners: {},
		setNodeRef: vi.fn(),
		isDragging: false,
	}),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		params,
	}: {
		children: ReactNode;
		to: string;
		params?: Record<string, string>;
	}) => (
		<a href={params?.viewId ? `/views/${params.viewId}` : to}>{children}</a>
	),
}));

vi.mock("#/features/screens/customView/CreateViewDialog", () => ({
	CreateViewDialog: ({ isOpen }: { isOpen: boolean }) =>
		isOpen ? <div>create-view-dialog</div> : null,
}));

vi.mock("../components/ViewGroupDialog", () => ({
	ViewGroupDialog: ({ group }: { group?: ViewGroup }) => (
		<div>view-group-dialog:{group ? group.name : "new"}</div>
	),
}));

const getViewsMock = vi.mocked(getViews);
const getViewGroupsMock = vi.mocked(getViewGroups);
const useSidebarDragMock = vi.mocked(useSidebarDrag);

const TIMESTAMP = new Date("2026-01-01T00:00:00Z");

function makeView(
	id: number,
	name: string,
	groupId: number | null,
	displayOrder = 0,
): View {
	return {
		id,
		userId: "user-a",
		name,
		subject: "items",
		filters: {},
		displayOrder,
		groupId,
		createdAt: TIMESTAMP,
		updatedAt: TIMESTAMP,
	} as unknown as View;
}

function makeGroup(id: number, name: string, displayOrder: number): ViewGroup {
	return {
		id,
		userId: "user-a",
		name,
		displayOrder,
		isCollapsed: false,
		createdAt: TIMESTAMP,
		updatedAt: TIMESTAMP,
	} as unknown as ViewGroup;
}

const VIEWS = [
	makeView(1, "Reading", null, 0),
	makeView(2, "Fantasy", 10, 0),
	makeView(3, "Podcasts", null, 2),
];
const GROUPS = [makeGroup(10, "Books", 1)];

/** The real hook's shape, with only what a test needs overridden. */
function mockDrag(
	overrides: { activeSlot?: DropSlot | null; hasSaveFailed?: boolean } = {},
) {
	const saveLayout = vi.fn();
	useSidebarDragMock.mockImplementation((entries) => {
		return {
			rows: toSidebarRows(entries),
			sensors: [],
			activeRow: null,
			activeSlot: overrides.activeSlot ?? null,
			springOpenGroupIds: new Set<number>(),
			hasSaveFailed: overrides.hasSaveFailed ?? false,
			saveLayout,
			listRef: { current: null },
			rowNodes: new Map(),
			registerRow: vi.fn(),
			handleDragStart: vi.fn(),
			handleDragMove: vi.fn(),
			handleDragEnd: vi.fn(),
			handleDragCancel: vi.fn(),
			// biome-ignore lint/suspicious/noExplicitAny: a stand-in for the real hook
		} as any;
	});
}

let queryClient: QueryClient;

function renderSidebar() {
	return render(
		<QueryClientProvider client={queryClient}>
			<Sidebar />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	getViewsMock.mockResolvedValue(VIEWS);
	getViewGroupsMock.mockResolvedValue(GROUPS);
	vi.mocked(setViewGroupCollapsed).mockResolvedValue(undefined);
	mockDrag();
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("Sidebar", () => {
	it("renders the fixed nav items", () => {
		renderSidebar();

		expect(screen.getByText("nav.dashboard")).toBeInTheDocument();
		expect(screen.getByText("nav.library")).toBeInTheDocument();
		expect(screen.getByText("nav.series")).toBeInTheDocument();
		expect(screen.getByText("nav.settings")).toBeInTheDocument();
	});

	it("renders views and groups as one flat list", async () => {
		renderSidebar();

		const group = await screen.findByText("Books");
		const nested = await screen.findByText("Fantasy");

		// A group's views are siblings of its header, not descendants — the
		// overlap that used to make a drop near a group's edge ambiguous.
		expect(group.closest("div")?.contains(nested)).toBe(false);
	});

	it("renders no drop indicator while nothing is being dragged", () => {
		renderSidebar();

		expect(screen.queryByTestId("drop-indicator")).toBeNull();
	});

	it("renders the drop indicator for the slot a drag has reached", async () => {
		mockDrag({
			activeSlot: {
				y: 64,
				depth: 1,
				target: { kind: "inGroup", groupId: 10, index: 0 },
			},
		});
		renderSidebar();

		const indicator = await screen.findByTestId("drop-indicator");
		expect(indicator).toHaveAttribute("data-depth", "1");
	});

	it("keeps the drag overlay below the indicator", () => {
		renderSidebar();

		// The chip under the cursor must not cover the line it is aiming at.
		expect(screen.getByTestId("drag-overlay")).toHaveAttribute(
			"data-z-index",
			"40",
		);
	});

	it("lets the drag overlay vanish rather than fly back", () => {
		renderSidebar();

		// The drop animation returns the chip to the dragged row's node, which
		// never moved — so it reads as the item snapping back to where it started
		// just before the list repaints in its new order.
		expect(screen.getByTestId("drag-overlay")).toHaveAttribute(
			"data-drop-animation",
			"off",
		);
	});

	it("reports a layout that could not be saved", () => {
		mockDrag({ hasSaveFailed: true });
		renderSidebar();

		expect(screen.getByText("viewGroups.saveFailed")).toBeInTheDocument();
	});

	it("opens the create-view dialog", () => {
		renderSidebar();

		fireEvent.click(screen.getByText("views.addButton"));

		expect(screen.getByText("create-view-dialog")).toBeInTheDocument();
	});

	it("opens the create-group dialog", () => {
		renderSidebar();

		fireEvent.click(screen.getByText("viewGroups.addButton"));

		expect(screen.getByText("view-group-dialog:new")).toBeInTheDocument();
	});

	it("opens the edit dialog for the group whose pencil was clicked", async () => {
		renderSidebar();

		fireEvent.click(await screen.findByLabelText("viewGroups.rename"));

		expect(screen.getByText("view-group-dialog:Books")).toBeInTheDocument();
	});

	it("collapses a group from its header", async () => {
		renderSidebar();

		fireEvent.click(await screen.findByLabelText("viewGroups.collapse"));

		await waitFor(() =>
			expect(setViewGroupCollapsed).toHaveBeenCalledWith({
				data: { id: 10, isCollapsed: true },
			}),
		);
	});
});
