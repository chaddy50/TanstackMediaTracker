import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FiltersProps } from "#/components/common/filterAndSortForm/components/Filters";
import { Filters } from "#/components/common/filterAndSortForm/components/Filters";
import { BLANK_FILTER_VALUE } from "#/server/genres/constants";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const baseProps: FiltersProps = {
	subject: "items",
	selectedMediaTypes: [],
	onToggleMediaType: vi.fn(),
	selectedStatuses: [],
	onToggleStatus: vi.fn(),
	selectedPurchaseStatuses: [],
	onTogglePurchaseStatus: vi.fn(),
	completionDateMode: "none",
	onCompletionDateModeChange: vi.fn(),
	dateStart: "",
	onDateStartChange: vi.fn(),
	dateEnd: "",
	onDateEndChange: vi.fn(),
	seriesCompleteFilter: "all",
	onSeriesCompleteFilterChange: vi.fn(),
	availableTags: [],
	selectedTags: [],
	onToggleTag: vi.fn(),
	availableGenres: [],
	selectedGenres: [],
	onToggleGenre: vi.fn(),
	creatorQuery: "",
	onCreatorQueryChange: vi.fn(),
};

afterEach(cleanup);

describe("Filters", () => {
	it("shows purchased filter and not series completion filter when subject is items", () => {
		render(<Filters {...baseProps} subject="items" />);
		expect(screen.getAllByText("views.form.purchased").length).toBeGreaterThan(
			0,
		);
		expect(
			screen.queryByText("views.form.seriesCompletion"),
		).not.toBeInTheDocument();
	});

	it("shows series completion filter and not purchased filter when subject is series", () => {
		render(<Filters {...baseProps} subject="series" />);
		expect(screen.getByText("views.form.seriesCompletion")).toBeInTheDocument();
		expect(screen.queryByText("views.form.purchased")).not.toBeInTheDocument();
	});

	it("shows the '(No genre)' option prepended before real genres", () => {
		render(<Filters {...baseProps} availableGenres={["Fantasy"]} />);

		fireEvent.click(screen.getByRole("button", { name: "views.form.genres" }));

		const blankOption = screen.getByText("views.form.noGenreOption");
		const realGenre = screen.getByText("Fantasy");
		expect(blankOption).toBeInTheDocument();
		expect(
			blankOption.compareDocumentPosition(realGenre) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("calls onToggleGenre with the blank sentinel when '(No genre)' is clicked", () => {
		const onToggleGenre = vi.fn();
		render(
			<Filters
				{...baseProps}
				availableGenres={["Fantasy"]}
				onToggleGenre={onToggleGenre}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "views.form.genres" }));
		fireEvent.click(screen.getByText("views.form.noGenreOption"));

		expect(onToggleGenre).toHaveBeenCalledWith(BLANK_FILTER_VALUE);
	});

	it("shows the '(No tags)' option prepended before real tags", () => {
		render(<Filters {...baseProps} availableTags={["favorites"]} />);

		fireEvent.click(screen.getByRole("button", { name: "views.form.tags" }));

		const blankOption = screen.getByText("views.form.noTagsOption");
		const realTag = screen.getByText("favorites");
		expect(blankOption).toBeInTheDocument();
		expect(
			blankOption.compareDocumentPosition(realTag) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("calls onToggleTag with the blank sentinel when '(No tags)' is clicked", () => {
		const onToggleTag = vi.fn();
		render(
			<Filters
				{...baseProps}
				availableTags={["favorites"]}
				onToggleTag={onToggleTag}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "views.form.tags" }));
		fireEvent.click(screen.getByText("views.form.noTagsOption"));

		expect(onToggleTag).toHaveBeenCalledWith(BLANK_FILTER_VALUE);
	});

	it("hides the genre and tag sections when their available lists are empty", () => {
		render(<Filters {...baseProps} availableGenres={[]} availableTags={[]} />);
		expect(
			screen.queryByText("views.form.noGenreOption"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("views.form.noTagsOption"),
		).not.toBeInTheDocument();
	});
});
