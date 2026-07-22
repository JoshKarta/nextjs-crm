import { Resend } from "resend";

export const sendEmail = async (payload: {
  to: string;
  subject: string;
  text: string;
}) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const response = await resend.emails.send({
      from: "Zexa Technologies <no-reply@zexa.app>",
      ...payload,
    });

    console.log("Email sent successfully:", response);

    if (response?.data) return true;
    return false;
  } catch (error: any) {
    console.error("Error sending email:", error);
    return false;
  }
};
