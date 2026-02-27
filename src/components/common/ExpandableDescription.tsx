import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ExpandableDescriptionProps {
	text: string;
}

export function ExpandableDescription({ text }: ExpandableDescriptionProps) {
	const { t } = useTranslation();
	const paragraphRef = useRef<HTMLParagraphElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);

	useEffect(() => {
		const el = paragraphRef.current;
		if (el) {
			setIsOverflowing(el.scrollHeight > el.clientHeight);
		}
	}, []);

	return (
		<div>
			<p
				ref={paragraphRef}
				className={`text-muted-foreground text-sm leading-relaxed ${isExpanded ? "" : "line-clamp-7"}`}
			>
				{text}
			</p>
			{isOverflowing && (
				<button
					type="button"
					onClick={() => setIsExpanded((prev) => !prev)}
					className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					{isExpanded ? t("common.showLess") : t("common.showMore")}
				</button>
			)}
		</div>
	);
}
