import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SortingOptionsProps } from "#/features/filterAndSort/components/SortingOptions";
import { SortingOptions } from "#/features/filterAndSort/components/SortingOptions";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const baseProps: SortingOptionsProps = {
	subject: "items",
	sortBy: "title",
	onSortByChange: vi.fn(),
	sortDirection: "asc",
	onSortDirectionChange: vi.fn(),
};

/** Opens the sort-by dropdown, which renders its options only while open. */
function openSortByDropdown(selectedLabel: string) {
	fireEvent.click(screen.getByRole("button", { name: selectedLabel }));
}

afterEach(cleanup);

describe("SortingOptions", () => {
	it("offers the release date option when subject is items", () => {
		render(<SortingOptions {...baseProps} subject="items" />);

		openSortByDropdown("views.form.sortByOption.title");

		expect(
			screen.getByText("views.form.sortByOption.releaseDate"),
		).toBeInTheDocument();
	});

	it("does not offer the release date option when subject is series", () => {
		render(<SortingOptions {...baseProps} subject="series" sortBy="name" />);

		openSortByDropdown("views.form.sortByOption.name");

		expect(
			screen.queryByText("views.form.sortByOption.releaseDate"),
		).not.toBeInTheDocument();
	});

	it("calls onSortByChange with releaseDate when the option is selected", () => {
		const onSortByChange = vi.fn();
		render(
			<SortingOptions
				{...baseProps}
				subject="items"
				onSortByChange={onSortByChange}
			/>,
		);

		openSortByDropdown("views.form.sortByOption.title");
		fireEvent.click(screen.getByText("views.form.sortByOption.releaseDate"));

		expect(onSortByChange).toHaveBeenCalledWith("releaseDate");
	});

	it("still offers the pre-existing item sort options", () => {
		render(<SortingOptions {...baseProps} subject="items" />);

		openSortByDropdown("views.form.sortByOption.title");

		const preExistingFields = [
			"title",
			"creator",
			"series",
			"director",
			"status",
			"rating",
			"completedAt",
			"updatedAt",
		];
		for (const field of preExistingFields) {
			expect(
				screen.getAllByText(`views.form.sortByOption.${field}`).length,
			).toBeGreaterThan(0);
		}
	});
});

describe("SortingOptions custom order", () => {
	it("offers the custom option when allowed and subject is items", () => {
		render(
			<SortingOptions {...baseProps} subject="items" shouldAllowCustomOrder />,
		);

		openSortByDropdown("views.form.sortByOption.title");

		expect(
			screen.getByText("views.form.sortByOption.custom"),
		).toBeInTheDocument();
	});

	it("does not offer the custom option when subject is series", () => {
		render(
			<SortingOptions
				{...baseProps}
				subject="series"
				sortBy="name"
				shouldAllowCustomOrder
			/>,
		);

		openSortByDropdown("views.form.sortByOption.name");

		expect(
			screen.queryByText("views.form.sortByOption.custom"),
		).not.toBeInTheDocument();
	});

	it("does not offer the custom option when it is not allowed", () => {
		render(
			<SortingOptions
				{...baseProps}
				subject="items"
				shouldAllowCustomOrder={false}
			/>,
		);

		openSortByDropdown("views.form.sortByOption.title");

		expect(
			screen.queryByText("views.form.sortByOption.custom"),
		).not.toBeInTheDocument();
	});

	// The library and series filter dialogs rely on this default.
	it("does not offer the custom option when the prop is omitted", () => {
		render(<SortingOptions {...baseProps} subject="items" />);

		openSortByDropdown("views.form.sortByOption.title");

		expect(
			screen.queryByText("views.form.sortByOption.custom"),
		).not.toBeInTheDocument();
	});

	it("calls onSortByChange with custom when the option is selected", () => {
		const onSortByChange = vi.fn();
		render(
			<SortingOptions
				{...baseProps}
				subject="items"
				shouldAllowCustomOrder
				onSortByChange={onSortByChange}
			/>,
		);

		openSortByDropdown("views.form.sortByOption.title");
		fireEvent.click(screen.getByText("views.form.sortByOption.custom"));

		expect(onSortByChange).toHaveBeenCalledWith("custom");
	});

	it("renders the custom label on the trigger for an already-custom view", () => {
		render(
			<SortingOptions
				{...baseProps}
				subject="items"
				sortBy="custom"
				shouldAllowCustomOrder
			/>,
		);

		expect(
			screen.getByRole("button", { name: "views.form.sortByOption.custom" }),
		).toBeInTheDocument();
	});

	it("still offers every series sort option when custom is allowed", () => {
		render(
			<SortingOptions
				{...baseProps}
				subject="series"
				sortBy="name"
				shouldAllowCustomOrder
			/>,
		);

		openSortByDropdown("views.form.sortByOption.name");

		const seriesFields = [
			"name",
			"status",
			"nextItemStatus",
			"updatedAt",
			"rating",
			"itemCount",
		];
		for (const field of seriesFields) {
			expect(
				screen.getAllByText(`views.form.sortByOption.${field}`).length,
			).toBeGreaterThan(0);
		}
	});
});
