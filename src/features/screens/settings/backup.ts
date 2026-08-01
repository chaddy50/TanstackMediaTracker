import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	backupSchema,
	exportBackup as exportBackupForUser,
	importBackup as importBackupForUser,
} from "#/features/screens/settings/backup.server";

export type { BackupData } from "#/features/screens/settings/backup.server";

export const exportBackup = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		return exportBackupForUser(user.id);
	},
);

export const importBackup = createServerFn({ method: "POST" })
	.inputValidator(z.object({ backup: backupSchema }))
	.handler(async ({ data: { backup } }) => {
		const user = await getLoggedInUser();
		return importBackupForUser(backup, user.id);
	});
