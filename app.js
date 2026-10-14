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

// ==================== NHIỆM VỤ: ĐẶT HÀNG ====================
// Thông tin dịch vụ lấy từ servicesData của phần CHI TIẾT SẢN PHẨM (định dạng chuẩn:
// id, title, partner, price "25.000.000 VNĐ", mainImage, colors, bookedDates).
// Trả về null nếu không có dịch vụ hoặc dịch vụ chưa có giá hợp lệ.
function findService(id) {
  const list = typeof servicesData !== 'undefined' && Array.isArray(servicesData) ? servicesData : [];
  const item = list.find(s => String(s.id) === String(id));
  if (!item) {
    return null;
  }

  // "25.000.000 VNĐ" -> 25000000
  const price = typeof item.price === 'number'
    ? item.price
    : Number(String(item.price || '').replace(/\D/g, ''));
  if (!Number.isSafeInteger(price) || price <= 0) {
    return null;
  }

  return {
    id: String(item.id),
    title: String(item.title || ''),
    partner: String(item.partner || ''),
    price: price,
    image: item.mainImage || (Array.isArray(item.thumbs) ? item.thumbs[0] : '') || '',
    colors: Array.isArray(item.colors) ? item.colors.map(String) : [],
    bookedDates: Array.isArray(item.bookedDates) ? item.bookedDates.map(String) : []
  };
}

const orderEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const orderPhonePattern = /^0\d{9}$/;
const bankAccountPattern = /^\d{6,20}$/;

function formatPrice(value) {
  return Number(value).toLocaleString('vi-VN') + ' VNĐ';
}

// Ngày dạng YYYY-MM-DD theo giờ máy chủ, offset = số ngày cộng thêm
function dateString(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// Các ngày đã kín lịch của 1 dịch vụ = ngày có sẵn trong dữ liệu + ngày đã có đơn
async function getBookedDates(service) {
  const [rows] = await pool.query(
    "SELECT DATE_FORMAT(event_date, '%Y-%m-%d') AS d FROM orders WHERE service_id = ?",
    [service.id]
  );
  return [...new Set([...service.bookedDates, ...rows.map(r => r.d)])];
}

async function renderOrderPage(res, service, form, error) {
  const quantity = parseInt(form.quantity, 10) || 1;
  res.render('order.html', {
    service: service,
    servicePrice: formatPrice(service.price),
    totalPrice: formatPrice(service.price * quantity),
    bookedDates: await getBookedDates(service),
    minDate: dateString(1),
    form: form,
    error: error
  });
}

// Trang form đặt hàng. Có thể truyền sẵn ?date=YYYY-MM-DD&quantity=1&color=... từ trang chi tiết
app.get('/order/:serviceId', isAuthenticated, async (req, res) => {
  const service = findService(req.params.serviceId);
  if (!service) {
    return res.status(404).send('Không tìm thấy dịch vụ.');
  }

  try {
    const [users] = await pool.query(
      'SELECT username, email FROM users WHERE id = ?',
      [req.session.user.id]
    );
    const user = users[0] || {};

    await renderOrderPage(res, service, {
      customerName: user.username || '',
      customerEmail: user.email || '',
      eventDate: req.query.date || '',
      quantity: req.query.quantity || 1,
      color: req.query.color || service.colors[0] || ''
    }, null);
  } catch (error) {
    console.error('Lỗi mở trang đặt hàng:', error);
    res.status(500).send('Lỗi hệ thống server.');
  }
});

// Xử lý đặt hàng (POST)
app.post('/order/:serviceId', isAuthenticated, async (req, res) => {
  const service = findService(req.params.serviceId);
  if (!service) {
    return res.status(404).send('Không tìm thấy dịch vụ.');
  }

  const form = {
    customerName: String(req.body.customerName || '').trim(),
    customerPhone: String(req.body.customerPhone || '').replace(/[\s.]/g, ''),
    customerEmail: String(req.body.customerEmail || '').trim().toLowerCase(),
    eventDate: String(req.body.eventDate || ''),
    eventAddress: String(req.body.eventAddress || '').trim(),
    quantity: String(req.body.quantity || ''),
    color: String(req.body.color || ''),
    bankName: String(req.body.bankName || '').trim(),
    bankAccount: String(req.body.bankAccount || '').replace(/\s/g, ''),
    bankHolder: String(req.body.bankHolder || '').trim().toUpperCase(),
    note: String(req.body.note || '').trim()
  };
  const quantity = Number(form.quantity);

  try {
    let error = null;
    if (!form.customerName || form.customerName.length > 100) {
      error = 'Vui lòng nhập họ tên hợp lệ.';
    } else if (!orderPhonePattern.test(form.customerPhone)) {
      error = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.';
    } else if (!orderEmailPattern.test(form.customerEmail) || form.customerEmail.length > 100) {
      error = 'Email không hợp lệ.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.eventDate) || form.eventDate < dateString(1)) {
      error = 'Ngày tổ chức phải từ ngày mai trở đi.';
    } else if (!form.eventAddress || form.eventAddress.length > 255) {
      error = 'Vui lòng nhập địa chỉ tổ chức tiệc.';
    } else if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      error = 'Số lượng phải từ 1 đến 100.';
    } else if (service.colors.length > 0 && !service.colors.includes(form.color)) {
      error = 'Vui lòng chọn tông màu.';
    } else if (!form.bankName || form.bankName.length > 100 ||
               !bankAccountPattern.test(form.bankAccount) ||
               !form.bankHolder || form.bankHolder.length > 100) {
      error = 'Thông tin ngân hàng không hợp lệ.';
    } else if (form.note.length > 1000) {
      error = 'Ghi chú tối đa 1000 ký tự.';
    } else if ((await getBookedDates(service)).includes(form.eventDate)) {
      error = 'Ngày này gói dịch vụ đã kín lịch. Vui lòng chọn ngày khác.';
    }

    if (error) {
      return await renderOrderPage(res.status(400), service, form, error);
    }

    const [result] = await pool.query(
      `INSERT INTO orders
         (user_id, service_id, service_name, partner_name, unit_price, quantity, total_price,
          color, event_date, event_address, customer_name, customer_phone, customer_email,
          bank_name, bank_account, bank_holder, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.user.id, service.id, service.title, service.partner, service.price, quantity,
       service.price * quantity, form.color || null, form.eventDate, form.eventAddress,
       form.customerName, form.customerPhone, form.customerEmail,
       form.bankName, form.bankAccount, form.bankHolder, form.note || null]
    );

    res.redirect(`/order/success/${result.insertId}`);
  } catch (error) {
    console.error('Lỗi đặt hàng:', error);
    res.status(500).send('Lỗi hệ thống server.');
  }
});

// Trang xác nhận đặt hàng thành công (chỉ chủ đơn mới xem được)
app.get('/order/success/:orderId', isAuthenticated, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT *, DATE_FORMAT(event_date, '%d/%m/%Y') AS event_date_text
       FROM orders WHERE id = ? AND user_id = ?`,
      [req.params.orderId, req.session.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).send('Không tìm thấy đơn hàng.');
    }

    const order = rows[0];
    res.render('order-success.html', {
      order: order,
      orderCode: `ORD-${order.id}`,
      unitPrice: formatPrice(order.unit_price),
      totalPrice: formatPrice(order.total_price)
    });
  } catch (error) {
    console.error('Lỗi xem đơn hàng:', error);
    res.status(500).send('Lỗi hệ thống server.');
  }
});
// ====================================================================

app.listen(PORT, () => {
  console.log(`Server đang chạy thành công tại: http://localhost:${PORT}`);
});
