import { act, cleanup, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { View } from "#/features/screens/customView/view";
import type { ViewGroup } from "#/features/screens/customView/viewGroup";
import { buildSidebarEntries, type SidebarEntry } from "../sidebarLayout";
import { rowKey, type SidebarRow, toSidebarRows } from "../sidebarRows";
import { useSidebarKeyboardReorder } from "../useSidebarKeyboardReorder";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: Record<string, unknown>) =>
			[key, options?.position, options?.count, options?.group]
				.filter((part) => part !== undefined)
				.join("|"),
	}),
}));

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

function makeGroup(id: number, displayOrder = 0): ViewGroup {
	return {
		id,
		userId: "user-a",
		name: `Group ${id}`,
		displayOrder,
		isCollapsed: false,
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
		[makeGroup(10, 1)],
	);
}

const saveLayout = vi.fn();

function renderReorder(entries = sharedFixture()) {
	const rows = toSidebarRows(entries);
	const listRef =
		createRef<HTMLElement>() as React.RefObject<HTMLElement | null>;
	const list = document.createElement("div");
	list.getBoundingClientRect = () =>
		({ top: 0, left: 0, height: 1000, width: 200 }) as DOMRect;
	listRef.current = list;

	const rowNodes = new Map<string, HTMLElement>();
	for (const [index, row] of rows.entries()) {
		const node = document.createElement("div");
		node.getBoundingClientRect = () =>
			({
				top: index * ROW_HEIGHT,
				left: 0,
				height: ROW_HEIGHT,
				width: 200,
			}) as DOMRect;
		rowNodes.set(rowKey(row), node);
	}

	const rendered = renderHook(() =>
		useSidebarKeyboardReorder({
			entries,
			rows,
			listRef,
			rowNodes,
			saveLayout,
		}),
	);

	return { ...rendered, rows, entries };
}

function press(
	result: { current: ReturnType<typeof useSidebarKeyboardReorder> },
	row: SidebarRow,
	key: string,
) {
	act(() => {
		result.current.onHandleKeyDown(row)({
			key,
			preventDefault: vi.fn(),
		} as unknown as React.KeyboardEvent);
	});
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	saveLayout.mockReset();
});

describe("useSidebarKeyboardReorder", () => {
	it("does nothing until a reorder is started", () => {
		const { result, rows } = renderReorder();

		press(result, rows[0] as SidebarRow, "ArrowDown");

		expect(result.current.slot).toBeNull();
	});

	it("starts at the slot the row already occupies", () => {
		const { result, rows } = renderReorder();

		// No pointer drag has run, so this measures the rows for itself.
		press(result, rows[0] as SidebarRow, " ");

		expect(result.current.slot?.target).toEqual({
			kind: "topLevel",
			index: 0,
		});
	});

	it("steps down and back up through the slots", () => {
		const { result, rows } = renderReorder();
		const row = rows[0] as SidebarRow;

		press(result, row, " ");
		press(result, row, "ArrowDown");
		expect(result.current.slot?.target).toEqual({
			kind: "topLevel",
			index: 1,
		});

		press(result, row, "ArrowDown");
		expect(result.current.slot?.target).toEqual({
			kind: "inGroup",
			groupId: 10,
			index: 0,
		});

		press(result, row, "ArrowUp");
		expect(result.current.slot?.target).toEqual({
			kind: "topLevel",
			index: 1,
		});
	});

	it("crosses between the two slots sharing a position", () => {
		const { result, rows } = renderReorder();
		const row = rows[0] as SidebarRow;

		// Down to the gap after the group's last view, where "end of the group"
		// and "top level, after the group" both live.
		press(result, row, " ");
		for (const _ of [1, 2, 3, 4]) {
			press(result, row, "ArrowDown");
		}
		expect(result.current.slot?.target).toEqual({
			kind: "topLevel",
			index: 2,
		});

		press(result, row, "ArrowRight");
		expect(result.current.slot?.target).toEqual({
			kind: "inGroup",
			groupId: 10,
			index: 2,
		});

		press(result, row, "ArrowLeft");
		expect(result.current.slot?.target).toEqual({
			kind: "topLevel",
			index: 2,
		});
	});

	it("will not cross to a slot at a different position", () => {
		const { result, rows } = renderReorder();
		const row = rows[0] as SidebarRow;

		press(result, row, " ");
		press(result, row, "ArrowRight");

		expect(result.current.slot?.target).toEqual({
			kind: "topLevel",
			index: 0,
		});
	});

	it("commits the chosen slot", () => {
		const { result, rows } = renderReorder();
		const row = rows[0] as SidebarRow;

		press(result, row, " ");
		press(result, row, "ArrowDown");
		press(result, row, "ArrowDown");
		press(result, row, "Enter");

		expect(saveLayout).toHaveBeenCalledOnce();
		const saved = saveLayout.mock.calls[0]?.[0] as SidebarEntry[];
		expect(
			saved.map((entry) =>
				entry.kind === "view"
					? `view:${entry.view.id}`
					: `group:${entry.group.id}[${entry.views.map((v) => v.id).join(",")}]`,
			),
		).toEqual(["group:10[1,2,3]", "view:4"]);
		expect(result.current.slot).toBeNull();
	});

	it("ignores keys from a handle that did not start the reorder", () => {
		const { result, rows } = renderReorder();
		const starter = rows[0] as SidebarRow;
		const other = rows[4] as SidebarRow;

		press(result, starter, " ");
		press(result, starter, "ArrowDown");
		// Every row handle carries this handler, so tabbing away and pressing
		// Enter would otherwise commit the move that started on another row.
		press(result, other, "Enter");

		expect(saveLayout).not.toHaveBeenCalled();
		expect(result.current.slot).not.toBeNull();
	});

	it("abandons the reorder when its own handle loses focus", () => {
		const { result, rows } = renderReorder();
		const row = rows[0] as SidebarRow;

		press(result, row, " ");
		act(() => {
			result.current.onHandleBlur(row)();
		});

		expect(result.current.slot).toBeNull();
		expect(saveLayout).not.toHaveBeenCalled();
	});

	it("keeps a reorder alive when a different handle loses focus", () => {
		const { result, rows } = renderReorder();
		const row = rows[0] as SidebarRow;

		press(result, row, " ");
		act(() => {
			result.current.onHandleBlur(rows[4] as SidebarRow)();
		});

		expect(result.current.slot).not.toBeNull();
	});

	it("abandons the reorder on Escape", () => {
		const { result, rows } = renderReorder();
		const row = rows[0] as SidebarRow;

		press(result, row, " ");
		press(result, row, "ArrowDown");
		press(result, row, "Escape");

		expect(saveLayout).not.toHaveBeenCalled();
		expect(result.current.slot).toBeNull();
	});

	it("announces a top-level position out of the number of places to drop", () => {
		const { result, rows } = renderReorder();

		press(result, rows[0] as SidebarRow, " ");

		// Three entries leave four gaps to drop into, so the count is 4 — counting
		// the entries instead would let the last position announce "4 of 3".
		expect(result.current.announcement).toBe("views.reorderPosition|1|4");
	});

	it("never announces a position beyond the count", () => {
		const { result, rows } = renderReorder();
		const row = rows[0] as SidebarRow;

		press(result, row, " ");
		for (const _ of Array(20)) {
			press(result, row, "ArrowDown");
		}

		const [, position, count] = result.current.announcement.split("|");
		expect(Number(position)).toBeLessThanOrEqual(Number(count));
	});

	it("announces the group a position sits in", () => {
		const { result, rows } = renderReorder();
		const row = rows[0] as SidebarRow;

		press(result, row, " ");
		press(result, row, "ArrowDown");
		press(result, row, "ArrowDown");

		// Two views in the group, so three places to drop between and around them.
		expect(result.current.announcement).toBe(
			"views.reorderPositionInGroup|1|3|Group 10",
		);
	});
});
