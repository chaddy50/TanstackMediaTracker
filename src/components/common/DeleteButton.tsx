import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

interface DeleteButtonProps {
	onClick: () => void;
	disabled?: boolean;
	className?: string;
	children: ReactNode;
}

export function DeleteButton({
	onClick,
	disabled,
	className,
	children,
}: DeleteButtonProps) {
	return (
		<Button
			variant="ghost"
			size="sm"
			className={cn(
				"group/trash text-muted-foreground hover:text-white hover:bg-destructive dark:hover:bg-destructive/60 gap-0 overflow-hidden transition-all duration-200",
				className,
			)}
			onClick={onClick}
			disabled={disabled}
		>
			<Trash2 className="size-4 shrink-0" />
			<span className="max-w-0 overflow-hidden whitespace-nowrap group-hover/trash:max-w-50 group-hover/trash:ml-1.5 transition-all duration-200">
				{children}
			</span>
		</Button>
	);
}
