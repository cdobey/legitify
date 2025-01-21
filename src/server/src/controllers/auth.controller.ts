import { RequestHandler } from "express";
import User from "../database/models/user.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const login: RequestHandler = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Create JWT
    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username, // Include the username in the payload
        role: user.role,
        orgName: user.orgName,
      },
      process.env.JWT_SECRET || "fallbacksecret",
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
