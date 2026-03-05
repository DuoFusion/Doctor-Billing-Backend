import nodemailer from "nodemailer";
import { otpModel } from "../database";
import { responseMessage } from "../common";
import { buildOtpEmailTemplate } from "./otp_email_template";
import { config } from "../../config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.EMAIL,
    pass: config.PASS,
  },
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

export interface IOTP {
  email: string;
  otp: string;
  expireAt?: Date;
}

export const otpSender = async (email: string) => {
  const otp = generateOTP();
  const otpString = otp.toString();
  const expireAt = new Date(Date.now() + 1000 * 60 * 3);

  try {
    await otpModel.deleteMany({ email, purpose: "signin" } as any);
    await otpModel.create({ email, otp, expireAt, purpose: "signin" } as any);

    const html = buildOtpEmailTemplate({
      otp: otpString,
      purposeText: "sign in verification",
      supportEmail: config.EMAIL || "support@medicobilling.com",
      brandName: "Medico Billing",
      validMinutes: 3,
      logoUrl: config.APP_LOGO_URL,
    });

    await transporter.sendMail({
      from: `Security Team <${config.EMAIL}>`,
      to: email,
      subject: "Your Account OTP Verification",
      html,
    });

    return { status: true, message: responseMessage.otp_sent };
  } catch (error) {
    return { status: false, message: responseMessage.otp_notSent };
  }
};
