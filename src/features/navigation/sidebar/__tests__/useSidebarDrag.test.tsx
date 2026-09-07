import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { View } from "#/features/screens/customView/view";
import {
	setViewGroupCollapsed,
	type ViewGroup,
} from "#/features/screens/customView/viewGroup";
import { buildSidebarEntries, type SidebarEntry } from "../sidebarLayout";
import { rowKey, toSidebarRows } from "../sidebarRows";
import { useSidebarDrag } from "../useSidebarDrag";

vi.mock("#/features/screens/customView/viewGroup", () => ({
	setViewGroupCollapsed: vi.fn(),
}));

const saveLayout = vi.fn();
vi.mock("../useSidebarLayoutMutation", () => ({
	useSidebarLayoutMutation: () => ({ saveLayout, hasSaveFailed: false }),
}));

const setViewGroupCollapsedMock = vi.mocked(setViewGroupCollapsed);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIMESTAMP = new Date("2026-01-01T00:00:00Z");
const ROW_HEIGHT = 32;

function makeView(
	id: number,
	overrides: { displayOrder?: number; groupId?: number | null } = {},
): View {
	return {
		id,
		userId: "user-a",
		name: `View ${id}`,
		subject: "items",
		filters: {},
		displayOrder: overrides.displayOrder ?? 0,
		groupId: overrides.groupId ?? null,
		createdAt: TIMESTAMP,
		updatedAt: TIMESTAMP,
	} as unknown as View;
}

function makeGroup(
	id: number,
	overrides: { displayOrder?: number; isCollapsed?: boolean } = {},
): ViewGroup {
	return {
		id,
		userId: "user-a",
		name: `Group ${id}`,
		displayOrder: overrides.displayOrder ?? 0,
		isCollapsed: overrides.isCollapsed ?? false,
		createdAt: TIMESTAMP,
		updatedAt: TIMESTAMP,
	} as unknown as ViewGroup;
}

/** view 1, group 10 holding views 2 and 3, view 4. */
function sharedFixture(): SidebarEntry[] {
	return buildSidebarEntries(
		[
			makeView(1, { displayOrder: 0 }),
			makeView(2, { displayOrder: 0, groupId: 10 }),
			makeView(3, { displayOrder: 1, groupId: 10 }),
			makeView(4, { displayOrder: 2 }),
		],
		[makeGroup(10, { displayOrder: 1 })],
	);
}

function rect(top: number, height: number): DOMRect {
	return { top, left: 0, height, width: 200 } as DOMRect;
}

/**
 * jsdom has no layout, so the list and its rows are given the same uniform
 * geometry the slot engine is specified against.
 */
function stubLayout(
	drag: ReturnType<typeof useSidebarDrag>,
	entries: SidebarEntry[],
	springOpenGroupIds: ReadonlySet<number> = new Set(),
) {
	const list = document.createElement("div");
	list.getBoundingClientRect = () => rect(0, 1000);
	drag.listRef.current = list;

	for (const [index, row] of toSidebarRows(
		entries,
		springOpenGroupIds,
	).entries()) {
		const node = document.createElement("div");
		node.getBoundingClientRect = () => rect(index * ROW_HEIGHT, ROW_HEIGHT);
		drag.registerRow(rowKey(row), node);
	}
}

/**
 * Where a row's drag handle sits: at the right of a 224px sidebar, which is what
 * makes the unnest threshold relative to the grab point rather than absolute.
 */
const HANDLE_X = 180;

function dragStart(key: string) {
	return {
		active: { id: key },
		activatorEvent: { clientX: HANDLE_X, clientY: 0 },
	} as never;
}

/** A move whose pointer ends up at (x, y) in the list's own coordinates. */
function dragMove(x: number, y: number) {
	return {
		activatorEvent: { clientX: HANDLE_X, clientY: 0 },
		delta: { x: x - HANDLE_X, y },
	} as never;
}

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

/**
 * `registeredRows` is the row set whose nodes get registered. React attaches a
 * ref before the layout effect that re-measures, so a row revealed mid-drag is
 * already registered by the time the measurement runs — passing the sprung-open
 * set here reproduces that ordering.
 */
function renderDrag(
	entries = sharedFixture(),
	registeredRows: ReadonlySet<number> = new Set(),
) {
	const rendered = renderHook(() => useSidebarDrag(entries), { wrapper });
	act(() => {
		stubLayout(rendered.result.current, entries, registeredRows);
	});
	return { ...rendered, entries };
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	setViewGroupCollapsedMock.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// The drag lifecycle
// ---------------------------------------------------------------------------

describe("useSidebarDrag", () => {
	it("flattens the tree into the rows it renders", () => {
		const { result } = renderDrag();

		expect(result.current.rows.map(rowKey)).toEqual([
			"view:1",
			"groupHeader:10",
			"view:2",
			"view:3",
			"view:4",
		]);
	});

	it("names the row being dragged once a drag starts", () => {
		const { result } = renderDrag();

		act(() => {
			result.current.handleDragStart(dragStart("view:1"));
		});

		expect(result.current.activeRow).toEqual({
			kind: "view",
			viewId: 1,
			groupId: null,
		});
	});

	it("resolves a slot from where the pointer is", () => {
		const { result } = renderDrag();

		act(() => {
			result.current.handleDragStart(dragStart("view:1"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 64));
		});

		expect(result.current.activeSlot?.target).toEqual({
			kind: "inGroup",
			groupId: 10,
			index: 0,
		});
	});

	it("takes the outer slot once the drag is pulled left of the handle", () => {
		const { result } = renderDrag();

		act(() => {
			result.current.handleDragStart(dragStart("view:2"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X - 50, 128));
		});

		expect(result.current.activeSlot?.target).toEqual({
			kind: "topLevel",
			index: 2,
		});
	});

	it("stays inside the group for a small sideways wobble", () => {
		const { result } = renderDrag();

		act(() => {
			result.current.handleDragStart(dragStart("view:2"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X - 10, 128));
		});

		expect(result.current.activeSlot?.target).toEqual({
			kind: "inGroup",
			groupId: 10,
			index: 2,
		});
	});

	it("unnests well before the cursor reaches the sidebar's left edge", () => {
		const { result } = renderDrag();

		act(() => {
			result.current.handleDragStart(dragStart("view:2"));
		});
		// A little over a third of the way across a 224px sidebar, not the whole
		// span — reaching the left margin to leave a group was the complaint.
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X - 45, 128));
		});

		expect(result.current.activeSlot?.depth).toBe(0);
	});

	it("applies the resolved slot and saves it on the drop", () => {
		const { result } = renderDrag();

		act(() => {
			result.current.handleDragStart(dragStart("view:2"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X - 50, 128));
		});
		act(() => {
			result.current.handleDragEnd();
		});

		expect(saveLayout).toHaveBeenCalledOnce();
		const saved = saveLayout.mock.calls[0]?.[0] as SidebarEntry[];
		expect(
			saved.map((entry) =>
				entry.kind === "view"
					? `view:${entry.view.id}`
					: `group:${entry.group.id}[${entry.views.map((v) => v.id).join(",")}]`,
			),
		).toEqual(["view:1", "group:10[3]", "view:2", "view:4"]);
	});

	it("saves nothing when the drop changes nothing", () => {
		const { result } = renderDrag();

		act(() => {
			result.current.handleDragStart(dragStart("view:1"));
		});
		// Slot 0 is where view 1 already sits.
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 0));
		});
		act(() => {
			result.current.handleDragEnd();
		});

		expect(saveLayout).not.toHaveBeenCalled();
	});

	it("saves nothing and forgets the slot when a drag is cancelled", () => {
		const { result } = renderDrag();

		act(() => {
			result.current.handleDragStart(dragStart("view:1"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 160));
		});
		act(() => {
			result.current.handleDragCancel();
		});

		expect(saveLayout).not.toHaveBeenCalled();
		expect(result.current.activeSlot).toBeNull();
		expect(result.current.activeRow).toBeNull();
	});

	it("offers a dragged group no slot inside another group", () => {
		const { result } = renderDrag();

		act(() => {
			result.current.handleDragStart(dragStart("groupHeader:10"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 64));
		});

		expect(result.current.activeSlot?.target.kind).toBe("topLevel");
	});
});

// ---------------------------------------------------------------------------
// Spring-open
// ---------------------------------------------------------------------------

describe("useSidebarDrag spring-open", () => {
	function collapsedFixture() {
		return buildSidebarEntries(
			[makeView(1, { displayOrder: 0 }), makeView(2, { groupId: 10 })],
			[makeGroup(10, { displayOrder: 1, isCollapsed: true })],
		);
	}

	it("opens a collapsed group the drag rests on", () => {
		vi.useFakeTimers();
		const entries = collapsedFixture();
		const { result } = renderDrag(entries);

		act(() => {
			result.current.handleDragStart(dragStart("view:1"));
		});
		// The collapsed header is the second row, so its band is 32..64.
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 48));
		});
		act(() => {
			vi.advanceTimersByTime(600);
		});

		expect([...result.current.springOpenGroupIds]).toEqual([10]);
	});

	it("abandons the dwell when the drag moves on before it fires", () => {
		vi.useFakeTimers();
		const { result } = renderDrag(collapsedFixture());

		act(() => {
			result.current.handleDragStart(dragStart("view:1"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 48));
		});
		act(() => {
			vi.advanceTimersByTime(300);
			result.current.handleDragMove(dragMove(HANDLE_X, 8));
		});
		act(() => {
			vi.advanceTimersByTime(600);
		});

		expect([...result.current.springOpenGroupIds]).toEqual([]);
	});

	it("does not open a group after the drag has ended", () => {
		vi.useFakeTimers();
		const { result } = renderDrag(collapsedFixture());

		act(() => {
			result.current.handleDragStart(dragStart("view:1"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 48));
		});
		act(() => {
			result.current.handleDragEnd();
		});
		act(() => {
			vi.advanceTimersByTime(600);
		});

		expect([...result.current.springOpenGroupIds]).toEqual([]);
	});

	it("keeps a group it opened open when the view landed inside", () => {
		vi.useFakeTimers();
		const entries = collapsedFixture();
		const { result } = renderDrag(entries, new Set([10]));

		act(() => {
			result.current.handleDragStart(dragStart("view:1"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 48));
		});
		act(() => {
			vi.advanceTimersByTime(600);
		});
		// Now open, the group's rows have been re-measured: the slot at the start
		// of the group sits at y 64, where its first view begins.
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 64));
		});
		act(() => {
			result.current.handleDragEnd();
		});

		// Otherwise the group would snap shut over the row just moved into it.
		expect(setViewGroupCollapsedMock).toHaveBeenCalledWith({
			data: { id: 10, isCollapsed: false },
		});
	});

	it("leaves a group it opened alone when nothing was dropped inside", () => {
		vi.useFakeTimers();
		const { result } = renderDrag(collapsedFixture());

		act(() => {
			result.current.handleDragStart(dragStart("view:1"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 48));
		});
		act(() => {
			vi.advanceTimersByTime(600);
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 0));
		});
		act(() => {
			result.current.handleDragEnd();
		});

		expect(setViewGroupCollapsedMock).not.toHaveBeenCalled();
		expect([...result.current.springOpenGroupIds]).toEqual([]);
	});

	it("re-reads the rows when the list changes mid-drag", () => {
		vi.useFakeTimers();
		const entries = collapsedFixture();
		const { result } = renderDrag(entries, new Set([10]));

		act(() => {
			result.current.handleDragStart(dragStart("view:1"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 48));
		});
		act(() => {
			vi.advanceTimersByTime(600);
		});

		// The group's rows only enter the list once it springs open, so a slot
		// inside it can only be resolved if the re-measure actually ran.
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 64));
		});

		expect(result.current.activeSlot?.target).toEqual({
			kind: "inGroup",
			groupId: 10,
			index: 0,
		});
	});

	it("never springs a group open for a group drag", () => {
		vi.useFakeTimers();
		const { result } = renderDrag(collapsedFixture());

		act(() => {
			result.current.handleDragStart(dragStart("groupHeader:10"));
		});
		act(() => {
			result.current.handleDragMove(dragMove(HANDLE_X, 48));
		});
		act(() => {
			vi.advanceTimersByTime(600);
		});

		expect([...result.current.springOpenGroupIds]).toEqual([]);
	});
});
