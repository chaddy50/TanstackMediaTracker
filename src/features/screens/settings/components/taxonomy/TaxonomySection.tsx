import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Merge, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import type { TaxonomyEntry } from "#/lib/taxonomy";
import { DeleteTaxonomyEntryDialog } from "./DeleteTaxonomyEntryDialog";
import { MergeTaxonomyEntryDialog } from "./MergeTaxonomyEntryDialog";
import type { TaxonomySectionConfig } from "./types";

interface TaxonomySectionProps {
	config: TaxonomySectionConfig;
}

/**
 * The settings panel for one taxonomy entity — create, rename, delete, each with
 * an in-use warning and the saved-view-filter rewrite handled server-side. Every
 * entity-specific detail arrives through `config`, so tags and genres share this
 * one implementation.
 */
export function TaxonomySection({ config }: TaxonomySectionProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const router = useRouter();

	const { data: entryList = [] } = useQuery({
		queryKey: config.listQueryKey,
		queryFn: () => config.listEntries(),
	});

	const [newEntryName, setNewEntryName] = useState("");
	const [createErrorKey, setCreateErrorKey] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);

	const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
	const [draftName, setDraftName] = useState("");
	const [renameErrorKey, setRenameErrorKey] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const [pendingDeleteEntry, setPendingDeleteEntry] =
		useState<TaxonomyEntry | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const [pendingMergeEntry, setPendingMergeEntry] =
		useState<TaxonomyEntry | null>(null);
	const [preselectedMergeTargetId, setPreselectedMergeTargetId] = useState<
		number | null
	>(null);
	const [isMerging, setIsMerging] = useState(false);

	/**
	 * The entry the failed rename collided with, when it is one we have loaded.
	 * A stale list can miss it, in which case the conflict stays a plain error.
	 */
	const collidingEntry =
		renameErrorKey === "settings.taxonomy.conflictError"
			? entryList.find((entry) => entry.name === draftName.trim())
			: undefined;

	/** Everything that reads this entity, plus the loaders behind the item lists. */
	async function refreshEntryConsumers() {
		await queryClient.invalidateQueries({ queryKey: config.listQueryKey });
		for (const queryKey of config.dependentQueryKeys) {
			await queryClient.invalidateQueries({ queryKey });
		}
		router.invalidate();
	}

	async function handleCreateEntry() {
		const trimmedName = newEntryName.trim();
		if (trimmedName.length === 0) {
			setCreateErrorKey("settings.taxonomy.emptyNameError");
			return;
		}

		setIsCreating(true);
		try {
			const result = await config.createEntry(trimmedName);
			if (result.status === "conflict") {
				setCreateErrorKey("settings.taxonomy.conflictError");
				return;
			}

			setNewEntryName("");
			setCreateErrorKey(null);
			await refreshEntryConsumers();
		} finally {
			setIsCreating(false);
		}
	}

	function handleStartRename(entry: TaxonomyEntry) {
		setEditingEntryId(entry.id);
		setDraftName(entry.name);
		setRenameErrorKey(null);
	}

	function handleCancelRename() {
		setEditingEntryId(null);
		setDraftName("");
		setRenameErrorKey(null);
	}

	async function handleSaveRename(entryId: number) {
		const trimmedName = draftName.trim();
		if (trimmedName.length === 0) {
			setRenameErrorKey("settings.taxonomy.emptyNameError");
			return;
		}

		setIsSaving(true);
		try {
			const result = await config.renameEntry(entryId, trimmedName);
			if (result.status === "conflict") {
				setRenameErrorKey("settings.taxonomy.conflictError");
				return;
			}

			handleCancelRename();
			await refreshEntryConsumers();
		} finally {
			setIsSaving(false);
		}
	}

	function handleStartMerge(entry: TaxonomyEntry, targetId: number | null) {
		setPendingMergeEntry(entry);
		setPreselectedMergeTargetId(targetId);
	}

	function handleCancelMerge() {
		setPendingMergeEntry(null);
		setPreselectedMergeTargetId(null);
	}

	async function handleConfirmMerge(targetId: number) {
		if (pendingMergeEntry === null) {
			return;
		}

		setIsMerging(true);
		try {
			await config.mergeEntries(pendingMergeEntry.id, targetId);
			handleCancelMerge();
			// A merge can start from the rename conflict, so leave edit mode too.
			handleCancelRename();
			await refreshEntryConsumers();
		} finally {
			setIsMerging(false);
		}
	}

	async function handleConfirmDelete() {
		if (pendingDeleteEntry === null) {
			return;
		}

		setIsDeleting(true);
		try {
			await config.deleteEntry(pendingDeleteEntry.id);
			setPendingDeleteEntry(null);
			await refreshEntryConsumers();
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<Input
						value={newEntryName}
						onChange={(event) => {
							setNewEntryName(event.target.value);
							setCreateErrorKey(null);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								handleCreateEntry();
							}
						}}
						placeholder={t(`${config.i18nPrefix}.newPlaceholder` as never)}
						className="h-9 max-w-xs"
					/>
					<Button
						onClick={handleCreateEntry}
						disabled={isCreating}
						variant="outline"
					>
						{isCreating
							? t("settings.taxonomy.adding")
							: t("settings.taxonomy.add")}
					</Button>
				</div>
				{createErrorKey !== null && (
					<p className="text-sm text-destructive">
						{t(createErrorKey as never)}
					</p>
				)}
			</div>

			{entryList.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{t(`${config.i18nPrefix}.empty` as never)}
				</p>
			) : (
				<ul className="flex flex-col divide-y divide-border border-y border-border">
					{entryList.map((entry) => {
						const isEditing = entry.id === editingEntryId;

						return (
							<li key={entry.id} className="flex flex-col gap-2 py-3">
								{isEditing ? (
									<div className="flex items-center gap-2">
										<Input
											value={draftName}
											onChange={(event) => {
												setDraftName(event.target.value);
												setRenameErrorKey(null);
											}}
											onKeyDown={(event) => {
												if (event.key === "Enter") {
													event.preventDefault();
													handleSaveRename(entry.id);
												} else if (event.key === "Escape") {
													handleCancelRename();
												}
											}}
											className="h-9 max-w-xs"
										/>
										<Button
											onClick={() => handleSaveRename(entry.id)}
											disabled={isSaving}
											variant="outline"
											size="sm"
										>
											{t("settings.taxonomy.save")}
										</Button>
										<Button
											onClick={handleCancelRename}
											disabled={isSaving}
											variant="ghost"
											size="sm"
										>
											{t("settings.taxonomy.cancel")}
										</Button>
									</div>
								) : (
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-baseline gap-2">
											<span className="text-sm font-medium">{entry.name}</span>
											<span className="text-sm text-muted-foreground">
												{t(`${config.i18nPrefix}.usageCount` as never, {
													count: entry.itemCount,
												})}
											</span>
										</div>
										<div className="flex items-center gap-1">
											<Button
												onClick={() => handleStartRename(entry)}
												variant="ghost"
												size="icon"
												aria-label={t("settings.taxonomy.rename")}
											>
												<Pencil className="size-4" />
											</Button>
											{entryList.length > 1 && (
												<Button
													onClick={() => handleStartMerge(entry, null)}
													variant="ghost"
													size="icon"
													aria-label={t("settings.taxonomy.merge")}
												>
													<Merge className="size-4" />
												</Button>
											)}
											<Button
												onClick={() => setPendingDeleteEntry(entry)}
												variant="ghost"
												size="icon"
												aria-label={t("settings.taxonomy.delete")}
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
									</div>
								)}

								{isEditing && renameErrorKey !== null && (
									<div className="flex items-center gap-2">
										<p className="text-sm text-destructive">
											{t(renameErrorKey as never)}
										</p>
										{collidingEntry !== undefined && (
											<Button
												onClick={() =>
													handleStartMerge(entry, collidingEntry.id)
												}
												variant="link"
												size="sm"
												className="h-auto p-0 text-sm"
											>
												{t("settings.taxonomy.mergeConflictShortcut")}
											</Button>
										)}
									</div>
								)}
							</li>
						);
					})}
				</ul>
			)}

			<MergeTaxonomyEntryDialog
				isOpen={pendingMergeEntry !== null}
				i18nPrefix={config.i18nPrefix}
				sourceEntry={pendingMergeEntry}
				targetEntries={entryList.filter(
					(entry) => entry.id !== pendingMergeEntry?.id,
				)}
				preselectedTargetId={preselectedMergeTargetId}
				isMerging={isMerging}
				onCancel={handleCancelMerge}
				onConfirm={handleConfirmMerge}
			/>

			<DeleteTaxonomyEntryDialog
				isOpen={pendingDeleteEntry !== null}
				i18nPrefix={config.i18nPrefix}
				entryName={pendingDeleteEntry?.name ?? ""}
				itemCount={pendingDeleteEntry?.itemCount ?? 0}
				isDeleting={isDeleting}
				onCancel={() => setPendingDeleteEntry(null)}
				onConfirm={handleConfirmDelete}
			/>
		</section>
	);
}
