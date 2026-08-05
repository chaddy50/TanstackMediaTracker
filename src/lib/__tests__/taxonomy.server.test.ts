import { describe, expect, it } from "vitest";

import { isDuplicateNameError, requireNonEmptyName } from "../taxonomy.server";

/**
 * The two pure halves of the shared taxonomy layer — no database involved. The
 * view-filter rewriters are covered in `taxonomy.server.integration.test.ts`.
 */

describe("requireNonEmptyName", () => {
	it("trims surrounding whitespace", () => {
		expect(requireNonEmptyName("  Sci-Fi  ")).toBe("Sci-Fi");
	});

	it("throws on an empty string", () => {
		// The single source of truth for the message every caller surfaces.
		expect(() => requireNonEmptyName("")).toThrow(
			"Taxonomy name cannot be empty",
		);
	});

	it("throws on a whitespace-only string", () => {
		expect(() => requireNonEmptyName("   ")).toThrow();
	});

	it("preserves interior whitespace", () => {
		expect(requireNonEmptyName(" Space  Opera ")).toBe("Space  Opera");
	});
});

describe("isDuplicateNameError", () => {
	it("returns true for a bare pg unique violation", () => {
		expect(isDuplicateNameError({ code: "23505" })).toBe(true);
	});

	it("returns true when nested under one or more cause levels", () => {
		expect(isDuplicateNameError({ cause: { code: "23505" } })).toBe(true);
		expect(isDuplicateNameError({ cause: { cause: { code: "23505" } } })).toBe(
			true,
		);
	});

	it("returns false for a different pg code", () => {
		expect(isDuplicateNameError({ code: "23503" })).toBe(false);
	});

	it("returns false for non-error shapes", () => {
		expect(isDuplicateNameError(new Error("x"))).toBe(false);
		expect(isDuplicateNameError(null)).toBe(false);
		expect(isDuplicateNameError(undefined)).toBe(false);
		// A string carrying the code is not an error object.
		expect(isDuplicateNameError("23505")).toBe(false);
	});
});
