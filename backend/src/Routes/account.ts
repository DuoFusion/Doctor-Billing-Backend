import express from "express";
import { authController } from "../controllers";
import { userModel } from "../database";

const router = express.Router();

const resolveMedicalStoreId = (user: any): string => {
  const directStoreId = String(user?.medicalStoreId || "").trim();
  if (directStoreId) return directStoreId;

  if (Array.isArray(user?.medicalStoreIds)) {
    return String(user.medicalStoreIds[0] || "").trim();
  }

  return "";
};

router.get("/me", async (req, res) => {
  const tokenUser = (req as any).user;
  if (!tokenUser?._id) {
    return res.status(401).json({
      status: false,
      message: "Unauthorized - No token provided",
    });
  }

  try {
    const dbUser = await userModel.findById(tokenUser._id).select("-password");
    if (!dbUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const userObj: any = typeof dbUser.toObject === "function" ? dbUser.toObject() : dbUser;
    const medicalStoreId = resolveMedicalStoreId(userObj);

    delete userObj.medicalStoreIds;

    return res.status(200).json({
      status: true,
      user: {
        ...userObj,
        medicalStoreId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[GET /account/me] Failed to fetch user: ${message}`);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
});

router.put("/profile/update", authController.updateProfile);
router.put("/password/change", (authController as any).changePassword);

export const accountRoute =  router;
