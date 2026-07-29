import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnsavedChangesDialog } from "#/components/UnsavedChangesDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const onKeepEditing = vi.fn();
const onDiscard = vi.fn();
const onSaveAndContinue = vi.fn();

function renderDialog(overrides: { open?: boolean; isSaving?: boolean } = {}) {
	return render(
		<UnsavedChangesDialog
			open={overrides.open ?? true}
			isSaving={overrides.isSaving ?? false}
			onKeepEditing={onKeepEditing}
			onDiscard={onDiscard}
			onSaveAndContinue={onSaveAndContinue}
		/>,
	);
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("UnsavedChangesDialog", () => {
	it("renders the title, description and all three actions when open", () => {
		renderDialog();

		expect(screen.getByText("unsavedChanges.title")).toBeInTheDocument();
		expect(screen.getByText("unsavedChanges.description")).toBeInTheDocument();
		expect(screen.getByText("unsavedChanges.keepEditing")).toBeInTheDocument();
		expect(screen.getByText("unsavedChanges.discard")).toBeInTheDocument();
		expect(
			screen.getByText("unsavedChanges.saveAndContinue"),
		).toBeInTheDocument();
	});

	it("renders nothing when closed", () => {
		renderDialog({ open: false });

		expect(screen.queryByText("unsavedChanges.title")).not.toBeInTheDocument();
	});

	it("calls onKeepEditing when Keep Editing is clicked", () => {
		renderDialog();

		fireEvent.click(screen.getByText("unsavedChanges.keepEditing"));

		expect(onKeepEditing).toHaveBeenCalledTimes(1);
		expect(onDiscard).not.toHaveBeenCalled();
		expect(onSaveAndContinue).not.toHaveBeenCalled();
	});

	it("calls onDiscard when Discard Changes is clicked", () => {
		renderDialog();

		fireEvent.click(screen.getByText("unsavedChanges.discard"));

		expect(onDiscard).toHaveBeenCalledTimes(1);
		expect(onKeepEditing).not.toHaveBeenCalled();
		expect(onSaveAndContinue).not.toHaveBeenCalled();
	});

	it("calls onSaveAndContinue when Save & Continue is clicked", () => {
		renderDialog();

		fireEvent.click(screen.getByText("unsavedChanges.saveAndContinue"));

		expect(onSaveAndContinue).toHaveBeenCalledTimes(1);
		expect(onKeepEditing).not.toHaveBeenCalled();
		expect(onDiscard).not.toHaveBeenCalled();
	});

	it("disables the committing actions while saving", () => {
		renderDialog({ isSaving: true });

		const discardButton = screen.getByText("unsavedChanges.discard");
		expect(discardButton).toBeDisabled();
		expect(screen.getByText("common.saving")).toBeDisabled();

		fireEvent.click(discardButton);
		expect(onDiscard).not.toHaveBeenCalled();
	});

	// Overlay clicks are not reproducible in jsdom (Radix uses pointer capture);
	// Escape exercises the same onOpenChange(false) path.
	it("treats dismissing the dialog as keeping the editor open", () => {
		renderDialog();

		fireEvent.keyDown(document, { key: "Escape" });

		expect(onKeepEditing).toHaveBeenCalled();
		expect(onDiscard).not.toHaveBeenCalled();
	});
});
