import { Request } from "express";

/**
 * Authenticated user type from JWT token
 */
export interface AuthenticatedUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Extended Express Request with authenticated user
 */
export interface CustomRequest extends Request {
  user?: AuthenticatedUser;
}
