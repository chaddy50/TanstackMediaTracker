import { SearchResults } from "#/components/searchPopup/components/searchResults/SearchResults";
import { TooltipProvider } from "#/components/ui/tooltip";
import type { SearchResultWithStatus } from "@/server/search/search.server";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	useRouter: () => ({}),
	useNavigate: () => () => {},
}));

const baseProps = {
	isSearching: false,
	query: "",
	results: [] as SearchResultWithStatus[],
	onClose: vi.fn(),
};

function renderSearchResults(props: Partial<typeof baseProps>) {
	return render(
		<TooltipProvider>
			<SearchResults {...baseProps} {...props} />
		</TooltipProvider>,
	);
}

afterEach(cleanup);

describe("SearchResults", () => {
	it("shows searching message while a search is in progress", () => {
		renderSearchResults({ isSearching: true, query: "dune" });
		expect(screen.getByText("search.searching")).toBeInTheDocument();
	});

	it("shows prompt message when the query is empty", () => {
		renderSearchResults({ query: "" });
		expect(screen.getByText("search.prompt")).toBeInTheDocument();
	});

	it("shows no-results message when search finished with no results", () => {
		renderSearchResults({ query: "xyzzy", results: [] });
		expect(screen.getByText("search.noResults")).toBeInTheDocument();
	});

	it("shows result items and no message when results are present", () => {
		const results: SearchResultWithStatus[] = [
			{
				title: "Dune",
				externalId: "1",
				externalSource: "tmdb",
				type: "movie",
				metadata: {},
			},
		];
		renderSearchResults({ query: "dune", results });
		expect(screen.queryByText("search.noResults")).not.toBeInTheDocument();
		expect(screen.queryByText("search.prompt")).not.toBeInTheDocument();
	});
});
