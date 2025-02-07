import { Client as WorkflowClient } from "@upstash/workflow";
import config from "@/lib/config";
import emailjs from "@emailjs/browser";

export const workflowClient = new WorkflowClient({
  baseUrl: config.env.upstash.qstashUrl,
  token: config.env.upstash.qstashToken,
});

export const sendEmail = async ({
  email,
  name,
  subject,
  message,
}: {
  email: string;
  name: string;
  subject: string;
  message: string;
}) => {
  emailjs.init({
    publicKey: config.env.emailjs.publicId,
    blockHeadless: true,
    limitRate: {
      id: "app",
      throttle: 10000,
    },
  });

  try {
    const response = await emailjs.send(
      config.env.emailjs.serviceId,
      config.env.emailjs.templateId,
      {
        email,
        name,
        subject,
        message,
      },
    );
    console.log("Email sent successfully:", response.status, response.text);
    return response;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};
