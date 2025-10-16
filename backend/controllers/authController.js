import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import { sendWelcomeEmail, sendResetEmail, sendVerificationEmail } from "../utils/email.js";
import {
  findUserByEmail,
  insertUser,
  updateResetToken,
  updatePassword,
  findUserByVerificationToken,
  verifyUser,
} from "../models/user.js";

dotenv.config();

//  validation helpers
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isStrongPassword = (password) => password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);

export const signup = async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  try {
    //  Validation 
    if (!first_name || !last_name || !email || !password)
      return res.status(400).json({ error: "All required fields must be filled." });
    if (!isValidEmail(email))
      return res.status(400).json({ error: "Invalid email format." });
    if (!isStrongPassword(password))
      return res.status(400).json({ error: "Password must be at least 8 chars, include one uppercase letter and one number." });

    const existingUser = await findUserByEmail(email);
    if (existingUser)
      return res.status(400).json({ error: "Email already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verification_token = crypto.randomBytes(32).toString("hex");

    // verification token
    await insertUser(first_name, last_name, email, hashedPassword, verification_token);

    //  verification email
    await sendVerificationEmail(email, first_name, verification_token);

    res.status(201).json({ message: "User registered! Please verify your email before logging in." });
  } catch (error) {
    res.status(500).json({ error: "Signup failed", details: error.message });
  }
};

//  Account Verification
export const verifyAccount = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await findUserByVerificationToken(token);
    if (!user) return res.status(400).json({ error: "Invalid or expired verification token." });

    await verifyUser(token);
    res.json({ message: "Account verified successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Verification failed", details: error.message });
  }
};




export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    // 🔹 Check if account is verified
    if (!user.is_verified) {
      return res.status(403).json({ error: "Please verify your email before logging in." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ error: "Login failed", details: error.message });
  }
};


export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    await updateResetToken(email, token);
    await sendResetEmail(email, token);

    res.json({ message: "Reset email sent" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send reset email", details: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: "User not found" });

    // Check token validity and expiry
    if (user.reset_token !== token)
      return res.status(400).json({ error: "Invalid token" });

    if (new Date() > new Date(user.reset_token_expires))
      return res.status(400).json({ error: "Reset token expired" });

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updatePassword(email, hashedPassword);

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ error: "Reset failed", details: error.message });
  }
};
