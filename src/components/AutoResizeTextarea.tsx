import { useAutoResizeTextarea } from "#/components/hooks/useAutoResizeTextarea";
import { Textarea } from "#/components/ui/textarea";
import { cn } from "#/lib/utils";
import type * as React from "react";

interface AutoResizeTextareaProps
	extends Omit<React.ComponentProps<"textarea">, "rows"> {
	value: string;
	minRows?: number;
	maxRows?: number;
}

export function AutoResizeTextarea({
	value,
	minRows = 6,
	maxRows = 20,
	className,
	...props
}: AutoResizeTextareaProps) {
	const { textareaRef } = useAutoResizeTextarea({ value, maxRows });

	return (
		<Textarea
			ref={textareaRef}
			value={value}
			rows={minRows}
			className={cn("field-sizing-fixed resize-none", className)}
			{...props}
		/>
	);
}
