import { describe, expect, it } from "vitest";
import { MediaItemStatus } from "../enums";

describe("MediaItemStatus", () => {
	// Declaration order is what every status dropdown renders, so it is pinned here.
	it("lists statuses in display order", () => {
		expect(Object.values(MediaItemStatus)).toEqual([
			"backlog",
			"waiting_for_next_release",
			"on_hold",
			"next_up",
			"in_progress",
			"done",
			"dropped",
		]);
	});

	it("keeps its persisted values", () => {
		expect(MediaItemStatus.BACKLOG).toBe("backlog");
		expect(MediaItemStatus.WAITING_FOR_NEXT_RELEASE).toBe(
			"waiting_for_next_release",
		);
		expect(MediaItemStatus.ON_HOLD).toBe("on_hold");
		expect(MediaItemStatus.NEXT_UP).toBe("next_up");
		expect(MediaItemStatus.IN_PROGRESS).toBe("in_progress");
		expect(MediaItemStatus.COMPLETED).toBe("done");
		expect(MediaItemStatus.DROPPED).toBe("dropped");
	});
});
