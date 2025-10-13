import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import { sendWelcomeEmail, sendResetEmail } from "../utils/email.js";
import {
  findUserByEmail,
  insertUser,
  updateResetToken,
  updatePassword,
} from "../models/user.js";

dotenv.config();

export const signup = async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await insertUser(first_name, last_name, email, hashedPassword);

    await sendWelcomeEmail(email, first_name);

    res.status(201).json({ message: "User registered and welcome email sent!" });
  } catch (error) {
    res.status(500).json({ error: "Signup failed", details: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

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
  const { token, newPassword } = req.body;

  try {
    const result = await findUserByEmail(req.body.email);
    if (!result || result.reset_token !== token)
      return res.status(400).json({ error: "Invalid or expired token" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updatePassword(req.body.email, hashedPassword);

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ error: "Reset failed", details: error.message });
  }
};
