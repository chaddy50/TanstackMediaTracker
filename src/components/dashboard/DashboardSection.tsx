import { MediaCard } from "#/components/MediaCard";
import type { DashboardItem } from "#/server/dashboard";

interface DashboardSectionProps {
	title: string;
	items: DashboardItem[];
	emptyMessage: string;
}

export function DashboardSection({
	title,
	items,
	emptyMessage,
}: DashboardSectionProps) {
	return (
		<section className="flex flex-col gap-4 flex-none w-max max-w-full">
			<h2 className="text-xl font-semibold">{title}</h2>
			{items.length === 0 ? (
				<p className="text-muted-foreground">{emptyMessage}</p>
			) : (
				<div className="flex gap-4 overflow-x-auto pb-2">
					{items.map((item) => (
						<div key={item.id} className="flex-none w-44">
							<MediaCard mediaItem={item} shouldShowStatus={false} />
						</div>
					))}
				</div>
			)}
		</section>
	);
}
