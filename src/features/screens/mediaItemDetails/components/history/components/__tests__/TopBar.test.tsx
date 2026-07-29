import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TopBar } from "#/features/screens/mediaItemDetails/components/history/components/TopBar";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const startEditing = vi.fn();

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("History TopBar", () => {
	it("routes adding an entry through the guard", () => {
		render(<TopBar idBeingEdited={null} startEditing={startEditing} />);

		fireEvent.click(screen.getByText("mediaItemDetails.addInstance"));

		expect(startEditing).toHaveBeenCalledTimes(1);
		expect(startEditing).toHaveBeenCalledWith("new");
	});

	it("hides the add button while the new entry form is already open", () => {
		render(<TopBar idBeingEdited="new" startEditing={startEditing} />);

		expect(
			screen.queryByText("mediaItemDetails.addInstance"),
		).not.toBeInTheDocument();
		expect(screen.getByText("mediaItemDetails.history")).toBeInTheDocument();
	});
});
