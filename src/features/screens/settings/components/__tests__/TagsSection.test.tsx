import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TagsSection } from "#/features/screens/settings/components/TagsSection";
import {
	createTag,
	deleteTag,
	getTagsWithUsage,
	mergeTags,
	renameTag,
	type TagWithUsageCount,
} from "#/lib/tags";

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

vi.mock("#/lib/tags", () => ({
	getTags: vi.fn(),
	getTagsWithUsage: vi.fn(),
	saveMediaItemTags: vi.fn(),
	createTag: vi.fn(),
	renameTag: vi.fn(),
	deleteTag: vi.fn(),
	mergeTags: vi.fn(),
}));

const routerInvalidate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: routerInvalidate }),
}));

/** Carries the columns the tag table has but the taxonomy entry shape drops. */
const tagFixtures: TagWithUsageCount[] = [
	{
		id: 1,
		name: "Sci-Fi",
		userId: "user-1",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		itemCount: 2,
	},
	{
		id: 2,
		name: "Horror",
		userId: "user-1",
		createdAt: new Date("2026-01-02T00:00:00.000Z"),
		itemCount: 0,
	},
];

function renderTagsSection() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
	const renderResult = render(
		<QueryClientProvider client={queryClient}>
			<TagsSection />
		</QueryClientProvider>,
	);
	return { ...renderResult, queryClient, invalidateQueriesSpy };
}

/** Waits for the tag query to resolve so the rows are on screen. */
async function waitForTagRows() {
	await waitFor(() => {
		expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
	});
}

function getCreateInput() {
	return screen.getByPlaceholderText("settings.tags.newPlaceholder");
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getTagsWithUsage).mockResolvedValue(tagFixtures);
	vi.mocked(createTag).mockResolvedValue({ status: "ok" });
	vi.mocked(renameTag).mockResolvedValue({ status: "ok" });
	vi.mocked(deleteTag).mockResolvedValue(undefined);
	vi.mocked(mergeTags).mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("TagsSection", () => {
	it("renders the user's tags from getTagsWithUsage under the tags prefix", async () => {
		renderTagsSection();

		await waitForTagRows();
		expect(getTagsWithUsage).toHaveBeenCalled();
		expect(screen.getByText("Horror")).toBeInTheDocument();
		expect(screen.getByText("settings.tags.usageCount:2")).toBeInTheDocument();
		expect(screen.getByText("settings.tags.usageCount:0")).toBeInTheDocument();
		expect(getCreateInput()).toBeInTheDocument();
	});

	it("maps tag rows onto taxonomy entries", async () => {
		renderTagsSection();

		// The rows carry userId/createdAt; only id, name and itemCount are consumed.
		await waitForTagRows();
		fireEvent.click(screen.getAllByLabelText("settings.taxonomy.rename")[0]);

		expect(screen.getByDisplayValue("Sci-Fi")).toBeInTheDocument();
	});

	it("creates a tag through createTag", async () => {
		renderTagsSection();

		await waitForTagRows();
		fireEvent.change(getCreateInput(), { target: { value: "Space Opera" } });
		fireEvent.click(screen.getByText("settings.taxonomy.add"));

		await waitFor(() => {
			expect(createTag).toHaveBeenCalledWith({
				data: { name: "Space Opera" },
			});
		});
	});

	it("renames a tag through renameTag", async () => {
		renderTagsSection();

		await waitForTagRows();
		fireEvent.click(screen.getAllByLabelText("settings.taxonomy.rename")[0]);
		fireEvent.change(screen.getByDisplayValue("Sci-Fi"), {
			target: { value: "Space Opera" },
		});
		fireEvent.click(screen.getByText("settings.taxonomy.save"));

		await waitFor(() => {
			expect(renameTag).toHaveBeenCalledWith({
				data: { tagId: 1, name: "Space Opera" },
			});
		});
	});

	it("deletes a tag through deleteTag", async () => {
		renderTagsSection();

		await waitForTagRows();
		fireEvent.click(screen.getAllByLabelText("settings.taxonomy.delete")[0]);
		await waitFor(() => {
			expect(
				screen.getByText("settings.tags.deleteInUseDescription:Sci-Fi:2"),
			).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText("settings.taxonomy.confirmDelete"));

		await waitFor(() => {
			expect(deleteTag).toHaveBeenCalledWith({ data: { tagId: 1 } });
		});
	});

	it("merges a tag through mergeTags", async () => {
		renderTagsSection();

		await waitForTagRows();
		fireEvent.click(screen.getAllByLabelText("settings.taxonomy.merge")[0]);
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Horror" }),
			).toBeInTheDocument();
		});
		fireEvent.click(screen.getByRole("button", { name: "Horror" }));
		fireEvent.click(screen.getByText("settings.taxonomy.confirmMerge"));

		await waitFor(() => {
			expect(mergeTags).toHaveBeenCalledWith({
				data: { sourceTagId: 1, targetTagId: 2 },
			});
		});
	});

	it("invalidates the tag consumers after a mutation", async () => {
		const { invalidateQueriesSpy } = renderTagsSection();

		await waitForTagRows();
		fireEvent.change(getCreateInput(), { target: { value: "Space Opera" } });
		fireEvent.click(screen.getByText("settings.taxonomy.add"));

		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalled();
		});
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({
			queryKey: ["tagsWithUsage"],
		});
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["tags"] });
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["views"] });
	});
});
