import { auth } from "#/lib/auth";
import { getRequest } from "@tanstack/react-start/server";

export async function getLoggedInUser() {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw new Error("Unauthorized");
	}
	return session.user;
}
