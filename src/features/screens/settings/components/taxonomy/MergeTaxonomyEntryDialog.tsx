import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type { TaxonomyEntry } from "#/lib/taxonomy";
import { cn } from "#/lib/utils";

interface MergeTaxonomyEntryDialogProps {
	isOpen: boolean;
	/** i18n group holding the entity's own strings, e.g. "settings.genres". */
	i18nPrefix: string;
	sourceEntry: TaxonomyEntry | null;
	targetEntries: TaxonomyEntry[];
	preselectedTargetId: number | null;
	isMerging: boolean;
	onCancel: () => void;
	onConfirm: (targetId: number) => void;
}

/**
 * Picks the entry to fold `sourceEntry` into. The options are plain buttons
 * rather than the Radix select: no test in this repo drives that component, and
 * its portal plus pointer capture is unreachable from jsdom.
 */
export function MergeTaxonomyEntryDialog(props: MergeTaxonomyEntryDialogProps) {
	const {
		isOpen,
		i18nPrefix,
		sourceEntry,
		targetEntries,
		preselectedTargetId,
		isMerging,
		onCancel,
		onConfirm,
	} = props;
	const { t } = useTranslation();

	const [selectedTargetId, setSelectedTargetId] = useState<number | null>(
		preselectedTargetId,
	);

	// Keyed on `isOpen`, not just the preselection: the dialog stays mounted
	// while closed, so without this a second merge would inherit the first one's
	// selection whenever both were opened with no preselection.
	useEffect(() => {
		if (isOpen) {
			setSelectedTargetId(preselectedTargetId);
		}
	}, [isOpen, preselectedTargetId]);

	// The caller already filters, but the source must never be its own target.
	const selectableEntries = targetEntries.filter(
		(entry) => entry.id !== sourceEntry?.id,
	);
	const selectedEntry = selectableEntries.find(
		(entry) => entry.id === selectedTargetId,
	);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(isDialogOpen) => {
				if (!isDialogOpen) {
					onCancel();
				}
			}}
		>
			<DialogContent
				className="sm:max-w-md"
				onOpenAutoFocus={(event) => {
					// Autofocusing the first option would highlight a choice the user
					// has not made. Focus the dialog itself — the title still gets
					// announced, and the option list is one Tab away.
					event.preventDefault();
					(event.currentTarget as HTMLElement | null)?.focus();
				}}
			>
				<DialogHeader>
					<DialogTitle>{t("settings.taxonomy.mergeTitle")}</DialogTitle>
					<DialogDescription>
						{/*
						 * Until a target is picked there is no consequence to describe, so
						 * the copy asks for one instead of naming a blank.
						 */}
						{selectedEntry === undefined
							? t(`${i18nPrefix}.mergePrompt` as never, {
									sourceName: sourceEntry?.name ?? "",
								})
							: t(`${i18nPrefix}.mergeDescription` as never, {
									sourceName: sourceEntry?.name ?? "",
									targetName: selectedEntry.name,
								})}
					</DialogDescription>
				</DialogHeader>

				{selectableEntries.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{t("settings.taxonomy.noMergeTargets")}
					</p>
				) : (
					<fieldset className="flex flex-col gap-2">
						<legend className="pb-2 text-sm text-muted-foreground">
							{t("settings.taxonomy.mergeTargetLabel")}
						</legend>
						<div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
							{selectableEntries.map((entry) => {
								const isSelected = entry.id === selectedTargetId;

								return (
									<button
										key={entry.id}
										type="button"
										// The checkmark is the visual cue for what's selected; this
										// is the same cue for anyone not looking at the screen.
										aria-pressed={isSelected}
										onClick={() => setSelectedTargetId(entry.id)}
										disabled={isMerging}
										className={cn(
											"flex min-h-11 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
											isSelected
												? "border-foreground bg-accent font-medium"
												: "border-border hover:bg-accent/50",
										)}
									>
										<span>{entry.name}</span>
										{isSelected && <Check className="size-4 shrink-0" />}
									</button>
								);
							})}
						</div>
					</fieldset>
				)}

				<DialogFooter className="pt-2">
					<Button variant="outline" onClick={onCancel} disabled={isMerging}>
						{t("settings.taxonomy.cancel")}
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							if (selectedTargetId !== null) {
								onConfirm(selectedTargetId);
							}
						}}
						disabled={isMerging || selectedTargetId === null}
					>
						{isMerging
							? t("settings.taxonomy.merging")
							: t("settings.taxonomy.confirmMerge")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
