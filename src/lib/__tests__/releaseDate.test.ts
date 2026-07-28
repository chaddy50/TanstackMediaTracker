import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
	formatReleaseYear,
	getReleaseYear,
	releaseYearToDate,
} from "../releaseDate";

// The real t() interpolates; the component-level mocks elsewhere do not, so
// this stub keeps the assertions about the rendered text meaningful.
const t = ((key: string, options?: { year: number }) =>
	key === "time.yearBC" ? `${options?.year} BC` : key) as unknown as TFunction;

describe("releaseYearToDate", () => {
	it("converts a pre-0 AD year into era notation", () => {
		expect(releaseYearToDate(-1200)).toBe("1200-01-01 BC");
	});

	it("pads pre-0 AD years to four digits", () => {
		expect(releaseYearToDate(-800)).toBe("0800-01-01 BC");
	});

	it("converts an AD year into a plain date", () => {
		expect(releaseYearToDate(2020)).toBe("2020-01-01");
	});

	it("pads AD years to four digits", () => {
		expect(releaseYearToDate(801)).toBe("0801-01-01");
	});

	it("treats missing, zero, and non-numeric years as no date", () => {
		expect(releaseYearToDate(null)).toBeUndefined();
		expect(releaseYearToDate(undefined)).toBeUndefined();
		expect(releaseYearToDate(0)).toBeUndefined();
		expect(releaseYearToDate(Number.NaN)).toBeUndefined();
	});
});

describe("getReleaseYear", () => {
	it("reads a pre-0 AD year back as a negative number", () => {
		expect(getReleaseYear("1200-01-01 BC")).toBe(-1200);
	});

	it("reads a zero-padded pre-0 AD year back as a negative number", () => {
		expect(getReleaseYear("0800-01-01 BC")).toBe(-800);
	});

	it("reads an AD year back as a positive number", () => {
		expect(getReleaseYear("2020-01-01")).toBe(2020);
	});

	it("returns null when there is no release date", () => {
		expect(getReleaseYear(null)).toBeNull();
		expect(getReleaseYear(undefined)).toBeNull();
		expect(getReleaseYear("")).toBeNull();
	});

	it("returns null for an unparseable release date", () => {
		expect(getReleaseYear("garbage")).toBeNull();
	});
});

describe("formatReleaseYear", () => {
	it("formats a pre-0 AD year with a BC suffix", () => {
		expect(formatReleaseYear("1200-01-01 BC", t)).toBe("1200 BC");
	});

	it("formats an AD year as a bare year", () => {
		expect(formatReleaseYear("2020-01-01", t)).toBe("2020");
	});

	it("returns null when there is no release date", () => {
		expect(formatReleaseYear(null, t)).toBeNull();
	});
});

describe("release year round trip", () => {
	it("survives a conversion to a stored date and back", () => {
		for (const year of [-1200, -800, 1, 2020]) {
			expect(getReleaseYear(releaseYearToDate(year))).toBe(year);
		}
	});
});
