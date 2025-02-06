import { serve } from "@upstash/workflow/nextjs";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/workflow";

type UsersState = "non-active" | "active";

type InitialData = {
  email: string;
  fullName: string;
};

const ONE_DAY_IN_MS: number = 24 * 60 * 60 * 1000;
const THREE_DAY_IN_MS: number = 3 * ONE_DAY_IN_MS;
const THIRTY_DAY_IN_MS: number = 30 * ONE_DAY_IN_MS;

const getUsersState = async (email: string): Promise<UsersState> => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user.length === 0) return "non-active";

  const lastActivityDate = new Date(user[0].lastActivityDate!);
  const now = new Date();
  const timeDifference = now.getTime() - lastActivityDate.getTime();

  if (timeDifference > THIRTY_DAY_IN_MS && timeDifference <= THIRTY_DAY_IN_MS) {
    return "non-active";
  }

  return "active";
};

export const { POST } = serve<InitialData>(async (context) => {
  const { email, fullName } = context.requestPayload;

  // Welcome email
  await context.run("new-signup", async () => {
    sendEmail({
      email,
      name: fullName,
      subject: "Welcome to onboarding!",
      message: `Welcome ${fullName}!`,
    });
  });

  await context.sleep("wait-for-3-days", 60 * 60 * 24 * 3);

  while (true) {
    const state = await context.run("check-user-state", async () => {
      return await getUsersState(email);
    });

    if (state === "non-active") {
      await context.run("send-email-non-active", async () => {
        sendEmail({
          email,
          name: fullName,
          subject: "Are you still there?",
          message: `Hey ${fullName}, We miss you!`,
        });
      });
    } else if (state === "active") {
      await context.run("send-email-active", async () => {
        sendEmail({
          email,
          name: fullName,
          subject: "Welcome back!",
          message: `Welcome back ${fullName}!`,
        });
      });
    }

    await context.sleep("wait-for-1-month", 60 * 60 * 24 * 30);
  }
});
