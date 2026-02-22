import { TypeBadge } from "@/components/common/TypeBadge";
import type { mediaTypeEnum } from "@/db/schema";

interface DetailsProps {
	title: string;
	year: string | undefined;
	type: (typeof mediaTypeEnum.enumValues)[number];
}

export function Details(props: DetailsProps) {
	const { title, year, type } = props;
	return (
		<div className="flex-1 min-w-0">
			<p className="text-sm font-medium text-foreground leading-snug line-clamp-1">
				{title}
			</p>
			<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
				{year && <span className="text-xs text-muted-foreground">{year}</span>}
				<TypeBadge type={type} />
			</div>
		</div>
	);
}
