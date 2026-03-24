import { useQuery } from "@tanstack/react-query";
import { getUserSettings } from "#/server/settings";

export function useUserSettings() {
	return useQuery({
		queryKey: ["userSettings"],
		queryFn: () => getUserSettings(),
	});
}
