import { useCallback, useEffect, useRef } from "react";

// `line-height: normal` computes to a keyword rather than a pixel value, so it has to be
// derived. 1.5 matches Tailwind's default text-base/text-sm line-height ratio.
const NORMAL_LINE_HEIGHT_RATIO = 1.5;

interface UseAutoResizeTextareaOptions {
	value: string;
	maxRows: number;
}

function resolveLineHeight(styles: CSSStyleDeclaration): number {
	const lineHeight = Number.parseFloat(styles.lineHeight);
	if (!Number.isNaN(lineHeight)) {
		return lineHeight;
	}
	return Number.parseFloat(styles.fontSize) * NORMAL_LINE_HEIGHT_RATIO;
}

export function useAutoResizeTextarea({
	value,
	maxRows,
}: UseAutoResizeTextareaOptions) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const resize = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) {
			return;
		}

		const styles = window.getComputedStyle(textarea);
		const paddingY =
			Number.parseFloat(styles.paddingTop) +
			Number.parseFloat(styles.paddingBottom);
		const borderY =
			Number.parseFloat(styles.borderTopWidth) +
			Number.parseFloat(styles.borderBottomWidth);
		const maxHeight = maxRows * resolveLineHeight(styles) + paddingY + borderY;

		textarea.style.height = "auto";
		const contentHeight = textarea.scrollHeight + borderY;
		const isClamped = contentHeight > maxHeight;

		textarea.style.height = `${isClamped ? maxHeight : contentHeight}px`;
		textarea.style.overflowY = isClamped ? "auto" : "hidden";
	}, [maxRows]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `value` is a hook argument, which biome does not track as reactive, but re-measuring on every value change is the whole point
	useEffect(() => {
		resize();
	}, [value, resize]);

	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) {
			return;
		}

		const observer = new ResizeObserver(() => resize());
		observer.observe(textarea);
		return () => observer.disconnect();
	}, [resize]);

	return { textareaRef, resize };
}
