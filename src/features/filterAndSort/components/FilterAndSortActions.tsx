import { useTranslation } from "react-i18next";
import { DeleteButton } from "#/components/DeleteButton";
import { SaveAndCancelButtons } from "#/components/SaveAndCancelButtons";

interface FilterAndSortActionsProps {
	onSubmit: () => void;
	onCancel: () => void;
	submitLabel?: string;
	isSubmitting: boolean;
	isSubmitDisabled: boolean;
	onDelete?: () => void;
	isDeleting?: boolean;
}

export function FilterAndSortActions({
	onSubmit,
	onCancel,
	submitLabel,
	isSubmitting,
	isSubmitDisabled,
	onDelete,
	isDeleting = false,
}: FilterAndSortActionsProps) {
	const { t } = useTranslation();
	const isPending = isSubmitting || isDeleting;

	return (
		<div className="flex items-center justify-between pt-2">
			<div>
				{onDelete && (
					<DeleteButton onClick={onDelete} disabled={isPending}>
						{t("views.deleteView")}
					</DeleteButton>
				)}
			</div>
			<SaveAndCancelButtons
				onSave={onSubmit}
				saveLabel={isSubmitting ? t("views.form.saving") : submitLabel}
				onCancel={onCancel}
				isPending={isPending}
				isSaveDisabled={isSubmitDisabled}
			/>
		</div>
	);
}
