import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FictionRating } from "#/database/schema";
import { RatingEditor } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/RatingEditor";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

// The detailed form owns its own rows and effects; this suite is about the
// editor's own rating row.
vi.mock(
	"#/features/screens/mediaItemDetails/components/history/components/instance/rating/fictionRating/FictionRatingForm",
	() => ({
		FictionRatingForm: () => <div data-testid="fiction-rating-form" />,
	}),
);

type RatingEditorProps = Parameters<typeof RatingEditor>[0];

const fictionRating: FictionRating = {
	setting: { rating: 4 },
	character: { rating: 4 },
	plot: { rating: 3 },
	enjoyment: { rating: 4 },
	depth: { rating: 3 },
};

function renderRatingEditor(overrides: Partial<RatingEditorProps> = {}) {
	const props: RatingEditorProps = {
		rating: 0,
		fictionRating: null,
		onRatingChange: vi.fn(),
		onFictionRatingChange: vi.fn(),
		onRemoveDetailedRating: vi.fn(),
		...overrides,
	};
	return { ...render(<RatingEditor {...props} />), props };
}

afterEach(cleanup);

describe("RatingEditor", () => {
	it("shows the exact overall rating beside the stars in detailed mode", () => {
		renderRatingEditor({ rating: 3.6, fictionRating });

		expect(screen.getByText("3.6")).toBeInTheDocument();
	});

	it("does not number the editable stars in simple mode", () => {
		renderRatingEditor({ rating: 4 });

		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
		expect(screen.queryByText("4.0")).not.toBeInTheDocument();
	});

	it("drops back to simple mode when the detailed rating is removed", () => {
		const { props } = renderRatingEditor({ rating: 3.6, fictionRating });

		fireEvent.click(screen.getByText("mediaItemDetails.removeDetailedRating"));

		expect(props.onRatingChange).toHaveBeenCalledWith(0);
		expect(props.onFictionRatingChange).toHaveBeenCalledWith(null);
		expect(props.onRemoveDetailedRating).toHaveBeenCalled();
		expect(screen.queryByTestId("fiction-rating-form")).not.toBeInTheDocument();
	});
});
