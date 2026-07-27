import { useQuery } from "@tanstack/react-query";
import { getUserSettings } from "#/features/screens/settings/settings";

export function useUserSettings() {
	return useQuery({
		queryKey: ["userSettings"],
		queryFn: () => getUserSettings(),
	});
}
