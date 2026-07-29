import { useBlocker } from "@tanstack/react-router";
import { useRef, useState } from "react";

interface UseUnsavedChangesGuardOptions {
	hasUnsavedChanges: () => boolean;
	save: () => Promise<boolean>;
	isEnabled?: () => boolean;
}

interface UnsavedChangesGuard {
	isPrompting: boolean;
	isSaving: boolean;
	startEditing: (action: () => void) => void;
	keepEditing: () => void;
	discard: () => void;
	saveAndContinue: () => Promise<void>;
}

/**
 * Intercepts anything that would abandon unsaved edits — router navigations,
 * browser unload, and in-page transitions routed through `startEditing` — and
 * holds it open until the caller resolves the prompt.
 */
export function useUnsavedChangesGuard(
	options: UseUnsavedChangesGuardOptions,
): UnsavedChangesGuard {
	const optionsRef = useRef(options);
	optionsRef.current = options;

	const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	function shouldGuard() {
		const { hasUnsavedChanges, isEnabled } = optionsRef.current;
		return (isEnabled?.() ?? true) && hasUnsavedChanges();
	}

	const resolver = useBlocker({
		shouldBlockFn: shouldGuard,
		enableBeforeUnload: shouldGuard,
		withResolver: true,
	});

	function startEditing(action: () => void) {
		if (!shouldGuard()) {
			action();
			return;
		}
		setPendingAction(() => action);
	}

	function keepEditing() {
		if (pendingAction) {
			setPendingAction(null);
			return;
		}
		resolver.reset?.();
	}

	function discard() {
		if (pendingAction) {
			setPendingAction(null);
			pendingAction();
			return;
		}
		resolver.proceed?.();
	}

	async function saveAndContinue() {
		setIsSaving(true);
		try {
			const wasSaved = await optionsRef.current.save();
			if (wasSaved) {
				discard();
			} else {
				keepEditing();
			}
		} catch {
			keepEditing();
		} finally {
			setIsSaving(false);
		}
	}

	return {
		isPrompting: resolver.status === "blocked" || pendingAction !== null,
		isSaving,
		startEditing,
		keepEditing,
		discard,
		saveAndContinue,
	};
}
