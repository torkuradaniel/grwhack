import { Resend } from "resend";
import { env, FROM_EMAIL, RECIPIENT_EMAIL } from "./config.js";

const resend = new Resend(env.resendApiKey);

export async function sendEmail(subject: string, html: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: RECIPIENT_EMAIL,
    subject,
    html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message ?? JSON.stringify(error)}`);
}
