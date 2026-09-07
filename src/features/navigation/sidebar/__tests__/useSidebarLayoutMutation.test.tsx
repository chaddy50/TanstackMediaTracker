import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { View } from "#/features/screens/customView/view";
import {
	saveSidebarLayout,
	type ViewGroup,
} from "#/features/screens/customView/viewGroup";
import { buildSidebarEntries } from "../sidebarLayout";
import { useSidebarLayoutMutation } from "../useSidebarLayoutMutation";

vi.mock("#/features/screens/customView/viewGroup", () => ({
	saveSidebarLayout: vi.fn(),
}));

const saveSidebarLayoutMock = vi.mocked(saveSidebarLayout);

const TIMESTAMP = new Date("2026-01-01T00:00:00Z");

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

const VIEWS = [
	makeView(1, { displayOrder: 0 }),
	makeView(2, { displayOrder: 0, groupId: 10 }),
];
const GROUPS = [makeGroup(10, 1)];

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

/** The tree with view 1 moved into group 10, ahead of view 2. */
function rearranged() {
	return buildSidebarEntries(
		[
			makeView(1, { displayOrder: 0, groupId: 10 }),
			makeView(2, { displayOrder: 1, groupId: 10 }),
		],
		[makeGroup(10, 0)],
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	queryClient.setQueryData(["views"], VIEWS);
	queryClient.setQueryData(["viewGroups"], GROUPS);
	saveSidebarLayoutMock.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("useSidebarLayoutMutation", () => {
	it("saves the arrangement as a layout payload", async () => {
		const { result } = renderHook(() => useSidebarLayoutMutation(), {
			wrapper,
		});

		act(() => {
			result.current.saveLayout(rearranged());
		});

		await waitFor(() => expect(saveSidebarLayoutMock).toHaveBeenCalledTimes(1));
		expect(saveSidebarLayoutMock.mock.calls[0]?.[0]).toEqual({
			data: {
				topLevel: [{ kind: "group", id: 10 }],
				groups: [{ groupId: 10, viewIds: [1, 2] }],
			},
		});
	});

	it("writes the new arrangement into the cache before the server answers", async () => {
		saveSidebarLayoutMock.mockImplementation(
			() => new Promise(() => {}) as Promise<undefined>,
		);
		const { result } = renderHook(() => useSidebarLayoutMutation(), {
			wrapper,
		});

		act(() => {
			result.current.saveLayout(rearranged());
		});

		await waitFor(() => {
			const views = queryClient.getQueryData<View[]>(["views"]);
			expect(views?.find((view) => view.id === 1)).toMatchObject({
				groupId: 10,
				displayOrder: 0,
			});
		});
	});

	it("puts the old arrangement back when the save is rejected", async () => {
		saveSidebarLayoutMock.mockRejectedValue(new Error("nope"));
		const { result } = renderHook(() => useSidebarLayoutMutation(), {
			wrapper,
		});

		act(() => {
			result.current.saveLayout(rearranged());
		});

		await waitFor(() => expect(result.current.hasSaveFailed).toBe(true));
		expect(queryClient.getQueryData(["views"])).toEqual(VIEWS);
		expect(queryClient.getQueryData(["viewGroups"])).toEqual(GROUPS);
	});

	it("reports nothing wrong when the save succeeds", async () => {
		const { result } = renderHook(() => useSidebarLayoutMutation(), {
			wrapper,
		});

		act(() => {
			result.current.saveLayout(rearranged());
		});

		await waitFor(() => expect(saveSidebarLayoutMock).toHaveBeenCalledTimes(1));
		expect(result.current.hasSaveFailed).toBe(false);
	});

	it("refetches both queries once the save settles", async () => {
		const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useSidebarLayoutMutation(), {
			wrapper,
		});

		act(() => {
			result.current.saveLayout(rearranged());
		});

		await waitFor(() =>
			expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["views"] }),
		);
		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: ["viewGroups"],
		});
	});

	it("cancels queries in flight before writing optimistically", async () => {
		const cancelQueries = vi.spyOn(queryClient, "cancelQueries");
		const { result } = renderHook(() => useSidebarLayoutMutation(), {
			wrapper,
		});

		act(() => {
			result.current.saveLayout(rearranged());
		});

		// A response already on its way would otherwise land after the optimistic
		// write and put the old arrangement back.
		await waitFor(() =>
			expect(cancelQueries).toHaveBeenCalledWith({ queryKey: ["views"] }),
		);
		expect(cancelQueries).toHaveBeenCalledWith({ queryKey: ["viewGroups"] });
	});
});
