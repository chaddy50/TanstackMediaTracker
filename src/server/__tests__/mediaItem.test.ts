import { describe, it, expect } from "vitest";
import {
	inferStatusAfterInstanceEdit,
	inferStatusAfterInstanceDelete,
} from "../mediaItems/mediaItem";
import { MediaItemStatus } from "#/lib/enums";

describe("inferStatusAfterInstanceEdit", () => {
	it("returns COMPLETED when completedAt is set", () => {
		expect(
			inferStatusAfterInstanceEdit("2024-01-01", "2024-01-15"),
		).toBe(MediaItemStatus.COMPLETED);
	});

	it("returns COMPLETED when only completedAt is set (no startedAt)", () => {
		expect(inferStatusAfterInstanceEdit(null, "2024-01-15")).toBe(
			MediaItemStatus.COMPLETED,
		);
	});

	it("returns IN_PROGRESS when startedAt is set and completedAt is null", () => {
		expect(inferStatusAfterInstanceEdit("2024-01-01", null)).toBe(
			MediaItemStatus.IN_PROGRESS,
		);
	});

	it("returns IN_PROGRESS when startedAt is set and completedAt is undefined", () => {
		expect(inferStatusAfterInstanceEdit("2024-01-01", undefined)).toBe(
			MediaItemStatus.IN_PROGRESS,
		);
	});

	it("returns null when both are null", () => {
		expect(inferStatusAfterInstanceEdit(null, null)).toBeNull();
	});

	it("returns null when both are undefined", () => {
		expect(inferStatusAfterInstanceEdit(undefined, undefined)).toBeNull();
	});

	it("returns null when startedAt is undefined and completedAt is null", () => {
		expect(inferStatusAfterInstanceEdit(undefined, null)).toBeNull();
	});
});

describe("inferStatusAfterInstanceDelete", () => {
	it("returns BACKLOG when no remaining instances", () => {
		expect(inferStatusAfterInstanceDelete([])).toBe(MediaItemStatus.BACKLOG);
	});

	it("returns BACKLOG when remaining instance has neither date", () => {
		expect(
			inferStatusAfterInstanceDelete([{ startedAt: null, completedAt: null }]),
		).toBe(MediaItemStatus.BACKLOG);
	});

	it("returns IN_PROGRESS when a remaining instance has startedAt but no completedAt", () => {
		expect(
			inferStatusAfterInstanceDelete([
				{ startedAt: "2024-01-01", completedAt: null },
			]),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("returns COMPLETED when a remaining instance has completedAt", () => {
		expect(
			inferStatusAfterInstanceDelete([
				{ startedAt: "2024-01-01", completedAt: "2024-01-15" },
			]),
		).toBe(MediaItemStatus.COMPLETED);
	});

	it("returns IN_PROGRESS when instances include both a completed and an in-progress one (in-progress wins)", () => {
		expect(
			inferStatusAfterInstanceDelete([
				{ startedAt: "2024-01-01", completedAt: "2024-01-15" },
				{ startedAt: "2024-06-01", completedAt: null },
			]),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("returns COMPLETED when all remaining instances are completed", () => {
		expect(
			inferStatusAfterInstanceDelete([
				{ startedAt: "2024-01-01", completedAt: "2024-01-15" },
				{ startedAt: "2024-06-01", completedAt: "2024-07-01" },
			]),
		).toBe(MediaItemStatus.COMPLETED);
	});

	it("returns COMPLETED when one instance is empty and another is completed", () => {
		expect(
			inferStatusAfterInstanceDelete([
				{ startedAt: null, completedAt: null },
				{ startedAt: "2024-01-01", completedAt: "2024-01-15" },
			]),
		).toBe(MediaItemStatus.COMPLETED);
	});
});
