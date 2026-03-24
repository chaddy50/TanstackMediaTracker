import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "#/components/ui/input";
import { getTags } from "#/server/tags";

interface TagsEditorProps {
	pendingTags: string[];
	onPendingTagsChange: (tags: string[]) => void;
}

export function TagsEditor({ pendingTags, onPendingTagsChange }: TagsEditorProps) {
	const { t } = useTranslation();
	const inputRef = useRef<HTMLInputElement>(null);

	const [inputValue, setInputValue] = useState("");
	const [isShowingSuggestions, setIsShowingSuggestions] = useState(false);

	const { data: allUserTags = [] } = useQuery({
		queryKey: ["tags"],
		queryFn: () => getTags(),
	});

	const suggestions = allUserTags
		.map((tag) => tag.name)
		.filter(
			(name) =>
				name.toLowerCase().includes(inputValue.toLowerCase()) &&
				!pendingTags.includes(name),
		);

	function addTag(name: string) {
		const trimmed = name.trim();
		if (trimmed && !pendingTags.includes(trimmed)) {
			onPendingTagsChange([...pendingTags, trimmed]);
		}
		setInputValue("");
		setIsShowingSuggestions(false);
		inputRef.current?.focus();
	}

	function removeTag(name: string) {
		onPendingTagsChange(pendingTags.filter((tag) => tag !== name));
	}

	function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter" || event.key === ",") {
			event.preventDefault();
			if (inputValue.trim()) {
				addTag(inputValue);
			}
		} else if (event.key === "Escape") {
			setIsShowingSuggestions(false);
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<span className="text-sm text-muted-foreground">{t("mediaItem.tags")}</span>

			<div className="relative">
				<Input
					ref={inputRef}
					value={inputValue}
					onChange={(e) => {
						setInputValue(e.target.value);
						setIsShowingSuggestions(true);
					}}
					onKeyDown={handleInputKeyDown}
					onFocus={() => setIsShowingSuggestions(true)}
					onBlur={() => {
						// Delay to allow suggestion click to register
						setTimeout(() => setIsShowingSuggestions(false), 150);
					}}
					placeholder={t("mediaItem.addTag")}
					className="h-8 text-sm"
				/>
				{isShowingSuggestions && suggestions.length > 0 && (
					<ul className="absolute z-10 bottom-full mb-1 w-full bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
						{suggestions.map((suggestion) => (
							<li key={suggestion}>
								<button
									type="button"
									className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
									onMouseDown={() => addTag(suggestion)}
								>
									{suggestion}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			{pendingTags.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{pendingTags.map((tag) => (
						<span
							key={tag}
							className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm"
						>
							{tag}
							<button
								type="button"
								onClick={() => removeTag(tag)}
								className="text-muted-foreground hover:text-foreground transition-colors"
								aria-label={t("mediaItem.removeTag", { tag })}
							>
								<X className="size-3" />
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}
