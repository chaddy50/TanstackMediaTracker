import { InstanceEditForm } from "#/components/mediaItemDetails/history/components/instance/InstanceEditForm";
import { MediaItemType } from "#/server/enums";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/server/mediaItems/mediaItem", () => ({
	saveInstance: vi.fn().mockResolvedValue(undefined),
	deleteInstance: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#/hooks/useUserSettings", () => ({
	useUserSettings: () => ({ data: undefined }),
}));

const baseProps = {
	mediaItemId: 1,
	mediaItemType: MediaItemType.BOOK,
	onSave: vi.fn(),
	onCancel: vi.fn(),
};

afterEach(cleanup);

describe("InstanceEditForm", () => {
	it("shows a date error and does not submit when completedAt is before startedAt", async () => {
		const { saveInstance } = await import("#/server/mediaItems/mediaItem");
		render(<InstanceEditForm {...baseProps} />);

		fireEvent.change(screen.getByLabelText("mediaItemDetails.started"), {
			target: { value: "2024-06-01" },
		});
		fireEvent.change(screen.getByLabelText("mediaItemDetails.completed"), {
			target: { value: "2024-01-01" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		expect(screen.getByTestId("date-error")).toBeInTheDocument();
		expect(saveInstance).not.toHaveBeenCalled();
	});

	it("submits with no dates without showing an error", async () => {
		const { saveInstance } = await import("#/server/mediaItems/mediaItem");
		vi.mocked(saveInstance).mockClear();
		render(<InstanceEditForm {...baseProps} instance={undefined} />);

		// Clear the default startedAt that the form pre-fills for new instances
		fireEvent.change(screen.getByLabelText("mediaItemDetails.started"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		expect(screen.queryByTestId("date-error")).not.toBeInTheDocument();
		expect(saveInstance).toHaveBeenCalled();
	});

	it("shows season reviews section only when mediaItemType is TV_SHOW", () => {
		const { rerender } = render(<InstanceEditForm {...baseProps} mediaItemType={MediaItemType.BOOK} />);
		expect(screen.queryByText("mediaItemDetails.seasonReviews")).not.toBeInTheDocument();

		rerender(<InstanceEditForm {...baseProps} mediaItemType={MediaItemType.TV_SHOW} />);
		expect(screen.getByText("mediaItemDetails.seasonReviews")).toBeInTheDocument();
	});

	it("shows delete button only when an existing instance is provided", () => {
		const instance = {
			id: 42,
			rating: 0,
			fictionRating: null,
			seasonReviews: null,
			consumptionInfo: null,
			reviewText: null,
			startedAt: null,
			completedAt: null,
		};

		const { rerender } = render(<InstanceEditForm {...baseProps} />);
		expect(screen.queryByText("mediaItemDetails.removeEntry")).not.toBeInTheDocument();

		rerender(<InstanceEditForm {...baseProps} instance={instance} />);
		expect(screen.getByText("mediaItemDetails.removeEntry")).toBeInTheDocument();
	});
});
