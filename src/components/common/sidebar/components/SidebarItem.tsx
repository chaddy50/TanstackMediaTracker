import { Link } from "@tanstack/react-router";
import type React from "react";
import type { ComponentProps } from "react";

interface SidebarItemProps {
	to: ComponentProps<typeof Link>["to"];
	icon?: React.ReactNode;
	children: React.ReactNode;
	activeOptions?: ComponentProps<typeof Link>["activeOptions"];
	params?: Record<string, string>;
}

export function SidebarItem({
	to,
	icon,
	children,
	activeOptions,
	params,
}: SidebarItemProps) {
	return (
		<Link
			to={to}
			className="flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
			activeProps={{ className: "bg-accent text-accent-foreground" }}
			activeOptions={activeOptions}
			params={params as ComponentProps<typeof Link>["params"]}
		>
			{icon}
			{children}
		</Link>
	);
}
