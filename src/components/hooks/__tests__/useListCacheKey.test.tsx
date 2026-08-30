import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useListCacheKey } from "#/components/hooks/useListCacheKey";

let historyEntryKey: string | undefined = "entry-1";

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({
		state: { location: { state: { __TSR_key: historyEntryKey } } },
	}),
}));

beforeEach(() => {
	historyEntryKey = "entry-1";
});

describe("useListCacheKey", () => {
	it("includes the list name and the query", () => {
		const { result } = renderHook(() =>
			useListCacheKey("library", { sortBy: "title" }),
		);

		expect(result.current).toContain("library");
		expect(result.current).toContain("title");
	});

	it("keeps the key stable while the history entry and query are unchanged", () => {
		const { result, rerender } = renderHook(() =>
			useListCacheKey("library", { sortBy: "title" }),
		);
		const firstKey = result.current;

		rerender();

		expect(result.current).toBe(firstKey);
	});

	// Pressing back out of a details screen returns to the same history entry, which
	// is the only case where the accumulated pages are still the right ones to show.
	it("gives the same key for the same history entry and query", () => {
		const { result: first } = renderHook(() =>
			useListCacheKey("library", { sortBy: "title" }),
		);
		const { result: second } = renderHook(() =>
			useListCacheKey("library", { sortBy: "title" }),
		);

		expect(second.current).toBe(first.current);
	});

	// Reaching the library again from the sidebar unmounts and remounts the screen,
	// so the new entry is picked up and the list starts at page one.
	it("gives a different key once a later visit mounts on a new history entry", () => {
		const { result: firstVisit } = renderHook(() =>
			useListCacheKey("library", { sortBy: "title" }),
		);
		const firstKey = firstVisit.current;

		historyEntryKey = "entry-2";
		const { result: secondVisit } = renderHook(() =>
			useListCacheKey("library", { sortBy: "title" }),
		);

		expect(secondVisit.current).not.toBe(firstKey);
	});

	// `state.location` flips to the destination the moment a navigation starts, while
	// this list is still on screen. Reacting to that would reset a visible list to
	// page one, collapsing the scroll container for a frame on the way into an item.
	it("ignores the location changing while the list stays mounted", () => {
		const { result, rerender } = renderHook(() =>
			useListCacheKey("library", { sortBy: "title" }),
		);
		const mountedKey = result.current;

		historyEntryKey = "entry-navigating-away";
		rerender();

		expect(result.current).toBe(mountedKey);
	});

	it("gives a different key for a different query on the same entry", () => {
		const { result: byTitle } = renderHook(() =>
			useListCacheKey("library", { sortBy: "title" }),
		);
		const { result: byRating } = renderHook(() =>
			useListCacheKey("library", { sortBy: "rating" }),
		);

		expect(byRating.current).not.toBe(byTitle.current);
	});

	it("gives two lists different keys on the same entry", () => {
		const { result: library } = renderHook(() =>
			useListCacheKey("library", {}),
		);
		const { result: series } = renderHook(() => useListCacheKey("series", {}));

		expect(series.current).not.toBe(library.current);
	});

	// A missing key would otherwise make every visit collide under "undefined".
	it("still produces a usable key when the entry has no history key", () => {
		historyEntryKey = undefined;

		const { result } = renderHook(() => useListCacheKey("library", {}));

		expect(result.current).toContain("library");
	});
});
