import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Settings } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { CreateViewDialog } from "#/components/views/CreateViewDialog";
import { getViews } from "#/server/views";

interface NavDrawerProps {
	isOpen: boolean;
	onClose: () => void;
}

export function NavDrawer({ isOpen, onClose }: NavDrawerProps) {
	const { t } = useTranslation();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	const { data: viewsList = [] } = useQuery({
		queryKey: ["views"],
		queryFn: () => getViews(),
	});

	return (
		<>
			<Sheet open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); } }}>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>{t("nav.menu")}</SheetTitle>
					</SheetHeader>
					<div className="flex flex-col overflow-y-auto flex-1">
						{viewsList.length > 0 && (
							<div className="flex flex-col gap-0.5 px-4 py-3">
								<p className="px-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									{t("nav.views")}
								</p>
								{viewsList.map((view) => (
									<SheetClose asChild key={view.id}>
										<Link
											to="/views/$viewId"
											params={{ viewId: String(view.id) }}
											className="flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
											activeProps={{ className: "bg-accent text-accent-foreground" }}
										>
											{view.name}
										</Link>
									</SheetClose>
								))}
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-start gap-2 mt-1"
									onClick={() => setIsCreateDialogOpen(true)}
								>
									<Plus className="size-4 shrink-0" />
									{t("views.newView")}
								</Button>
							</div>
						)}
						{viewsList.length === 0 && (
							<div className="px-4 py-3">
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-start gap-2"
									onClick={() => setIsCreateDialogOpen(true)}
								>
									<Plus className="size-4 shrink-0" />
									{t("views.newView")}
								</Button>
							</div>
						)}
						<div className="border-t border-border px-4 py-3 mt-auto">
							<SheetClose asChild>
								<Link
									to="/settings"
									className="flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
									activeProps={{ className: "bg-accent text-accent-foreground" }}
								>
									<Settings className="size-4 shrink-0" />
									{t("nav.settings")}
								</Link>
							</SheetClose>
						</div>
					</div>
				</SheetContent>
			</Sheet>
			<CreateViewDialog
				isOpen={isCreateDialogOpen}
				onClose={() => setIsCreateDialogOpen(false)}
			/>
		</>
	);
}
