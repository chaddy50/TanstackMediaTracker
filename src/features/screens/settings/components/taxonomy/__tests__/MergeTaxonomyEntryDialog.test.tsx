import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MergeTaxonomyEntryDialog } from "#/features/screens/settings/components/taxonomy/MergeTaxonomyEntryDialog";
import type { TaxonomyEntry } from "#/lib/taxonomy";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (
			key: string,
			options?: {
				count?: number;
				name?: string;
				sourceName?: string;
				targetName?: string;
			},
		) => {
			const interpolations: string[] = [];
			if (options?.name !== undefined) {
				interpolations.push(options.name);
			}
			if (options?.sourceName !== undefined) {
				interpolations.push(options.sourceName);
			}
			if (options?.targetName !== undefined) {
				interpolations.push(options.targetName);
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

const onCancel = vi.fn();
const onConfirm = vi.fn();

const sourceFixture: TaxonomyEntry = { id: 1, name: "Sci-Fi", itemCount: 2 };
const targetFixtures: TaxonomyEntry[] = [
	{ id: 2, name: "Horror", itemCount: 0 },
	{ id: 3, name: "Fantasy", itemCount: 1 },
];

type DialogOverrides = {
	isOpen?: boolean;
	i18nPrefix?: string;
	sourceEntry?: TaxonomyEntry | null;
	targetEntries?: TaxonomyEntry[];
	preselectedTargetId?: number | null;
	isMerging?: boolean;
};

function buildDialog(overrides: DialogOverrides = {}) {
	return (
		<MergeTaxonomyEntryDialog
			isOpen={overrides.isOpen ?? true}
			i18nPrefix={overrides.i18nPrefix ?? "settings.tags"}
			sourceEntry={
				overrides.sourceEntry === undefined
					? sourceFixture
					: overrides.sourceEntry
			}
			targetEntries={overrides.targetEntries ?? targetFixtures}
			preselectedTargetId={overrides.preselectedTargetId ?? null}
			isMerging={overrides.isMerging ?? false}
			onCancel={onCancel}
			onConfirm={onConfirm}
		/>
	);
}

function renderDialog(overrides: DialogOverrides = {}) {
	return render(buildDialog(overrides));
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("MergeTaxonomyEntryDialog", () => {
	it("renders nothing when closed", () => {
		renderDialog({ isOpen: false });

		expect(
			screen.queryByText("settings.taxonomy.mergeTitle"),
		).not.toBeInTheDocument();
	});

	it("lists every other entry as a selectable target", () => {
		renderDialog();

		expect(
			screen.getByText("settings.taxonomy.mergeTargetLabel"),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Horror" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Fantasy" })).toBeInTheDocument();
	});

	it("excludes the source entry from the picker", () => {
		// The caller already filters; the dialog must not depend on it having done so.
		renderDialog({ targetEntries: [sourceFixture, ...targetFixtures] });

		expect(screen.queryByRole("button", { name: "Sci-Fi" })).toBeNull();
		// Scoped to the option group so the dialog's own buttons aren't counted.
		expect(
			within(screen.getByRole("group")).getAllByRole("button"),
		).toHaveLength(2);
	});

	it("keeps confirm disabled until a target is chosen", () => {
		renderDialog();

		const confirmButton = screen.getByText("settings.taxonomy.confirmMerge");
		expect(confirmButton).toBeDisabled();

		fireEvent.click(confirmButton);

		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("calls onConfirm with the chosen target's id", () => {
		renderDialog();

		fireEvent.click(screen.getByRole("button", { name: "Horror" }));
		fireEvent.click(screen.getByText("settings.taxonomy.confirmMerge"));

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onConfirm).toHaveBeenCalledWith(2);
	});

	it("pre-selects the supplied target and enables confirm immediately", () => {
		renderDialog({ preselectedTargetId: 2 });

		expect(screen.getByRole("button", { name: "Horror" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("button", { name: "Fantasy" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);

		const confirmButton = screen.getByText("settings.taxonomy.confirmMerge");
		expect(confirmButton).toBeEnabled();
		fireEvent.click(confirmButton);

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onConfirm).toHaveBeenCalledWith(2);
	});

	it("disables both actions and shows the merging label while a merge is in flight", () => {
		renderDialog({ preselectedTargetId: 2, isMerging: true });

		const cancelButton = screen.getByText("settings.taxonomy.cancel");
		const mergingButton = screen.getByText("settings.taxonomy.merging");
		expect(cancelButton).toBeDisabled();
		expect(mergingButton).toBeDisabled();
		expect(
			screen.queryByText("settings.taxonomy.confirmMerge"),
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Horror" })).toBeDisabled();

		fireEvent.click(mergingButton);

		expect(onConfirm).not.toHaveBeenCalled();
	});

	// Overlay clicks are not reproducible in jsdom (Radix uses pointer capture);
	// Escape exercises the same onOpenChange(false) path.
	it("calls onCancel when Cancel is clicked, and treats dismissal as a cancel", () => {
		renderDialog();

		fireEvent.click(screen.getByText("settings.taxonomy.cancel"));

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();

		fireEvent.keyDown(document, { key: "Escape" });

		expect(onCancel).toHaveBeenCalledTimes(2);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("renders an empty state and no usable confirm when there is nothing to merge into", () => {
		renderDialog({ targetEntries: [] });

		expect(
			screen.getByText("settings.taxonomy.noMergeTargets"),
		).toBeInTheDocument();
		expect(
			screen.queryByText("settings.taxonomy.mergeTargetLabel"),
		).not.toBeInTheDocument();
		expect(screen.queryByRole("group")).toBeNull();

		const confirmButton = screen.getByText("settings.taxonomy.confirmMerge");
		expect(confirmButton).toBeDisabled();
		fireEvent.click(confirmButton);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("asks for a target instead of describing a blank one until a target is picked", () => {
		renderDialog();

		expect(
			screen.getByText("settings.tags.mergePrompt:Sci-Fi"),
		).toBeInTheDocument();
		expect(
			screen.queryByText(/settings\.tags\.mergeDescription/),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Horror" }));

		expect(
			screen.getByText("settings.tags.mergeDescription:Sci-Fi:Horror"),
		).toBeInTheDocument();
		expect(
			screen.queryByText(/settings\.tags\.mergePrompt/),
		).not.toBeInTheDocument();
	});

	it("starts blank again when reopened, discarding the previous selection", () => {
		// The dialog stays mounted while closed, so a stale selection would
		// otherwise carry into the next merge.
		const { rerender } = renderDialog();
		fireEvent.click(screen.getByRole("button", { name: "Horror" }));
		expect(screen.getByRole("button", { name: "Horror" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		rerender(buildDialog({ isOpen: false }));
		rerender(buildDialog({ isOpen: true }));

		expect(screen.getByRole("button", { name: "Horror" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		expect(screen.getByRole("button", { name: "Fantasy" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		expect(screen.getByText("settings.taxonomy.confirmMerge")).toBeDisabled();
		expect(
			screen.getByText("settings.tags.mergePrompt:Sci-Fi"),
		).toBeInTheDocument();
	});

	it("still honors a preselected target when reopened", () => {
		const { rerender } = renderDialog();
		fireEvent.click(screen.getByRole("button", { name: "Horror" }));

		rerender(buildDialog({ isOpen: false }));
		rerender(buildDialog({ isOpen: true, preselectedTargetId: 3 }));

		expect(screen.getByRole("button", { name: "Fantasy" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("button", { name: "Horror" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});
});

describe.each(["settings.tags", "settings.genres"])(
	"MergeTaxonomyEntryDialog under the %s prefix",
	(i18nPrefix) => {
		const otherPrefix =
			i18nPrefix === "settings.tags" ? "settings.genres" : "settings.tags";

		it("warns that the source entry will be deleted, under the config's prefix", () => {
			renderDialog({ i18nPrefix, preselectedTargetId: 2 });

			expect(
				screen.getByText("settings.taxonomy.mergeTitle"),
			).toBeInTheDocument();
			expect(
				screen.getByText(`${i18nPrefix}.mergeDescription:Sci-Fi:Horror`),
			).toBeInTheDocument();
		});

		it("never renders a string from the other entity's prefix", () => {
			renderDialog({ i18nPrefix, preselectedTargetId: 2 });

			expect(document.body.textContent).not.toContain(otherPrefix);
		});
	},
);
