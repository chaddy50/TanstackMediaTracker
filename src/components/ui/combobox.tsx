import * as React from "react";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "#/server/utils";

import { Input } from "./input";

interface ComboboxItem {
	id: number;
	name: string;
}

interface SearchableComboboxProps {
	items: ComboboxItem[];
	triggerLabel: string;
	noValueLabel: string;
	createNewLabel: (name: string) => string;
	onSelect: (id: number | null) => void;
	onCreateNew: (name: string) => void;
	className?: string;
}

export function SearchableCombobox({
	items,
	triggerLabel,
	noValueLabel,
	createNewLabel,
	onSelect,
	onCreateNew,
	className,
}: SearchableComboboxProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const filteredItems = query
		? items.filter((item) =>
				item.name.toLowerCase().includes(query.toLowerCase()),
			)
		: items;

	const trimmedQuery = query.trim();

	function handleSelect(id: number | null) {
		onSelect(id);
		setIsOpen(false);
		setQuery("");
	}

	function handleCreateNew() {
		if (trimmedQuery) {
			onCreateNew(trimmedQuery);
			setIsOpen(false);
			setQuery("");
		}
	}

	function handleOpenChange(open: boolean) {
		setIsOpen(open);
		if (!open) {
			setQuery("");
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" && trimmedQuery && filteredItems.length === 0) {
			handleCreateNew();
		}
	}

	const itemOptionClasses =
		"flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground";

	return (
		<PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
			<PopoverPrimitive.Trigger asChild>
				<button
					type="button"
					className={cn(
						"border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
						className,
					)}
				>
					<span className="truncate">{triggerLabel}</span>
					<ChevronDownIcon className="size-4 shrink-0 opacity-50" />
				</button>
			</PopoverPrimitive.Trigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					align="start"
					sideOffset={4}
					onOpenAutoFocus={(e) => {
						e.preventDefault();
						inputRef.current?.focus();
					}}
					className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 w-(--radix-popover-trigger-width) overflow-hidden rounded-md border shadow-md"
				>
					<div className="border-b border-border p-1">
						<Input
							ref={inputRef}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Search..."
							className="h-8 border-0 shadow-none focus-visible:ring-0"
						/>
					</div>
					<div
					className="max-h-56 overflow-y-auto p-1"
					onWheel={(e) => e.stopPropagation()}
				>
						<button
							type="button"
							onClick={() => handleSelect(null)}
							className={itemOptionClasses}
						>
							{noValueLabel}
						</button>
						{filteredItems.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => handleSelect(item.id)}
								className={itemOptionClasses}
							>
								{item.name}
							</button>
						))}
						{trimmedQuery && (
							<button
								type="button"
								onClick={handleCreateNew}
								className={cn(itemOptionClasses, "text-muted-foreground gap-1.5")}
							>
								<PlusIcon className="size-3.5 shrink-0" />
								{createNewLabel(trimmedQuery)}
							</button>
						)}
					</div>
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}
