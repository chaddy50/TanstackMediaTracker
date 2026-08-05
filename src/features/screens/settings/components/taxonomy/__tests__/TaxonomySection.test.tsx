import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import { TaxonomySection } from "#/features/screens/settings/components/taxonomy/TaxonomySection";
import type { TaxonomySectionConfig } from "#/features/screens/settings/components/taxonomy/types";
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

const routerInvalidate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: routerInvalidate }),
}));

const entryFixtures: TaxonomyEntry[] = [
	{ id: 1, name: "Sci-Fi", itemCount: 2 },
	{ id: 2, name: "Horror", itemCount: 0 },
];

const listEntries = vi.fn<TaxonomySectionConfig["listEntries"]>();
const createEntry = vi.fn<TaxonomySectionConfig["createEntry"]>();
const renameEntry = vi.fn<TaxonomySectionConfig["renameEntry"]>();
const deleteEntry = vi.fn<TaxonomySectionConfig["deleteEntry"]>();

/** The tags-shaped config the single-run cases exercise. */
function buildConfig(
	overrides: Partial<TaxonomySectionConfig> = {},
): TaxonomySectionConfig {
	return {
		i18nPrefix: "settings.tags",
		listQueryKey: ["tagsWithUsage"],
		dependentQueryKeys: [["tags"], ["views"]],
		listEntries,
		createEntry,
		renameEntry,
		deleteEntry,
		...overrides,
	};
}

function renderSection(config: TaxonomySectionConfig = buildConfig()) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
	const renderResult = render(
		<QueryClientProvider client={queryClient}>
			<TaxonomySection config={config} />
		</QueryClientProvider>,
	);
	return { ...renderResult, queryClient, invalidateQueriesSpy };
}

/** Waits for the list query to resolve so the rows are on screen. */
async function waitForEntryRows() {
	await waitFor(() => {
		expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
	});
}

async function startRenamingFirstEntry() {
	await waitForEntryRows();
	fireEvent.click(screen.getAllByLabelText("settings.taxonomy.rename")[0]);
	return screen.getByDisplayValue("Sci-Fi");
}

function getCreateInput(i18nPrefix = "settings.tags") {
	return screen.getByPlaceholderText(`${i18nPrefix}.newPlaceholder`);
}

function expectEntryConsumersRefreshed(
	invalidateQueriesSpy: MockInstance<QueryClient["invalidateQueries"]>,
	config: TaxonomySectionConfig,
) {
	expect(invalidateQueriesSpy).toHaveBeenCalledWith({
		queryKey: config.listQueryKey,
	});
	for (const queryKey of config.dependentQueryKeys) {
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey });
	}
	expect(routerInvalidate).toHaveBeenCalled();
}

beforeEach(() => {
	// Vitest 3's restoreAllMocks leaves factory-created vi.fn()s without an
	// implementation, so every default is re-established here rather than once.
	vi.clearAllMocks();
	listEntries.mockResolvedValue(entryFixtures);
	createEntry.mockResolvedValue({ status: "ok" });
	renameEntry.mockResolvedValue({ status: "ok" });
	deleteEntry.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("TaxonomySection", () => {
	it("renders each entry with its usage count", async () => {
		renderSection();

		await waitForEntryRows();
		expect(screen.getByText("Horror")).toBeInTheDocument();
		expect(screen.getByText("settings.tags.usageCount:2")).toBeInTheDocument();
		expect(screen.getByText("settings.tags.usageCount:0")).toBeInTheDocument();
	});

	it("renders the empty state when there are no entries", async () => {
		listEntries.mockResolvedValue([]);
		renderSection();

		await waitFor(() => {
			expect(screen.getByText("settings.tags.empty")).toBeInTheDocument();
		});
		expect(screen.queryByText("Sci-Fi")).toBeNull();
		expect(screen.queryByLabelText("settings.taxonomy.rename")).toBeNull();
	});

	it("switches the row into edit mode when the rename control is clicked", async () => {
		renderSection();

		const input = await startRenamingFirstEntry();

		expect(input).toBeInTheDocument();
		expect(screen.getByText("settings.taxonomy.save")).toBeInTheDocument();
		expect(screen.getByText("settings.taxonomy.cancel")).toBeInTheDocument();
	});

	it("calls renameEntry with the edited value when saving", async () => {
		renderSection();

		const input = await startRenamingFirstEntry();
		fireEvent.change(input, { target: { value: "Space Opera" } });
		fireEvent.click(screen.getByText("settings.taxonomy.save"));

		await waitFor(() => {
			expect(renameEntry).toHaveBeenCalledTimes(1);
		});
		expect(renameEntry).toHaveBeenCalledWith(1, "Space Opera");
	});

	it("saves the rename when Enter is pressed in the input", async () => {
		renderSection();

		const input = await startRenamingFirstEntry();
		fireEvent.change(input, { target: { value: "Space Opera" } });
		fireEvent.keyDown(input, { key: "Enter" });

		await waitFor(() => {
			expect(renameEntry).toHaveBeenCalledTimes(1);
		});
		expect(renameEntry).toHaveBeenCalledWith(1, "Space Opera");
	});

	it("cancels the rename when Escape is pressed in the input", async () => {
		renderSection();

		const input = await startRenamingFirstEntry();
		fireEvent.change(input, { target: { value: "Space Opera" } });
		fireEvent.keyDown(input, { key: "Escape" });

		await waitFor(() => {
			expect(screen.queryByDisplayValue("Space Opera")).toBeNull();
		});
		expect(renameEntry).not.toHaveBeenCalled();
		expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
	});

	it("restores read mode without saving when the cancel control is clicked", async () => {
		renderSection();

		const input = await startRenamingFirstEntry();
		fireEvent.change(input, { target: { value: "Space Opera" } });
		fireEvent.click(screen.getByText("settings.taxonomy.cancel"));

		await waitFor(() => {
			expect(screen.queryByDisplayValue("Space Opera")).toBeNull();
		});
		expect(renameEntry).not.toHaveBeenCalled();
		expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
	});

	it("keeps the row in edit mode and shows the conflict error when the name is taken", async () => {
		renameEntry.mockResolvedValue({ status: "conflict" });
		renderSection();

		const input = await startRenamingFirstEntry();
		fireEvent.change(input, { target: { value: "Horror" } });
		fireEvent.click(screen.getByText("settings.taxonomy.save"));

		await waitFor(() => {
			expect(
				screen.getByText("settings.taxonomy.conflictError"),
			).toBeInTheDocument();
		});
		expect(screen.getByDisplayValue("Horror")).toBeInTheDocument();
	});

	it("shows the empty-name error without calling renameEntry", async () => {
		renderSection();

		const input = await startRenamingFirstEntry();
		fireEvent.change(input, { target: { value: "   " } });
		fireEvent.click(screen.getByText("settings.taxonomy.save"));

		await waitFor(() => {
			expect(
				screen.getByText("settings.taxonomy.emptyNameError"),
			).toBeInTheDocument();
		});
		expect(renameEntry).not.toHaveBeenCalled();
	});

	it("invalidates the configured caches after a successful rename", async () => {
		const config = buildConfig();
		const { invalidateQueriesSpy } = renderSection(config);

		const input = await startRenamingFirstEntry();
		fireEvent.change(input, { target: { value: "Space Opera" } });
		fireEvent.click(screen.getByText("settings.taxonomy.save"));

		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalled();
		});
		expectEntryConsumersRefreshed(invalidateQueriesSpy, config);
	});

	it("opens the delete confirmation for the clicked row", async () => {
		renderSection();

		await waitForEntryRows();
		fireEvent.click(screen.getAllByLabelText("settings.taxonomy.delete")[0]);

		await waitFor(() => {
			expect(
				screen.getByText("settings.taxonomy.deleteTitle"),
			).toBeInTheDocument();
		});
		expect(
			screen.getByText("settings.tags.deleteInUseDescription:Sci-Fi:2"),
		).toBeInTheDocument();
	});

	it("deletes the entry and invalidates the configured caches when confirmed", async () => {
		const config = buildConfig();
		const { invalidateQueriesSpy } = renderSection(config);

		await waitForEntryRows();
		fireEvent.click(screen.getAllByLabelText("settings.taxonomy.delete")[0]);
		await waitFor(() => {
			expect(
				screen.getByText("settings.taxonomy.confirmDelete"),
			).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText("settings.taxonomy.confirmDelete"));

		await waitFor(() => {
			expect(deleteEntry).toHaveBeenCalledWith(1);
		});
		expectEntryConsumersRefreshed(invalidateQueriesSpy, config);
	});

	it("clears the rename error once the user edits the name again", async () => {
		renameEntry.mockResolvedValue({ status: "conflict" });
		renderSection();

		const input = await startRenamingFirstEntry();
		fireEvent.change(input, { target: { value: "Horror" } });
		fireEvent.click(screen.getByText("settings.taxonomy.save"));
		await waitFor(() => {
			expect(
				screen.getByText("settings.taxonomy.conflictError"),
			).toBeInTheDocument();
		});

		fireEvent.change(input, { target: { value: "Horror Stories" } });

		await waitFor(() => {
			expect(screen.queryByText("settings.taxonomy.conflictError")).toBeNull();
		});
	});

	it("renders the create field and button whether or not entries exist", async () => {
		renderSection();

		await waitForEntryRows();
		expect(getCreateInput()).toBeInTheDocument();
		expect(screen.getByText("settings.taxonomy.add")).toBeInTheDocument();

		cleanup();
		listEntries.mockResolvedValue([]);
		renderSection();

		await waitFor(() => {
			expect(screen.getByText("settings.tags.empty")).toBeInTheDocument();
		});
		expect(getCreateInput()).toBeInTheDocument();
		expect(screen.getByText("settings.taxonomy.add")).toBeInTheDocument();
	});

	it("calls createEntry with the trimmed name when the new entry is submitted", async () => {
		renderSection();

		await waitForEntryRows();
		fireEvent.change(getCreateInput(), { target: { value: "  Space Opera " } });
		fireEvent.click(screen.getByText("settings.taxonomy.add"));

		await waitFor(() => {
			expect(createEntry).toHaveBeenCalledTimes(1);
		});
		expect(createEntry).toHaveBeenCalledWith("Space Opera");
	});

	it("submits the new entry when Enter is pressed in the create field", async () => {
		renderSection();

		await waitForEntryRows();
		const input = getCreateInput();
		fireEvent.change(input, { target: { value: "Space Opera" } });
		fireEvent.keyDown(input, { key: "Enter" });

		await waitFor(() => {
			expect(createEntry).toHaveBeenCalledTimes(1);
		});
		expect(createEntry).toHaveBeenCalledWith("Space Opera");
	});

	it("shows the empty-name error without calling createEntry", async () => {
		renderSection();

		await waitForEntryRows();
		fireEvent.change(getCreateInput(), { target: { value: "   " } });
		fireEvent.click(screen.getByText("settings.taxonomy.add"));

		await waitFor(() => {
			expect(
				screen.getByText("settings.taxonomy.emptyNameError"),
			).toBeInTheDocument();
		});
		expect(createEntry).not.toHaveBeenCalled();
	});

	it("keeps the typed name and shows a single conflict error when the new name is taken", async () => {
		createEntry.mockResolvedValue({ status: "conflict" });
		renderSection();

		await waitForEntryRows();
		fireEvent.change(getCreateInput(), { target: { value: "Horror" } });
		fireEvent.click(screen.getByText("settings.taxonomy.add"));

		await waitFor(() => {
			expect(
				screen.getAllByText("settings.taxonomy.conflictError"),
			).toHaveLength(1);
		});
		expect(getCreateInput()).toHaveValue("Horror");
		expect(screen.queryByText("settings.taxonomy.save")).toBeNull();
	});

	it("clears the create field and invalidates the configured caches after a successful create", async () => {
		const config = buildConfig();
		const { invalidateQueriesSpy } = renderSection(config);

		await waitForEntryRows();
		fireEvent.change(getCreateInput(), { target: { value: "Space Opera" } });
		fireEvent.click(screen.getByText("settings.taxonomy.add"));

		await waitFor(() => {
			expect(getCreateInput()).toHaveValue("");
		});
		expect(screen.queryByText("settings.taxonomy.conflictError")).toBeNull();
		expect(screen.queryByText("settings.taxonomy.emptyNameError")).toBeNull();
		expectEntryConsumersRefreshed(invalidateQueriesSpy, config);
	});

	it("passes the config's prefix to the delete dialog", async () => {
		renderSection(buildConfig({ i18nPrefix: "settings.genres" }));

		await waitForEntryRows();
		fireEvent.click(screen.getAllByLabelText("settings.taxonomy.delete")[0]);

		await waitFor(() => {
			expect(
				screen.getByText("settings.genres.deleteInUseDescription:Sci-Fi:2"),
			).toBeInTheDocument();
		});
	});

	it("shows the adding label while a create is in flight", async () => {
		createEntry.mockReturnValue(new Promise(() => {}));
		renderSection();

		await waitForEntryRows();
		fireEvent.change(getCreateInput(), { target: { value: "Space Opera" } });
		fireEvent.click(screen.getByText("settings.taxonomy.add"));

		await waitFor(() => {
			expect(screen.getByText("settings.taxonomy.adding")).toBeDisabled();
		});
		expect(screen.queryByText("settings.taxonomy.add")).toBeNull();

		cleanup();
		createEntry.mockResolvedValue({ status: "ok" });
		renderSection();

		await waitForEntryRows();
		fireEvent.change(getCreateInput(), { target: { value: "Space Opera" } });
		fireEvent.click(screen.getByText("settings.taxonomy.add"));

		await waitFor(() => {
			expect(getCreateInput()).toHaveValue("");
		});
		expect(screen.getByText("settings.taxonomy.add")).toBeInTheDocument();
	});
});

const configShapes = [
	{
		entity: "tags",
		i18nPrefix: "settings.tags",
		listQueryKey: ["tagsWithUsage"],
		dependentQueryKeys: [["tags"], ["views"]],
		otherPrefix: "settings.genres",
		otherEntityQueryKey: ["genres"],
	},
	{
		entity: "genres",
		i18nPrefix: "settings.genres",
		listQueryKey: ["genresWithUsage"],
		dependentQueryKeys: [["genres"], ["views"]],
		otherPrefix: "settings.tags",
		otherEntityQueryKey: ["tags"],
	},
];

describe.each(configShapes)(
	"TaxonomySection driven by the $entity config",
	(shape) => {
		const config = buildConfig({
			i18nPrefix: shape.i18nPrefix,
			listQueryKey: shape.listQueryKey,
			dependentQueryKeys: shape.dependentQueryKeys,
		});

		it("renders every per-entity string under the config's prefix", async () => {
			renderSection(config);

			await waitForEntryRows();
			expect(getCreateInput(shape.i18nPrefix)).toBeInTheDocument();
			expect(
				screen.getByText(`${shape.i18nPrefix}.usageCount:2`),
			).toBeInTheDocument();
			fireEvent.click(screen.getAllByLabelText("settings.taxonomy.delete")[0]);
			await waitFor(() => {
				expect(
					screen.getByText(
						`${shape.i18nPrefix}.deleteInUseDescription:Sci-Fi:2`,
					),
				).toBeInTheDocument();
			});
			expect(document.body.textContent).not.toContain(shape.otherPrefix);

			cleanup();
			listEntries.mockResolvedValue([]);
			renderSection(config);

			await waitFor(() => {
				expect(
					screen.getByText(`${shape.i18nPrefix}.empty`),
				).toBeInTheDocument();
			});
			expect(document.body.textContent).not.toContain(shape.otherPrefix);
		});

		it("reads its list from the config's list query key", async () => {
			// Never resolves, so anything on screen can only have come from the cache.
			listEntries.mockReturnValue(new Promise(() => {}));
			const queryClient = new QueryClient({
				defaultOptions: { queries: { retry: false } },
			});
			queryClient.setQueryData<TaxonomyEntry[]>(shape.listQueryKey, [
				{ id: 7, name: "Seeded Entry", itemCount: 4 },
			]);

			render(
				<QueryClientProvider client={queryClient}>
					<TaxonomySection config={config} />
				</QueryClientProvider>,
			);

			expect(screen.getByText("Seeded Entry")).toBeInTheDocument();
			expect(
				screen.getByText(`${shape.i18nPrefix}.usageCount:4`),
			).toBeInTheDocument();
		});

		it("invalidates exactly the config's dependent keys", async () => {
			const { invalidateQueriesSpy } = renderSection(config);

			await waitForEntryRows();
			fireEvent.change(getCreateInput(shape.i18nPrefix), {
				target: { value: "Space Opera" },
			});
			fireEvent.click(screen.getByText("settings.taxonomy.add"));

			await waitFor(() => {
				expect(routerInvalidate).toHaveBeenCalled();
			});
			expectEntryConsumersRefreshed(invalidateQueriesSpy, config);
			expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({
				queryKey: shape.otherEntityQueryKey,
			});
		});
	},
);
