const express = require('express');
const nunjucks = require('nunjucks');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware đọc dữ liệu từ Form POST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Phục vụ tĩnh từ thư mục 'public' (css, js, images)
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình Nunjucks Template Engine (thư mục views)
nunjucks.configure('views', {
  autoescape: true,
  express: app,
  noCache: true // Đặt false khi deploy production
});
app.set('view engine', 'html');

// ---------------- ROUTES ----------------
app.get('/', (req, res) => {
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
  const { name, phone, email, message } = req.body;
  console.log('Thông tin liên hệ:', { name, phone, email, message });
  res.redirect('/contact');
});

app.get('/register', (req, res) => {
  res.render('register.html');
});

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  console.log('Đăng ký mới:', { name, email });
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('loggin.html'); // Tạo thêm loggin.html nếu cần
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
