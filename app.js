const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const session = require('express-session')
const mysql = require('mysql2/promise');

// Middleware đọc dữ liệu từ Form POST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cấu hình Express Session
app.use(session({
  secret: 'chuoi_bi_mat_rat_an_toan',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // Phiên tồn tại trong 1 ngày
}));

// Phục vụ file tĩnh từ các thư mục css, img, js ở thư mục gốc
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Nếu có lưu assets trong thư mục public (tùy chọn)
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình Nunjucks Template Engine cho thư mục views/
nunjucks.configure('views', {
  autoescape: true,
  express: app,
  noCache: true
});
app.set('view engine', 'html');

//Kết nối SQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'hello', // Điền mật khẩu MySQL của bạn
  database: 'node_auth_demo', // Tên database cần kết nối
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testConnection() {
  try {
    await pool.getConnection();
    console.log('Kết nối MySQL thành công!');
  } catch (error) {
    console.error('Lỗi kết nối hoặc truy vấn:', error);
  }
}

testConnection().then();

// Middleware kiểm tra xem người dùng đã đăng nhập chưa
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/');
}

// ---------------- ROUTES ----------------
app.get('/', (req, res) => {
  if (!req.session) {
    return res.redirect('/login');
  }
  res.render('index.html');
});

app.get('/about', (req, res) => {
  res.render('aboutus.html');
});

app.get('/services', (req, res) => {
  res.render('eventservices.html');
});

app.get('/contact', (req, res) => {
  res.render('contact.html');
});

app.post('/contact', (req, res) => {
  console.log('Thông tin liên hệ:', req.body);
  res.redirect('/contact');
});

app.get('/register', (req, res) => {
  res.render('register.html');
});

app.post('/register', (req, res) => {
  console.log('Thông tin đăng ký:', req.body);
  res.redirect('/login');
});

// API lấy thông tin user đang đăng nhập (để hiển thị lên dashboard)
app.get('/api/current-user', isAuthenticated, (req, res) => {
  res.json({ username: req.session.user.username });
});

app.get('/login', (req, res) => {
  res.render('login.html');
});

//Xử lý đăng nhập (POST)
app.post('/login', async (req, res) => {
  if (req === undefined) { req = {}; }
  const { email, password } = req.body;

  try {
    // Truy vấn kiểm tra user trong database
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND password = ?',
      [email, password]
    );

    console.log(rows);
    if (rows.length > 0) {
      // Đăng nhập thành công, lưu thông tin vào session
      req.session.user = { id: rows[0].id, username: rows[0].username };
      return res.redirect('/');
    } else {
      // Sai tài khoản hoặc mật khẩu
      return res.send(`<script>alert('Sai email hoặc mật khẩu.');</script>`);
    }
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).send('Lỗi hệ thống server.');
  }
});

// Xử lý Đăng xuất
app.get('/logout', (req, res) => {
  if (req === undefined) { req = {}; }
  req.session.destroy((err) => {
    if (err) {
      return console.log('Lỗi khi hủy session:', err);
    }
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server đang chạy thành công tại: http://localhost:${PORT}`);
});
