
const nunjucks = require('nunjucks');
const path = require('path');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware đọc dữ liệu từ Form POST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server đang chạy thành công tại: http://localhost:${PORT}`);
});
