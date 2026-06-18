import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getCurrentUser() {
  const data = await auth.api.getSession({ headers: await headers() });
  return data?.user ?? null;
}

/** Use in server components / route handlers that require auth. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For route handlers: returns user or null (caller returns 401). */
export async function getUserOrNull() {
  const data = await auth.api.getSession({ headers: await headers() });
  return data?.user ?? null;
}
