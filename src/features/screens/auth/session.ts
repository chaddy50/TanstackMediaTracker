import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/features/screens/auth/auth";

export async function getLoggedInUser() {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw new Error("Unauthorized");
	}
	return session.user;
}
