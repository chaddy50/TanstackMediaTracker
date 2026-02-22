export function PageHeader({
	left,
	right,
}: {
	left: React.ReactNode;
	right?: React.ReactNode;
}) {
	return (
		<header className="px-6 py-4 border-b border-border flex items-center justify-between">
			{left}
			{right}
		</header>
	);
}
