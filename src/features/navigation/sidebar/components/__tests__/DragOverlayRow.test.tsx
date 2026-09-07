import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DragOverlayRow } from "../DragOverlayRow";

afterEach(cleanup);

describe("DragOverlayRow", () => {
	it("names what is being dragged", () => {
		render(<DragOverlayRow name="Fantasy books" />);

		expect(screen.getByText("Fantasy books")).toBeInTheDocument();
	});

	it("is a compact chip rather than a full-width row", () => {
		// A row-shaped overlay under the cursor would sit squarely on the drop
		// indicator, hiding the one thing the drag needs to show.
		render(<DragOverlayRow name="Fantasy books" />);

		expect(screen.getByText("Fantasy books")).toHaveClass("w-fit");
	});
});
