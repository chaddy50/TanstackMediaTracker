import { describe, expect, it } from "vitest";

import {
	createGenreInputSchema,
	deleteGenreInputSchema,
	renameGenreInputSchema,
} from "../genres";

describe("renameGenreInputSchema", () => {
	it("accepts a valid input and trims the name", () => {
		expect(
			renameGenreInputSchema.parse({ genreId: 1, name: "  Sci-Fi " }),
		).toEqual({
			genreId: 1,
			name: "Sci-Fi",
		});
	});

	it("rejects a non-integer genreId", () => {
		expect(
			renameGenreInputSchema.safeParse({ genreId: 1.5, name: "Sci-Fi" })
				.success,
		).toBe(false);
	});

	it("rejects a missing name", () => {
		expect(renameGenreInputSchema.safeParse({ genreId: 1 }).success).toBe(
			false,
		);
	});

	it("rejects a non-string name", () => {
		expect(
			renameGenreInputSchema.safeParse({ genreId: 1, name: 42 }).success,
		).toBe(false);
	});
});

describe("deleteGenreInputSchema", () => {
	it("accepts an integer genreId", () => {
		expect(deleteGenreInputSchema.parse({ genreId: 7 })).toEqual({
			genreId: 7,
		});
	});

	it("rejects a non-integer genreId", () => {
		expect(deleteGenreInputSchema.safeParse({ genreId: 1.5 }).success).toBe(
			false,
		);
	});

	it("rejects a non-numeric genreId", () => {
		expect(deleteGenreInputSchema.safeParse({ genreId: "x" }).success).toBe(
			false,
		);
	});
});

/**
 * Create and rename share the same name rules — running them through one table
 * keeps the two from drifting apart.
 */
describe.each([
	["createGenreInputSchema", createGenreInputSchema, {}],
	["renameGenreInputSchema", renameGenreInputSchema, { genreId: 1 }],
] as const)("%s name rules", (_schemaName, schema, baseInput) => {
	it("trims surrounding whitespace", () => {
		const result = schema.parse({ ...baseInput, name: "  Sci-Fi " });
		expect(result.name).toBe("Sci-Fi");
	});

	it("rejects an empty name", () => {
		expect(schema.safeParse({ ...baseInput, name: "" }).success).toBe(false);
	});

	it("rejects a whitespace-only name", () => {
		// Proves `.trim()` runs before `.min(1)`.
		expect(schema.safeParse({ ...baseInput, name: "   " }).success).toBe(false);
	});
});
