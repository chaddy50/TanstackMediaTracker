import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui/tooltip";
import { ActionButton } from "#/features/mediaItemSearch/components/searchResults/searchResult/components/ActionButton";
import type { SearchResultWithStatus } from "#/features/mediaItemSearch/types";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

vi.mock("#/features/mediaItemSearch/mediaItemSearch", () => ({
	addToLibrary: vi.fn(),
}));

vi.mock("#/features/mediaItemSearch/components/PodcastArcPickerDialog", () => ({
	PodcastArcPickerDialog: () => null,
}));

const baseResult: SearchResultWithStatus = {
	externalId: "123",
	externalSource: "tmdb",
	type: MediaItemType.MOVIE,
	title: "Dune",
	metadata: {},
};

function renderActionButton(result: SearchResultWithStatus) {
	return render(
		<TooltipProvider>
			<ActionButton result={result} onClose={vi.fn()} />
		</TooltipProvider>,
	);
}

afterEach(cleanup);

describe("ActionButton", () => {
	it("shows StatusBadge when result is already in the library", () => {
		renderActionButton({
			...baseResult,
			mediaItemId: 42,
			status: MediaItemStatus.IN_PROGRESS,
		});
		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "search.addToLibrary" }),
		).not.toBeInTheDocument();
	});

	// Only MediaItemCard opts into the translucent variant.
	it("keeps solid status colors on the search result badge", () => {
		renderActionButton({
			...baseResult,
			mediaItemId: 42,
			status: MediaItemStatus.IN_PROGRESS,
		});

		const badge = screen.getByTestId("status-badge");
		expect(badge).toHaveClass("bg-blue-600");
		expect(badge).not.toHaveClass("bg-black/60");
	});

	it("shows Add to Library button when result is not in the library", () => {
		renderActionButton(baseResult);
		expect(
			screen.getByRole("button", { name: "search.addToLibrary" }),
		).toBeInTheDocument();
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	it("shows Add Arc button for podcast results regardless of library status", () => {
		renderActionButton({
			...baseResult,
			type: MediaItemType.PODCAST,
			mediaItemId: 99,
			status: MediaItemStatus.COMPLETED,
		});
		expect(
			screen.getByRole("button", { name: "podcast.addArc" }),
		).toBeInTheDocument();
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});
});
