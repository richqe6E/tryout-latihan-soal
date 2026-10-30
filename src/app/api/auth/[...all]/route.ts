import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

/** Endpoint Better Auth: /api/auth/sign-up/email, /api/auth/sign-in/*, /api/auth/sign-out, dst. */
export const { GET, POST } = toNextJsHandler(auth);
