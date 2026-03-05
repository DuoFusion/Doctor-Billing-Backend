export const responseMessage = {
  DB_connection_successFull: "MongoDB server connected successfully.",
  DB_connection_failed: "Failed to connect to MongoDB server.",

  signIn_successful: "Sign-in successful. OTP has been sent to your email.",
  signIn_failed: "User sign-in failed.",

  signOut_SuccessFull: "Signout successfull",
  signOut_failed: "Signout failed",
  changePassword_success: "Password changed successfully",
  changePassword_failed: "Failed to change password",
  oldPassword_incorrect: "Old password is incorrect",
  password_confirm_mismatch: "New password and confirm password do not match",
  forgotPassword_otp_sent: "OTP sent successfully to your email",
  forgotPassword_otp_send_failed: "Failed to send OTP",
  forgotPassword_otp_verified: "OTP verified successfully",
  forgotPassword_otp_verify_failed: "Failed to verify OTP",
  forgotPassword_otp_invalid: "Invalid OTP",
  forgotPassword_otp_expired: "OTP has expired",
  forgotPassword_reset_success: "Password reset successfully",
  forgotPassword_reset_failed: "Failed to reset password",
  updateProfile_success: "Profile updated successfully",
  updateProfile_failed: "Failed to update profile",

  otp_sent: "OTP sent successfully.",
  otp_notSent: "Failed to send OTP.",
  otp_invalid: "Invalid OTP entered.",
  otp_verifyAndSignin: "OTP verified successfully. Sign-in completed.",

  userNotFound: "User not found.",
  incorrectPassword: "Incorrect password.",
  input_error: "All fields are required.",

  missingBillFields: "Required fields missing",
  invalidPaymentMethod: "Invalid payment method",

  notAuthenticated: "User not authenticated",
  invalidToken: "Invalid token",
  getMe_success: "User info fetched successfully",

  customMessage: (message: string): any => {return `${message[0].toUpperCase() + message.slice(1).toLowerCase()}`;},
  invalidId: (message: string): any => {return `invalid ${message}!`;},
  dataAlreadyExist: (message: any): any => {return `Please change ${message}, ${message} is already exists!`;},
  getDataSuccess: (message: string): any => {return `${message[0].toUpperCase() + message.slice(1).toLowerCase()} successfully retrieved!`;},
  addDataSuccess: (message: string): any => {return `${message[0].toUpperCase() + message.slice(1).toLowerCase()} successfully added!`;},
  getDataNotFound: (message: string): any => {return `We couldn't find the ${message.toLowerCase()} you requested!`;},
  updateDataSuccess: (message: string): any => {return `${message[0].toUpperCase() + message.slice(1).toLowerCase()} has been successfully updated!`},
  updateDataError: (message: string): any => {return `${message[0].toUpperCase() + message.slice(1).toLowerCase()} updating time getting an error!`},
  deleteDataSuccess: (message: string): any => {return `Your ${message.toLowerCase()} has been successfully deleted!`},
};

