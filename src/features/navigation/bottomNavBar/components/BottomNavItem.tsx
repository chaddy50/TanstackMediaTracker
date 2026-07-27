import { Link, useMatchRoute } from "@tanstack/react-router";

import { cn } from "#/lib/utils";

interface BottomNavItemProps {
	to: string;
	icon: React.ReactNode;
	label: string;
	exact?: boolean;
}

export function BottomNavItem({
	to,
	icon,
	label,
	exact = false,
}: BottomNavItemProps) {
	const matchRoute = useMatchRoute();
	const isActive = !!matchRoute({ to, fuzzy: !exact });

	return (
		<Link
			to={to}
			activeOptions={{ exact }}
			className={cn(
				"flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors flex-1",
				isActive
					? "text-foreground"
					: "text-muted-foreground hover:text-foreground",
			)}
		>
			{icon}
			<span>{label}</span>
		</Link>
	);
}
