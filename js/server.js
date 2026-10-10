
require("dotenv").config();

const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));


const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Bạn thao tác quá nhiều. Vui lòng thử lại sau."
  }
});

app.use("/api", apiLimiter);



const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "auth_demo",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});



const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}


function hashToken(token) {
  return crypto.createHash("sha256")
    .update(token)
    .digest("hex");
}

async function saveToken(userId, token, purpose) {
  const tokenHash = hashToken(token);

  await pool.execute(
    `INSERT INTO auth_tokens
         (user_id, token_hash, purpose, expires_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
    [userId, tokenHash, purpose]
  );
}

async function sendEmail(to, subject, text) {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    throw new Error("Bạn chưa cấu hình SMTP trong file .env");
  }

  await mailer.sendMail({
    from: `"EventDecor" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text
  });
}



app.post("/api/register", async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  if (
    typeof fullName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return res.status(400).json({
      message: "Vui lòng nhập đầy đủ thông tin hợp lệ."
    });
  }

  const name = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (
    !name ||
    name.length > 100 ||
    !emailPattern.test(normalizedEmail) ||
    normalizedEmail.length > 255
  ) {
    return res.status(400).json({
      message: "Họ tên hoặc email không hợp lệ."
    });
  }

  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({
      message: "Mật khẩu phải có từ 8 đến 72 ký tự."
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      message: "Mật khẩu xác nhận không khớp."
    });
  }

  let userId;

  try {
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Email này đã được đăng ký."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users
             (full_name, email, password_hash)
             VALUES (?, ?, ?)`,
      [name, normalizedEmail, passwordHash]
    );

    userId = result.insertId;

    const token = createToken();
    await saveToken(userId, token, "verify");

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const verifyUrl =
      `${baseUrl}/api/verify?token=${token}`;

    await sendEmail(
      normalizedEmail,
      "Xác thực tài khoản EventDecor",
      `Xin chào ${name}!

Vui lòng mở liên kết sau để xác thực email:
${verifyUrl}

Liên kết có hiệu lực trong 30 phút.
Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email.`
    );

    return res.status(201).json({
      message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản."
    });

  } catch (error) {
    console.error("Lỗi đăng ký:", error);

    // Nếu gửi email thất bại, xóa tài khoản chưa xác thực
    if (userId) {
      try {
        await pool.execute(
          "DELETE FROM users WHERE id = ? AND email_verified = FALSE",
          [userId]
        );
      } catch (cleanupError) {
        console.error("Lỗi dọn tài khoản:", cleanupError);
      }
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Email này đã được đăng ký."
      });
    }

    return res.status(500).json({
      message: "Không thể đăng ký lúc này. Vui lòng thử lại."
    });
  }
});

app.get("/api/verify", async (req, res) => {
  const token = req.query.token;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return res.status(400).send("Liên kết xác thực không hợp lệ.");
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [tokens] = await connection.execute(
      `SELECT id, user_id
             FROM auth_tokens
             WHERE token_hash = ?
               AND purpose = 'verify'
               AND used_at IS NULL
               AND expires_at > NOW()
             FOR UPDATE`,
      [hashToken(token)]
    );

    if (tokens.length === 0) {
      await connection.rollback();
      return res.status(400).send(
        "Liên kết đã hết hạn hoặc đã được sử dụng."
      );
    }

    await connection.execute(
      "UPDATE users SET email_verified = TRUE WHERE id = ?",
      [tokens[0].user_id]
    );

    await connection.execute(
      "UPDATE auth_tokens SET used_at = NOW() WHERE id = ?",
      [tokens[0].id]
    );

    await connection.commit();

    return res.send(
      "Xác thực email thành công! Bạn có thể quay lại website."
    );

  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Lỗi xác thực email:", error);
    return res.status(500).send("Có lỗi xảy ra khi xác thực email.");

  } finally {
    if (connection) connection.release();
  }
});



app.post("/api/forgot-password", async (req, res) => {
  const genericMessage =
    "Nếu email tồn tại và đã xác thực, hướng dẫn đặt lại mật khẩu sẽ được gửi.";

  const email = req.body?.email;

  if (typeof email !== "string" || !emailPattern.test(email.trim())) {
    return res.status(200).json({ message: genericMessage });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const [users] = await pool.execute(
      `SELECT id, email
             FROM users
             WHERE email = ? AND email_verified = TRUE`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.json({ message: genericMessage });
    }

    const user = users[0];

    // Vô hiệu hóa các token đặt lại mật khẩu cũ
    await pool.execute(
      `UPDATE auth_tokens
             SET used_at = NOW()
             WHERE user_id = ?
               AND purpose = 'reset'
               AND used_at IS NULL`,
      [user.id]
    );

    const token = createToken();
    await saveToken(user.id, token, "reset");

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const resetUrl =
      `${baseUrl}/reset-password.html?token=${token}`;

    await sendEmail(
      user.email,
      "Đặt lại mật khẩu EventDecor",
      `Bạn đã yêu cầu đặt lại mật khẩu.

Mở liên kết sau để tạo mật khẩu mới:
${resetUrl}

Liên kết có hiệu lực trong 30 phút.
Nếu bạn không yêu cầu, hãy bỏ qua email này.`
    );

    return res.json({ message: genericMessage });

  } catch (error) {
    console.error("Lỗi quên mật khẩu:", error);
    return res.status(500).json({
      message: "Không thể xử lý yêu cầu lúc này. Vui lòng thử lại."
    });
  }
});



app.post("/api/reset-password", async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token) ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return res.status(400).json({
      message: "Thông tin không hợp lệ."
    });
  }

  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({
      message: "Mật khẩu phải có từ 8 đến 72 ký tự."
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      message: "Mật khẩu xác nhận không khớp."
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [tokens] = await connection.execute(
      `SELECT id, user_id
             FROM auth_tokens
             WHERE token_hash = ?
               AND purpose = 'reset'
               AND used_at IS NULL
               AND expires_at > NOW()
             FOR UPDATE`,
      [hashToken(token)]
    );

    if (tokens.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "Liên kết đặt lại mật khẩu hết hạn hoặc không hợp lệ."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await connection.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, tokens[0].user_id]
    );

    await connection.execute(
      `UPDATE auth_tokens
             SET used_at = NOW()
             WHERE user_id = ?
               AND purpose = 'reset'
               AND used_at IS NULL`,
      [tokens[0].user_id]
    );

    await connection.commit();

    return res.json({
      message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới."
    });

  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Lỗi đặt lại mật khẩu:", error);
    return res.status(500).json({
      message: "Không thể đặt lại mật khẩu lúc này."
    });

  } finally {
    if (connection) connection.release();
  }
});


app.use((req, res) => {
  res.status(404).send("Không tìm thấy trang hoặc API.");
});



async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("Kết nối MySQL thành công!");

    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.warn(
        "Chưa cấu hình SMTP đầy đủ. Chức năng gửi email chưa hoạt động."
      );
    }

    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
      console.log(`Trang đăng ký: http://localhost:${PORT}/register.html`);
    });

  } catch (error) {
    console.error("Không thể khởi động server:", error.message);
    process.exit(1);
  }
}

startServer();
