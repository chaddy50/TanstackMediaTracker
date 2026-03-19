import {
	getDefaultMethod,
	getMethodOptions,
	type MethodOption,
} from "#/components/mediaItemDetails/history/components/instance/consumptionUtils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import type { ConsumptionInfo } from "#/db/schema";
import { GameControlMethod, MediaItemType } from "#/server/enums";
import { useId } from "react";
import { useTranslation } from "react-i18next";

interface ConsumptionEditorProps {
	mediaItemType: MediaItemType;
	value: ConsumptionInfo | null;
	onChange: (info: ConsumptionInfo | null) => void;
}

type SelectConfig = {
	id: string;
	label: string;
	value: string;
	options: MethodOption[];
	onChange: (value: string) => void;
	testId: string;
};

export function ConsumptionEditor({
	mediaItemType,
	value,
	onChange,
}: ConsumptionEditorProps) {
	const { t } = useTranslation();
	const controlMethodId = useId();
	const methodId = useId();

	if (mediaItemType === MediaItemType.PODCAST) {
		return null;
	}

	const currentMethod = value?.method ?? getDefaultMethod(mediaItemType);
	const currentControlMethod =
		value?.controlMethod ?? GameControlMethod.CONTROLLER;

	const isGame = mediaItemType === MediaItemType.VIDEO_GAME;

	const selects: SelectConfig[] = [
		{
			id: methodId,
			label: isGame ? t("consumption.platform") : t("consumption.label"),
			value: currentMethod,
			options: getMethodOptions(mediaItemType, t as (key: string) => string),
			onChange: isGame
				? (platform) =>
						onChange({ method: platform, controlMethod: currentControlMethod })
				: (method) => onChange({ method }),
			testId: "consumption-method-select",
		},
	];

	if (isGame) {
		selects.push({
			id: controlMethodId,
			label: t("consumption.controlMethod.label"),
			value: currentControlMethod,
			options: Object.values(GameControlMethod)
				.sort((a, b) =>
					t(`consumption.controlMethod.${a}`).localeCompare(
						t(`consumption.controlMethod.${b}`),
					),
				)
				.map((method) => ({
					value: method,
					label: t(`consumption.controlMethod.${method}`),
				})),
			onChange: (controlMethod) =>
				onChange({
					method: currentMethod,
					controlMethod: controlMethod as GameControlMethod,
				}),
			testId: "consumption-control-method-select",
		});
	}

	return (
		<div className="flex gap-3">
			{selects.map((select) => (
				<div key={select.testId} className="flex flex-col gap-1.5">
					<label htmlFor={select.id} className="text-sm text-muted-foreground">
						{select.label}
					</label>
					<Select value={select.value} onValueChange={select.onChange}>
						<SelectTrigger id={select.id} data-testid={select.testId}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{select.options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			))}
		</div>
	);
}
