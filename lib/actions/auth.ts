"use server";

import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { signIn } from "@/auth";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { redirect } from "next/navigation";

const redisRateLimiter = async () => {
  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) return redirect("/too-fast");
};

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, "email" | "password">,
) => {
  const { email, password } = params;

  await redisRateLimiter();

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.log("Sign In Error", error);
    return { success: false, error: "Invalid Credentials" };
  }
};

export const signUp = async (params: AuthCredentials) => {
  const { fullName, email, password, universityId, universityCard } = params;

  await redisRateLimiter();

  // Check if the user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, error: "User already exists" };
  }

  const hashedPassword = await hash(password, 10);

  try {
    await db.insert(users).values({
      fullName,
      email,
      password: hashedPassword,
      universityId,
      universityCard,
    });

    // await signInWithCredentials({ email, password });

    return { success: true };
  } catch (error) {
    console.log("Signup error", error);
    return { success: false, error: "Signup error" };
  }
};
