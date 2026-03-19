import { DialogActions } from "#/components/common/DialogActions";
import { DeleteButton } from "#/components/common/DeleteButton";
import { useTranslation } from "react-i18next";

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
			<DialogActions
				onSave={onSubmit}
				saveLabel={isSubmitting ? t("views.form.saving") : submitLabel}
				onCancel={onCancel}
				isPending={isPending}
				isSaveDisabled={isSubmitDisabled}
			/>
		</div>
	);
}
