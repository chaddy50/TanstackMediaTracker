import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Filters } from "#/components/common/filterAndSortForm/components/Filters";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import type { FiltersProps } from "#/components/common/filterAndSortForm/components/Filters";

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
		expect(screen.getAllByText("views.form.purchased").length).toBeGreaterThan(0);
		expect(screen.queryByText("views.form.seriesCompletion")).not.toBeInTheDocument();
	});

	it("shows series completion filter and not purchased filter when subject is series", () => {
		render(<Filters {...baseProps} subject="series" />);
		expect(screen.getByText("views.form.seriesCompletion")).toBeInTheDocument();
		expect(screen.queryByText("views.form.purchased")).not.toBeInTheDocument();
	});
});
