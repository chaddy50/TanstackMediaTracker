import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GenresSection } from "#/features/screens/settings/components/GenresSection";
import {
	createGenre,
	deleteGenre,
	getGenresWithUsage,
	renameGenre,
} from "#/lib/genres/genres";
import type { TaxonomyEntry } from "#/lib/taxonomy";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: { count?: number; name?: string }) => {
			const interpolations: string[] = [];
			if (options?.name !== undefined) {
				interpolations.push(options.name);
			}
			if (options?.count !== undefined) {
				interpolations.push(String(options.count));
			}
			if (interpolations.length === 0) {
				return key;
			}
			return `${key}:${interpolations.join(":")}`;
		},
	}),
}));

vi.mock("#/lib/genres/genres", () => ({
	getGenres: vi.fn(),
	saveMediaItemGenre: vi.fn(),
	getGenreDetails: vi.fn(),
	getGenresWithUsage: vi.fn(),
	createGenre: vi.fn(),
	renameGenre: vi.fn(),
	deleteGenre: vi.fn(),
}));

const routerInvalidate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: routerInvalidate }),
}));

const genreFixtures: TaxonomyEntry[] = [
	{ id: 1, name: "Fiction", itemCount: 2 },
	{ id: 2, name: "Sci-Fi", itemCount: 0 },
];

function renderGenresSection() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
	const renderResult = render(
		<QueryClientProvider client={queryClient}>
			<GenresSection />
		</QueryClientProvider>,
	);
	return { ...renderResult, queryClient, invalidateQueriesSpy };
}

/** Waits for the genre query to resolve so the rows are on screen. */
async function waitForGenreRows() {
	await waitFor(() => {
		expect(screen.getByText("Fiction")).toBeInTheDocument();
	});
}

function getCreateInput() {
	return screen.getByPlaceholderText("settings.genres.newPlaceholder");
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getGenresWithUsage).mockResolvedValue(genreFixtures);
	vi.mocked(createGenre).mockResolvedValue({ status: "ok" });
	vi.mocked(renameGenre).mockResolvedValue({ status: "ok" });
	vi.mocked(deleteGenre).mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("GenresSection", () => {
	it("renders the user's genres from getGenresWithUsage under the genres prefix", async () => {
		renderGenresSection();

		await waitForGenreRows();
		expect(getGenresWithUsage).toHaveBeenCalled();
		expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
		expect(
			screen.getByText("settings.genres.usageCount:2"),
		).toBeInTheDocument();
		expect(
			screen.getByText("settings.genres.usageCount:0"),
		).toBeInTheDocument();
		expect(getCreateInput()).toBeInTheDocument();
		expect(document.body.textContent).not.toContain("settings.tags.");
	});

	it("renders the empty state when the user has no genres", async () => {
		vi.mocked(getGenresWithUsage).mockResolvedValue([]);
		renderGenresSection();

		await waitFor(() => {
			expect(screen.getByText("settings.genres.empty")).toBeInTheDocument();
		});
		expect(screen.queryByText("Fiction")).toBeNull();
	});

	it("creates a genre through createGenre", async () => {
		renderGenresSection();

		await waitForGenreRows();
		fireEvent.change(getCreateInput(), { target: { value: "Space Opera" } });
		fireEvent.click(screen.getByText("settings.taxonomy.add"));

		await waitFor(() => {
			expect(createGenre).toHaveBeenCalledWith({
				data: { name: "Space Opera" },
			});
		});
	});

	it("renames a genre through renameGenre", async () => {
		renderGenresSection();

		await waitForGenreRows();
		fireEvent.click(screen.getAllByLabelText("settings.taxonomy.rename")[0]);
		fireEvent.change(screen.getByDisplayValue("Fiction"), {
			target: { value: "Space Opera" },
		});
		fireEvent.click(screen.getByText("settings.taxonomy.save"));

		await waitFor(() => {
			expect(renameGenre).toHaveBeenCalledWith({
				data: { genreId: 1, name: "Space Opera" },
			});
		});
	});

	it("deletes a genre through deleteGenre", async () => {
		renderGenresSection();

		await waitForGenreRows();
		fireEvent.click(screen.getAllByLabelText("settings.taxonomy.delete")[0]);
		await waitFor(() => {
			expect(
				screen.getByText("settings.genres.deleteInUseDescription:Fiction:2"),
			).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText("settings.taxonomy.confirmDelete"));

		await waitFor(() => {
			expect(deleteGenre).toHaveBeenCalledWith({ data: { genreId: 1 } });
		});
	});

	it("invalidates the genre consumers after a mutation", async () => {
		const { invalidateQueriesSpy } = renderGenresSection();

		await waitForGenreRows();
		fireEvent.change(getCreateInput(), { target: { value: "Space Opera" } });
		fireEvent.click(screen.getByText("settings.taxonomy.add"));

		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalled();
		});
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({
			queryKey: ["genresWithUsage"],
		});
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["genres"] });
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["views"] });
		expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
			queryKey: ["tags"],
		});
	});
});
