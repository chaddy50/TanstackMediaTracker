import { describe, it, expect } from "vitest";
import { formatDateRange } from "../utils";

describe("formatDateRange", () => {
	it("returns null when both are null", () => {
		expect(formatDateRange(null, null)).toBeNull();
	});

	it("returns null when both are undefined", () => {
		expect(formatDateRange(undefined, undefined)).toBeNull();
	});

	it("returns null when startedAt is null and completedAt is undefined", () => {
		expect(formatDateRange(null, undefined)).toBeNull();
	});

	it("returns a single date when startedAt and completedAt are the same", () => {
		expect(formatDateRange("2024-01-15", "2024-01-15")).toBe("Jan 15, 2024");
	});

	it("returns a date range when both dates are set and different", () => {
		expect(formatDateRange("2024-01-01", "2024-06-15")).toBe(
			"Jan 01, 2024 – Jun 15, 2024",
		);
	});

	it("returns start date with Present when only startedAt is set", () => {
		expect(formatDateRange("2024-01-01", null)).toBe("Jan 01, 2024 – Present");
	});

	it("returns just the end date when only completedAt is set", () => {
		expect(formatDateRange(null, "2024-06-15")).toBe("Jun 15, 2024");
	});
});
