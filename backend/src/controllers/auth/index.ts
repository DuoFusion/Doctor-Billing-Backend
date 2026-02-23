import { authModel, otpModel } from "../../model";
import bcrypt from "bcryptjs";
import { responseMessage, status_code } from "../../common";
import { buildOtpEmailTemplate, otpSender } from "../../helper";
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import nodemailer from "nodemailer";
import { authValidation, joiValidationOptions } from "../../validation";
dotenv.config()
const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
const getAuthCookieOptions = () => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    path: "/",
});

const forgotPasswordTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
    },
});

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

//================ signUp controller =======================
export const signUp = async (req , res)=>{

    const {error, value} = authValidation.signUpValidation.validate(req.body, joiValidationOptions)

    if (error) {
        return res.status(400).json({
        status: false,
        message: error.details[0].message,
        });
    }

    try {
        const {name , email , role , password, phone, address, city, state, pincode} = value
        const hashedPassword = bcrypt.hashSync(password , 12)

        const userExist = await authModel.Auth_Collection.findOne({email});
        if(userExist){
            return res.status(status_code.BAD_REQUEST).json({status : false , message : responseMessage.user_alreadyExist , userExist})
        }

        const result = await authModel.Auth_Collection.create({
            name,
            email,
            role,
            password: hashedPassword,
            phone: phone || "",
            address: address || "",
            city: city || "",
            state: state || "",
            pincode: pincode || "",
        });
        
        res.status(status_code.SUCCESS).json({status : true , message : responseMessage.signUp_successfull})
    } catch (error) {
        res.status(status_code.BAD_REQUEST).json({status : false , message : responseMessage.signUp_failed})
    }
}


    //================ signIn controller =======================
    export const signIn = async (req ,res)=>{
        const {error, value} = authValidation.signInValidation.validate(req.body, joiValidationOptions)

        if (error) {
            return res.status(400).json({
            status: false,
            message: error.details[0].message,
            });
        }


        try {
            const {email , password } = value
            const user = await authModel.Auth_Collection.findOne({email})

            if(!user){
                return res.status(status_code.BAD_REQUEST).json({status : false , message : responseMessage.userNotFound })
            }

            const isMatched = bcrypt.compareSync(password , user.password);
            if(!isMatched){
                return res.status(status_code.BAD_REQUEST).json({status : false , message : responseMessage.incorrectPassword })
            }

            const isOtpSent = await otpSender(email)
        
            res.status(status_code.SUCCESS).json({status : true , message : responseMessage.signIn_successful , isOtpSent})

        } catch (error) {
            res.status(status_code.INTERNAL_SERVER_ERROR).json({status : false , message : responseMessage.signIn_failed , error})
        }
    }

        /*================= Signout Controller ==============*/
        export const signout = async (req, res) => {
        try {

            res.clearCookie("Auth_Token", getAuthCookieOptions());

            return res.status(status_code.SUCCESS).json({
            status: true,
            message: responseMessage.signOut_SuccessFull
            });

        } catch (error) {
            return res.status(500).json({
            status: false,
            message: responseMessage.signOut_failed
            });
        }
        };



    /*============ OTP Verifing controller ===========*/
    export const verifyOTP = async (req ,res)=>{
        const { error, value } = authValidation.verifyOtpValidation.validate(req.body, joiValidationOptions);
        if (error) {
            return res.status(status_code.BAD_REQUEST).json({
                status: false,
                message: error.details[0].message,
            });
        }

        try {
                const {email , otp} = value;
                const record = await otpModel.OTP_Collection.findOne({email , otp, purpose: "signin"});

                if(!record){
                    return res.status(status_code.BAD_REQUEST).json({status : false , message : "OTP is incorrect !" });
                }

                if(record.expireAt < new Date(Date.now())){
                    return res.status(status_code.BAD_REQUEST).json({status : false , message : "OTP is expired !"});
                }

                await otpModel.OTP_Collection.deleteMany({email, purpose: "signin"} as any);

                const user = await authModel.Auth_Collection.findOne({email});
                const token = jwt.sign({user : {
                    _id : user._id,
                    name : user.name,
                    email : user.email,
                    role : user.role,
                    phone: user.phone || "",
                    address: user.address || "",
                    city: user.city || "",
                    state: user.state || "",
                    pincode: user.pincode || ""
                }} , process.env.SECRET_KEY , {expiresIn : "1d"});
                
                res.cookie("Auth_Token" , token , {
                    ...getAuthCookieOptions(),
                    maxAge :  1000 * 60 * 60 * 24,
                })
                
                res.json({status : true , message : responseMessage.otp_verifyAndSignin , user});
                
        } catch (error) {
            res.status(400).json({status : false , message : responseMessage.otp_invalid , error : error.message})
        }
    }

    /*============ Update Profile controller ===========*/
    export const updateProfile = async (req , res) => {
        const {error, value} = authValidation.updateProfileValidation.validate(req.body, joiValidationOptions)

        if (error) {
            return res.status(400).json({
            status: false,
            message: error.details[0].message,
            });
        }

        try {
            const userId = (req as any).user._id;
            const { name, email, phone, address, city, state, pincode } = value;
            
            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (email !== undefined) updateData.email = email;
            if (phone !== undefined) updateData.phone = phone;
            if (address !== undefined) updateData.address = address;
            if (city !== undefined) updateData.city = city;
            if (state !== undefined) updateData.state = state;
            if (pincode !== undefined) updateData.pincode = pincode;

            if (email && email !== (req as any).user.email) {
                const emailExists = await authModel.Auth_Collection.findOne({ email, _id: { $ne: userId } });
                if (emailExists) {
                    return res.status(status_code.BAD_REQUEST).json({
                        status: false,
                        message: "Email already in use by another account"
                    });
                }
            }

            const updatedUser = await authModel.Auth_Collection.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, runValidators: true }
            ).select("-password");

            if (!updatedUser) {
                return res.status(status_code.NOT_FOUND).json({
                    status: false,
                    message: "User not found"
                });
            }

            const newToken = jwt.sign({user : {
                _id : updatedUser._id,
                name : updatedUser.name,
                email : updatedUser.email,
                role : updatedUser.role,
                phone: updatedUser.phone || "",
                address: updatedUser.address || "",
                city: updatedUser.city || "",
                state: updatedUser.state || "",
                pincode: updatedUser.pincode || ""
            }} , process.env.SECRET_KEY , {expiresIn : "1d"});
            
            res.cookie("Auth_Token" , newToken , {
                ...getAuthCookieOptions(),
                maxAge :  1000 * 60 * 60 * 24,
            })

            res.status(status_code.SUCCESS).json({
                status: true,
                message: "Profile updated successfully",
                user: updatedUser
            });

        } catch (error) {
            res.status(status_code.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Failed to update profile",
                error: error.message
            });
        }
    }

    /*============ Forgot Password: Send OTP ===========*/
    export const sendForgotPasswordOtp = async (req, res) => {
        const { error, value } = authValidation.forgotPasswordSendOtpValidation.validate(req.body, joiValidationOptions);

        if (error) {
            return res.status(status_code.BAD_REQUEST).json({
                status: false,
                message: error.details[0].message,
            });
        }

        try {
            const { email } = value;
            const user = await authModel.Auth_Collection.findOne({ email });

            if (!user) {
                return res.status(status_code.NOT_FOUND).json({
                    status: false,
                    message: responseMessage.userNotFound,
                });
            }

            const otp = generateOtpCode();
            const otpHash = bcrypt.hashSync(otp, 10);
            const expireAt = new Date(Date.now() + 1000 * 60 * 3);

            await otpModel.OTP_Collection.deleteMany({ email, purpose: "reset" } as any);
            await otpModel.OTP_Collection.create({
                email,
                otp: otpHash,
                expireAt,
                purpose: "reset",
            } as any);

            const html = buildOtpEmailTemplate({
                otp,
                recipientName: user.name,
                purposeText: "password reset",
                supportEmail: process.env.EMAIL || "support@medicobilling.com",
                brandName: "Medico Billing",
                validMinutes: 3,
                logoUrl: process.env.APP_LOGO_URL,
            });

            await forgotPasswordTransporter.sendMail({
                from: `Security Team <${process.env.EMAIL}>`,
                to: email,
                subject: "Password Reset OTP",
                html,
            });

            return res.status(status_code.SUCCESS).json({
                status: true,
                message: responseMessage.forgotPassword_otp_sent,
            });
        } catch (error) {
            return res.status(status_code.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: responseMessage.forgotPassword_otp_verify_failed,
                error: error.message,
            });
        }
    };

    /*============ Forgot Password: Verify OTP ===========*/
    export const verifyForgotPasswordOtp = async (req, res) => {
        const { error, value } = authValidation.forgotPasswordVerifyOtpValidation.validate(req.body, joiValidationOptions);

        if (error) {
            return res.status(status_code.BAD_REQUEST).json({
                status: false,
                message: error.details[0].message,
            });
        }

        try {
            const { email, otp } = value;
            const record = await otpModel.OTP_Collection.findOne({ email, purpose: "reset" } as any).sort({ createdAt: -1 });

            if (!record) {
                return res.status(status_code.BAD_REQUEST).json({
                    status: false,
                    message: responseMessage.forgotPassword_otp_invalid,
                });
            }

            if (record.expireAt < new Date()) {
                await otpModel.OTP_Collection.deleteMany({ email, purpose: "reset" } as any);
                return res.status(status_code.BAD_REQUEST).json({
                    status: false,
                    message: responseMessage.forgotPassword_otp_expired,
                });
            }

            const isMatched = bcrypt.compareSync(otp, record.otp);
            if (!isMatched) {
                return res.status(status_code.BAD_REQUEST).json({
                    status: false,
                    message: responseMessage.forgotPassword_otp_invalid,
                });
            }

            return res.status(status_code.SUCCESS).json({
                status: true,
                message: responseMessage.forgotPassword_otp_verified,
            });
        } catch (error) {
            return res.status(status_code.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: responseMessage.forgotPassword_otp_send_failed,
                error: error.message,
            });
        }
    };

    /*============ Forgot Password: Reset Password ===========*/
    export const resetForgotPassword = async (req, res) => {
        const { error, value } = authValidation.forgotPasswordResetValidation.validate(req.body, joiValidationOptions);

        if (error) {
            return res.status(status_code.BAD_REQUEST).json({
                status: false,
                message: error.details[0].message,
            });
        }

        try {
            const { email, otp, newPassword, confirmPassword } = value;

            if (newPassword !== confirmPassword) {
                return res.status(status_code.BAD_REQUEST).json({
                    status: false,
                    message: responseMessage.password_confirm_mismatch,
                });
            }

            const user = await authModel.Auth_Collection.findOne({ email });
            if (!user) {
                return res.status(status_code.NOT_FOUND).json({
                    status: false,
                    message: responseMessage.userNotFound,
                });
            }

            const record = await otpModel.OTP_Collection.findOne({ email, purpose: "reset" } as any).sort({ createdAt: -1 });

            if (!record) {
                return res.status(status_code.BAD_REQUEST).json({
                    status: false,
                    message: responseMessage.forgotPassword_otp_invalid,
                });
            }

            if (record.expireAt < new Date()) {
                await otpModel.OTP_Collection.deleteMany({ email, purpose: "reset" } as any);
                return res.status(status_code.BAD_REQUEST).json({
                    status: false,
                    message: responseMessage.forgotPassword_otp_expired,
                });
            }

            const isOtpMatched = bcrypt.compareSync(otp, record.otp);
            if (!isOtpMatched) {
                return res.status(status_code.BAD_REQUEST).json({
                    status: false,
                    message: responseMessage.forgotPassword_otp_invalid,
                });
            }

            user.password = bcrypt.hashSync(newPassword, 12);
            await user.save();
            await otpModel.OTP_Collection.deleteMany({ email, purpose: "reset" } as any);

            return res.status(status_code.SUCCESS).json({
                status: true,
                message: responseMessage.forgotPassword_reset_success,
            });
        } catch (error) {
            return res.status(status_code.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: responseMessage.forgotPassword_reset_failed,
                error: error.message,
            });
        }
    };

    /*============ Change Password controller ===========*/
    export const changePassword = async (req, res) => {
        const { error, value } = authValidation.changePasswordValidation.validate(req.body, joiValidationOptions);

        if (error) {
            return res.status(status_code.BAD_REQUEST).json({
                status: false,
                message: error.details[0].message,
            });
        }

        try {
            const userId = (req as any).user?._id;
            const { oldPassword, newPassword, confirmPassword } = value;

            if (newPassword !== confirmPassword) {
                return res.status(status_code.BAD_REQUEST).json({
                    status: false,
                    message: responseMessage.password_confirm_mismatch,
                });
            }

            const user = await authModel.Auth_Collection.findById(userId);

            if (!user) {
                return res.status(status_code.NOT_FOUND).json({
                    status: false,
                    message: responseMessage.userNotFound,
                });
            }

            const isOldPasswordMatched = bcrypt.compareSync(oldPassword, user.password);
            if (!isOldPasswordMatched) {
                return res.status(status_code.BAD_REQUEST).json({
                    status: false,
                    message: responseMessage.oldPassword_incorrect,
                });
            }

            const hashedPassword = bcrypt.hashSync(newPassword, 12);
            user.password = hashedPassword;
            await user.save();

            return res.status(status_code.SUCCESS).json({
                status: true,
                message: responseMessage.changePassword_success,
            });
        } catch (error) {
            return res.status(status_code.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: responseMessage.changePassword_failed,
                error: error.message,
            });
        }
    }
