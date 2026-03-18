import { useFilterAndSortFormState } from "#/components/common/filterAndSortForm/useFilterAndSortFormState";
import { renderHook, act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

describe("useFilterAndSortFormState — buildFilters", () => {
	it("includes purchaseStatuses when subject is items and statuses are toggled", () => {
		const { result } = renderHook(() =>
			useFilterAndSortFormState("items", {
				purchaseStatuses: ["purchased"],
			}),
		);

		const filters = result.current.buildFilters();
		expect(filters.purchaseStatuses).toEqual(["purchased"]);
	});

	it("omits purchaseStatuses when subject is series", () => {
		const { result } = renderHook(() =>
			useFilterAndSortFormState("series", {
				purchaseStatuses: ["purchased"],
			}),
		);

		const filters = result.current.buildFilters();
		expect(filters.purchaseStatuses).toBeUndefined();
	});

	it("sets completedThisYear when mode is this-year", () => {
		const { result } = renderHook(() =>
			useFilterAndSortFormState("items", { completedThisYear: true }),
		);

		const filters = result.current.buildFilters();
		expect(filters.completedThisYear).toBe(true);
	});

	it("sets completedDateStart and completedDateEnd when mode is range", () => {
		const { result } = renderHook(() =>
			useFilterAndSortFormState("items", {
				completedDateStart: "2024-01-01",
				completedDateEnd: "2024-12-31",
			}),
		);

		const filters = result.current.buildFilters();
		expect(filters.completedDateStart).toBe("2024-01-01");
		expect(filters.completedDateEnd).toBe("2024-12-31");
	});

	it("sets isSeriesComplete when subject is series and filter is complete", () => {
		const { result } = renderHook(() =>
			useFilterAndSortFormState("series", { isSeriesComplete: true }),
		);

		const filters = result.current.buildFilters();
		expect(filters.isSeriesComplete).toBe(true);
	});

	it("toggles a media type on and then off", () => {
		const { result } = renderHook(() => useFilterAndSortFormState("items", {}));

		act(() => result.current.filtersProps.onToggleMediaType("book"));
		expect(result.current.buildFilters().mediaTypes).toContain("book");

		act(() => result.current.filtersProps.onToggleMediaType("book"));
		expect(result.current.buildFilters().mediaTypes).toBeUndefined();
	});
});
