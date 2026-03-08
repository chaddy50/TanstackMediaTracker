import { MediaCard } from "#/components/common/MediaCard";
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
		<section className="flex flex-col gap-4 w-full md:flex-none md:w-max md:max-w-full">
			<h2 className="text-xl font-semibold">{title}</h2>
			{items.length === 0 ? (
				<p className="text-muted-foreground">{emptyMessage}</p>
			) : (
				<div className="grid grid-cols-2 gap-4 md:flex md:gap-4 md:overflow-x-auto md:pb-2">
					{items.map((item) => (
						<div key={item.id} className="md:flex-none md:w-44">
							<MediaCard mediaItem={item} shouldShowStatus={false} />
						</div>
					))}
				</div>
			)}
		</section>
	);
}
