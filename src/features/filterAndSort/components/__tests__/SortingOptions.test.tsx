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
