const nodemailer = require("nodemailer");
const env = require("dotenv");

// Load environment variables
env.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
//  Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("NodeMailer configuration error:", error);
  } else {
    console.log("NodeMailer is ready to send emails");
  }
});
// Send registration email to users or providers
const sendRegistrationEmail = async (to, name, role) => {
  try {
    const mailOptions = {
      from: `"BookMyMandap Team" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Welcome to BookMyMandap!",
      html: `
        <h2>Thank You for Registering!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for registering as a ${role} on BookMyMandap. ${
        role === "provider"
          ? "Your account is awaiting admin approval. We'll notify you once approved."
          : "You can now explore and book mandaps on our platform."
      }</p>
        <p>Visit our website: <a href="https://www.bookmymandap.com">https://www.bookmymandap.com</a></p>
        <p>Best regards,<br>BookMyMandap Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Registration email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending registration email to ${to}:`, error);
    throw new Error("Failed to send registration email");
  }
};

// Send approval email to providers upon admin approval
const sendApprovalEmail = async (to, name) => {
  try {
    const mailOptions = {
      from: `"BookMyMandap Team" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your BookMyMandap Account Has Been Approved!",
      html: `
        <h2>Account Approved!</h2>
        <p>Dear ${name},</p>
        <p>Congratulations! Your provider account on BookMyMandap has been approved. You can now log in and start managing your mandaps.</p>
        <p>Log in here: <a href="https://www.bookmymandap.com/login">https://www.bookmymandap.com/login</a></p>
        <p>Best regards,<br>BookMyMandap Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Approval email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending approval email to ${to}:`, error);
    throw new Error("Failed to send approval email");
  }
};

const sendRejectionEmail = async (to, name) => {
  try {
    const mailOptions = {
      from: `"BookMyMandap Team" <${process.env.EMAIL_USER}>`,
      to,
      subject: "BookMyMandap Account Rejection Notice",
      html: `
        <h2>Account Rejection Notice</h2>
        <p>Dear ${name},</p>
        <p>We regret to inform you that your provider account on BookMyMandap has not been approved at this time.</p>
        <p>If you have any questions or need further clarification, please contact our support team at <a href="mailto:support@bookmymandap.com">support@bookmymandap.com</a>.</p>
        <p>Best regards,<br>BookMyMandap Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Rejection email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending rejection email to ${to}:`, error);
    throw new Error("Failed to send rejection email");
  }
};

module.exports = {
  sendRegistrationEmail,
  sendApprovalEmail,
  sendRejectionEmail,
};
