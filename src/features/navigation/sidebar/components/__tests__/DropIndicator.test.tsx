import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { type DropSlot, NEST_INDENT } from "../../dropSlots";
import { DropIndicator } from "../DropIndicator";

afterEach(cleanup);

const TOP_LEVEL_SLOT: DropSlot = {
	y: 96,
	depth: 0,
	target: { kind: "topLevel", index: 2 },
};

const NESTED_SLOT: DropSlot = {
	y: 96,
	depth: 1,
	target: { kind: "inGroup", groupId: 10, index: 2 },
};

describe("DropIndicator", () => {
	it("renders nothing when no drop is pending", () => {
		render(<DropIndicator slot={null} />);

		expect(screen.queryByTestId("drop-indicator")).toBeNull();
	});

	it("sits at the slot's height", () => {
		render(<DropIndicator slot={TOP_LEVEL_SLOT} />);

		expect(screen.getByTestId("drop-indicator")).toHaveStyle({ top: "96px" });
	});

	it("indents by one nesting step for a drop inside a group", () => {
		// The visible half of the depth gesture: pulling left out of a group moves
		// this line left, so the change of level is seen rather than discovered.
		render(<DropIndicator slot={NESTED_SLOT} />);

		expect(screen.getByTestId("drop-indicator")).toHaveStyle({
			marginLeft: `${NEST_INDENT}px`,
		});
	});

	it("draws flush left for a drop at the top level", () => {
		render(<DropIndicator slot={TOP_LEVEL_SLOT} />);

		expect(screen.getByTestId("drop-indicator")).toHaveStyle({
			marginLeft: "0px",
		});
	});
});
