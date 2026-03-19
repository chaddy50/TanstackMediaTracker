import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import { DialogFooter } from "#/components/ui/dialog";

interface DialogActionsProps {
	onCancel: () => void;
	onSave: () => void;
	saveLabel?: string;
	isPending?: boolean;
	isSaveDisabled?: boolean;
	className?: string;
}

export function DialogActions({
	onCancel,
	onSave,
	saveLabel,
	isPending,
	isSaveDisabled,
	className,
}: DialogActionsProps) {
	const { t } = useTranslation();
	return (
		<DialogFooter className={className}>
			<Button
				variant="outline"
				size="sm"
				onClick={onCancel}
				disabled={isPending}
			>
				{t("common.cancel")}
			</Button>
			<Button size="sm" onClick={onSave} disabled={isPending || isSaveDisabled}>
				{saveLabel ?? t("common.save")}
			</Button>
		</DialogFooter>
	);
}
