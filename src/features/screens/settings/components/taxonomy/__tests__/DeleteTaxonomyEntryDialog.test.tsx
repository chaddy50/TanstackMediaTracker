import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteTaxonomyEntryDialog } from "#/features/screens/settings/components/taxonomy/DeleteTaxonomyEntryDialog";

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

const onCancel = vi.fn();
const onConfirm = vi.fn();

type DialogOverrides = {
	isOpen?: boolean;
	i18nPrefix?: string;
	entryName?: string;
	itemCount?: number;
	isDeleting?: boolean;
};

function renderDialog(overrides: DialogOverrides = {}) {
	return render(
		<DeleteTaxonomyEntryDialog
			isOpen={overrides.isOpen ?? true}
			i18nPrefix={overrides.i18nPrefix ?? "settings.tags"}
			entryName={overrides.entryName ?? "Sci-Fi"}
			itemCount={overrides.itemCount ?? 0}
			isDeleting={overrides.isDeleting ?? false}
			onCancel={onCancel}
			onConfirm={onConfirm}
		/>,
	);
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("DeleteTaxonomyEntryDialog", () => {
	it("renders nothing when closed", () => {
		renderDialog({ isOpen: false });

		expect(
			screen.queryByText("settings.taxonomy.deleteTitle"),
		).not.toBeInTheDocument();
	});

	it("calls onCancel when Cancel is clicked", () => {
		renderDialog();

		fireEvent.click(screen.getByText("settings.taxonomy.cancel"));

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("calls onConfirm when Delete is clicked", () => {
		renderDialog();

		fireEvent.click(screen.getByText("settings.taxonomy.confirmDelete"));

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
	});

	// Overlay clicks are not reproducible in jsdom (Radix uses pointer capture);
	// Escape exercises the same onOpenChange(false) path.
	it("treats dismissing the dialog as a cancel", () => {
		renderDialog();

		fireEvent.keyDown(document, { key: "Escape" });

		expect(onCancel).toHaveBeenCalled();
		expect(onConfirm).not.toHaveBeenCalled();
	});
});

describe.each(["settings.tags", "settings.genres"])(
	"DeleteTaxonomyEntryDialog under the %s prefix",
	(i18nPrefix) => {
		const otherPrefix =
			i18nPrefix === "settings.tags" ? "settings.genres" : "settings.tags";

		it("renders the plain description when the entry is unused", () => {
			renderDialog({ i18nPrefix, itemCount: 0 });

			expect(
				screen.getByText("settings.taxonomy.deleteTitle"),
			).toBeInTheDocument();
			expect(
				screen.getByText(`${i18nPrefix}.deleteDescription:Sci-Fi`),
			).toBeInTheDocument();
			expect(
				screen.queryByText(`${i18nPrefix}.deleteInUseDescription:Sci-Fi:0`),
			).not.toBeInTheDocument();
			expect(document.body.textContent).not.toContain(otherPrefix);
		});

		it("renders the in-use warning with the item count when the entry is used", () => {
			renderDialog({ i18nPrefix, itemCount: 3 });

			expect(
				screen.getByText(`${i18nPrefix}.deleteInUseDescription:Sci-Fi:3`),
			).toBeInTheDocument();
			expect(
				screen.queryByText(`${i18nPrefix}.deleteDescription:Sci-Fi`),
			).not.toBeInTheDocument();
			expect(document.body.textContent).not.toContain(otherPrefix);
		});

		it("disables both actions while deleting", () => {
			renderDialog({ i18nPrefix, isDeleting: true });

			const cancelButton = screen.getByText("settings.taxonomy.cancel");
			const deleteButton = screen.getByText("settings.taxonomy.deleting");
			expect(cancelButton).toBeDisabled();
			expect(deleteButton).toBeDisabled();
			expect(
				screen.queryByText("settings.taxonomy.confirmDelete"),
			).not.toBeInTheDocument();

			fireEvent.click(deleteButton);
			expect(onConfirm).not.toHaveBeenCalled();
			expect(document.body.textContent).not.toContain(otherPrefix);
		});
	},
);
