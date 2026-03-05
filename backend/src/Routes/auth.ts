import express from "express";
import { authController } from "../controllers";

const router = express.Router();

router.post("/signin" , authController.signIn);
router.post("/signout" , authController.signout);
router.post("/otp/verify" , authController.verifyOTP)
router.post("/forgot-password/send-otp", authController.sendForgotPasswordOtp);
router.put("/forgot-password/reset-password", authController.resetForgotPassword);

export const authRouter =  router;
