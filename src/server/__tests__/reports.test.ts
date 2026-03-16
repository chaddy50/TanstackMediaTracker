import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLastNMonths } from "../reports";

describe("buildLastNMonths", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("month range generation", () => {
		it("returns a single entry for the current month when monthCount is 1", () => {
			vi.setSystemTime(new Date("2024-03-15"));
			expect(buildLastNMonths([], 1)).toEqual([{ month: "2024-03", value: 0 }]);
		});

		it("returns entries in ascending order ending with the current month", () => {
			vi.setSystemTime(new Date("2024-03-15"));
			const result = buildLastNMonths([], 3);
			expect(result.map((r) => r.month)).toEqual([
				"2024-01",
				"2024-02",
				"2024-03",
			]);
		});

		it("returns exactly 12 entries for a 12-month range", () => {
			vi.setSystemTime(new Date("2024-03-15"));
			const result = buildLastNMonths([], 12);
			expect(result).toHaveLength(12);
			expect(result[0].month).toBe("2023-04");
			expect(result[11].month).toBe("2024-03");
		});

		it("wraps correctly across a year boundary from January", () => {
			vi.setSystemTime(new Date("2024-01-15"));
			const result = buildLastNMonths([], 3);
			expect(result.map((r) => r.month)).toEqual([
				"2023-11",
				"2023-12",
				"2024-01",
			]);
		});

		it("formats all month keys as YYYY-MM", () => {
			vi.setSystemTime(new Date("2024-03-15"));
			for (const entry of buildLastNMonths([], 6)) {
				expect(entry.month).toMatch(/^\d{4}-\d{2}$/);
			}
		});
	});

	describe("filling in missing data", () => {
		beforeEach(() => {
			vi.setSystemTime(new Date("2024-03-15"));
		});

		it("fills all months with 0 when rows is empty", () => {
			expect(buildLastNMonths([], 3)).toEqual([
				{ month: "2024-01", value: 0 },
				{ month: "2024-02", value: 0 },
				{ month: "2024-03", value: 0 },
			]);
		});

		it("fills missing months with 0 and preserves the provided value", () => {
			expect(buildLastNMonths([{ month: "2024-02", value: 5 }], 3)).toEqual([
				{ month: "2024-01", value: 0 },
				{ month: "2024-02", value: 5 },
				{ month: "2024-03", value: 0 },
			]);
		});

		it("preserves all values when every month in the range has data", () => {
			const rows = [
				{ month: "2024-01", value: 3 },
				{ month: "2024-02", value: 7 },
				{ month: "2024-03", value: 2 },
			];
			expect(buildLastNMonths(rows, 3)).toEqual([
				{ month: "2024-01", value: 3 },
				{ month: "2024-02", value: 7 },
				{ month: "2024-03", value: 2 },
			]);
		});

		it("drops rows outside the month range", () => {
			expect(buildLastNMonths([{ month: "2023-12", value: 99 }], 3)).toEqual([
				{ month: "2024-01", value: 0 },
				{ month: "2024-02", value: 0 },
				{ month: "2024-03", value: 0 },
			]);
		});

		it("output length always equals monthCount", () => {
			expect(buildLastNMonths([], 3)).toHaveLength(3);
			expect(buildLastNMonths([], 6)).toHaveLength(6);
			expect(buildLastNMonths([], 12)).toHaveLength(12);
		});
	});
});
