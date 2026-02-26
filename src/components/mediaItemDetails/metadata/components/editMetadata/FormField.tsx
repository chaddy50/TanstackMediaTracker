export function FormField({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-sm text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}
