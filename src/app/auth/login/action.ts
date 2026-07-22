"use server";

import { auth } from "@/lib/auth";
import { APIError } from "better-auth/api";
import { ActionResult } from "@/lib/schemas";

export async function loginUser({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<ActionResult<{ user: { id: string; email: string } }>> {
  try {
    await auth.api.signInEmail({ body: { email, password } });

    return {
      success: { reason: "Login successful" },
      error: null,
      data: undefined,
    };
  } catch (err) {
    if (err instanceof APIError) {
      return {
        error: { reason: err.message },
        success: null,
      };
    }

    return { error: { reason: "Something went wrong." }, success: null };
  }
}
