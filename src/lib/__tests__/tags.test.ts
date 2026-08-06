import { describe, expect, it } from "vitest";

import {
	createTagInputSchema,
	deleteTagInputSchema,
	mergeTagsInputSchema,
	renameTagInputSchema,
} from "../tags";

describe("renameTagInputSchema", () => {
	it("accepts a valid input and trims the name", () => {
		expect(renameTagInputSchema.parse({ tagId: 1, name: "  Sci-Fi " })).toEqual(
			{
				tagId: 1,
				name: "Sci-Fi",
			},
		);
	});

	it("rejects an empty name", () => {
		expect(renameTagInputSchema.safeParse({ tagId: 1, name: "" }).success).toBe(
			false,
		);
	});

	it("rejects a whitespace-only name", () => {
		// Proves `.trim()` runs before `.min(1)`.
		expect(
			renameTagInputSchema.safeParse({ tagId: 1, name: "   " }).success,
		).toBe(false);
	});

	it("rejects a missing name", () => {
		expect(renameTagInputSchema.safeParse({ tagId: 1 }).success).toBe(false);
	});

	it("rejects a non-string name", () => {
		expect(renameTagInputSchema.safeParse({ tagId: 1, name: 42 }).success).toBe(
			false,
		);
	});

	it("rejects a non-integer tagId", () => {
		expect(
			renameTagInputSchema.safeParse({ tagId: 1.5, name: "Sci-Fi" }).success,
		).toBe(false);
	});
});

describe("deleteTagInputSchema", () => {
	it("accepts an integer tagId", () => {
		expect(deleteTagInputSchema.parse({ tagId: 7 })).toEqual({ tagId: 7 });
	});

	it("rejects a non-integer tagId", () => {
		expect(deleteTagInputSchema.safeParse({ tagId: 1.5 }).success).toBe(false);
	});

	it("rejects a non-numeric tagId", () => {
		expect(deleteTagInputSchema.safeParse({ tagId: "x" }).success).toBe(false);
	});
});

/**
 * Equal ids are deliberately absent here — `mergeTags` owns that guard, so the
 * schema only has to pin the shape.
 */
describe("mergeTagsInputSchema", () => {
	it("accepts two integer ids", () => {
		expect(
			mergeTagsInputSchema.parse({ sourceTagId: 1, targetTagId: 2 }),
		).toEqual({ sourceTagId: 1, targetTagId: 2 });
	});

	it("rejects a non-integer sourceTagId", () => {
		expect(
			mergeTagsInputSchema.safeParse({ sourceTagId: 1.5, targetTagId: 2 })
				.success,
		).toBe(false);
	});

	it("rejects a non-integer targetTagId", () => {
		expect(
			mergeTagsInputSchema.safeParse({ sourceTagId: 1, targetTagId: 2.5 })
				.success,
		).toBe(false);
	});

	it("rejects a missing targetTagId", () => {
		expect(mergeTagsInputSchema.safeParse({ sourceTagId: 1 }).success).toBe(
			false,
		);
	});

	it("rejects a non-numeric id", () => {
		expect(
			mergeTagsInputSchema.safeParse({ sourceTagId: "x", targetTagId: 2 })
				.success,
		).toBe(false);
	});
});

/**
 * Create and rename share the same name rules — running them through one table
 * keeps the two from drifting apart.
 */
describe.each([
	["createTagInputSchema", createTagInputSchema, {}],
	["renameTagInputSchema", renameTagInputSchema, { tagId: 1 }],
] as const)("%s name rules", (_schemaName, schema, baseInput) => {
	it("trims surrounding whitespace", () => {
		const result = schema.parse({ ...baseInput, name: "  Sci-Fi " });
		expect(result.name).toBe("Sci-Fi");
	});

	it("rejects an empty name", () => {
		expect(schema.safeParse({ ...baseInput, name: "" }).success).toBe(false);
	});

	it("rejects a whitespace-only name", () => {
		expect(schema.safeParse({ ...baseInput, name: "   " }).success).toBe(false);
	});
});
