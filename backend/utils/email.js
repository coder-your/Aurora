import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});




const auroraStyles = `
  font-family: 'Poppins', sans-serif;
  background-color: #1c1d4f;
  color: #fff;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
`;

const buttonStyle = `
  background-color: #fff;
  color: #1c1d4f;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 25px;
  display: inline-block;
  margin-top: 20px;
  font-weight: 500;
`;

// --- Send Aurora ✦ Welcome Email ---
export const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: `"Aurora ✦ Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to Aurora ✦ Where Stories Paint the Sky",
    html: `
    <div style="${auroraStyles}">
      <h1 style="font-size: 32px; margin-bottom: 10px;">Aurora ✦</h1>
      <p style="font-style: italic; color: #e3b8ff;">"where stories paint the sky"</p>
      <hr style="border: none; border-top: 1px solid #5e5aa1; margin: 25px 0; width: 70%;" />
      <p style="font-size: 18px;">Hi <b>${name}</b>,</p>
      <p>We’re thrilled to have you join <b>Aurora</b> — a world where readers and writers create magic together.</p>
      <p>Start exploring stories, share your imagination, and let your words light up the sky 🌌</p>
      <a href="http://localhost:3000" style="${buttonStyle}">Visit Aurora</a>
      <br/><br/>
      <p style="color: #b8b8d9; font-size: 14px;">— The Aurora Team ✦</p>
    </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// --- Send Aurora ✦ Password Reset Email ---
export const sendResetEmail = async (email, token) => {
  const resetLink = `http://localhost:3000/reset-password?token=${token}`;
  const mailOptions = {
    from: `"Aurora ✦ Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Aurora ✦ Reset Your Password",
    html: `
    <div style="${auroraStyles}">
      <h2 style="font-size: 26px;">Reset Your Password ✦</h2>
      <p style="color:#e3b8ff;">"Aurora ✦ where stories paint the sky"</p>
      <hr style="border: none; border-top: 1px solid #5e5aa1; margin: 25px 0; width: 70%;" />
      <p>We received a request to reset your Aurora account password.</p>
      <a href="${resetLink}" style="${buttonStyle}">Reset Password</a>
      <p style="margin-top: 25px; color: #b8b8d9;">If you didn’t request this, just ignore this email.</p>
      <br/>
      <p style="color: #b8b8d9; font-size: 14px;">— The Aurora Team ✦</p>
    </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
export const sendVerificationEmail = async (email, name, token) => {
  const verifyLink = `http://localhost:3000/verify/${token}`;

  const mailOptions = {
    from: `"Aurora ✦ Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your Aurora ✦ account",
    html: `
      <div style="${auroraStyles}">
        <h2 style="font-size: 26px;">Welcome to Aurora ✦</h2>
        <p style="color:#e3b8ff;">"where stories paint the sky"</p>
        <hr style="border: none; border-top: 1px solid #5e5aa1; margin: 25px 0; width: 70%;" />
        <p>Hi <b>${name}</b>,</p>
        <p>Click below to verify your Aurora account and begin exploring your story!</p>
        <a href="${verifyLink}" style="${buttonStyle}">Verify Account</a>
        <p style="margin-top: 25px; color: #b8b8d9;">If you didn’t sign up, ignore this email.</p>
        <br/>
        <p style="color: #b8b8d9; font-size: 14px;">— The Aurora Team ✦</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const send2FAEmail = async (email, name, otp) => {
  const mailOptions = {
    from: `"Aurora ✦ Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Aurora ✦ Your Login OTP",
    html: `
      <div style="${auroraStyles}">
        <h2 style="font-size: 26px;">Login Verification ✦</h2>
        <p style="color:#e3b8ff;">"Aurora ✦ where stories paint the sky"</p>
        <hr style="border: none; border-top: 1px solid #5e5aa1; margin: 25px 0; width: 70%;" />
        <p>Hi <b>${name}</b>,</p>
        <p>Use the following OTP to complete your login:</p>
        <h1 style="font-size: 36px; margin: 20px 0;">${otp}</h1>
        <p>This code will expire in 5 minutes.</p>
        <p style="margin-top: 25px; color: #b8b8d9;">If you didn’t try to login, please ignore this email.</p>
        <br/>
        <p style="color: #b8b8d9; font-size: 14px;">— The Aurora Team ✦</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};


// --- Send Aurora ✦ Goodbye Email ---
export const sendGoodbyeEmail = async (email, name) => {
  const mailOptions = {
    from: `"Aurora ✦ Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Aurora ✦ You’ll Be Missed Under Our Sky",
    html: `
    <div style="${auroraStyles}">
      <h1 style="font-size: 32px; margin-bottom: 10px;">Aurora ✦</h1>
      <p style="font-style: italic; color: #e3b8ff;">"where stories paint the sky"</p>
      <hr style="border: none; border-top: 1px solid #5e5aa1; margin: 25px 0; width: 70%;" />
      <p style="font-size: 18px;">Dear <b>${name}</b>,</p>
      <p>We’re genuinely sorry to see you go. Your stories, your presence — they lit up our sky ✦</p>
      <p>Every reader and writer leaves a mark, and yours will always shimmer here.  
      Whether this is goodbye or just see-you-later, you’ll always have a home at Aurora.</p>
      <a href="http://localhost:3000" style="${buttonStyle}">Return Anytime</a>
      <br/><br/>
      <p style="color: #b8b8d9; font-size: 14px;">— With warmth, The Aurora Team ✦</p>
    </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

