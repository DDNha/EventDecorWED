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

// //Kết nối SQL
// const pool = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: 'hello', // Điền mật khẩu MySQL của bạn
//   database: 'node_auth_demo', // Tên database cần kết nối
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// async function testConnection() {
//   try {
//     await pool.getConnection();
//     console.log('Kết nối MySQL thành công!');
//   } catch (error) {
//     console.error('Lỗi kết nối hoặc truy vấn:', error);
//   }
// }

// // testConnection().then(); // Tạm tắt nếu máy chưa có MySQL

// Middleware kiểm tra xem người dùng đã đăng nhập chưa
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  // Giả lập session user nếu chưa có CSDL để test giỏ hàng
  req.session.user = { id: 1, username: 'KhachHangDemo' };
  return next();
}

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
app.get('/partner', (req, res) => {
  res.render('partner.html');
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

// ======================================================
// ===        QUẢN LÝ GIỎ HÀNG - Thiện làm             ===
// ======================================================

// Dữ liệu sản phẩm mẫu đầy đủ để test (Khớp 100% các thẻ trên trang chủ)
const mockProducts = [
  { 
    id: 1, 
    name: 'Gói trang trí sinh nhật cao cấp', 
    price: 1500000, 
    img: '/img/birthday.png',
    rating: 4.6,
    reviewsCount: 125,
    vendorName: 'PartyDesign VN',
    vendorAvatar: '/img/PDesigh.png',
    description: 'Gói trang trí sinh nhật cao cấp bao gồm cổng bóng nghệ thuật, bàn Gallery theo chủ đề, hệ thống đèn LED và phông nền thiết kế riêng.',
    inclusions: [
      'Phông nền (Backdrop) thiết kế theo yêu cầu',
      'Cổng bóng nghệ thuật phối màu cao cấp',
      'Bàn Gallery trang trí đầy đủ phụ kiện & khay bánh',
      'Hệ thống đèn pha chiếu sáng khu vực check-in',
      'Nhân sự vận chuyển, lắp đặt và dọn dẹp trọn gói'
    ]
  },

  { 
    id: 2, 
    name: 'Gói làm bánh & tiệc cho sự kiện', 
    price: 800000, 
    img: '/img/BanhvaSuKien.png',
    rating: 4.9,
    reviewsCount: 14,
    vendorName: 'King Event Media',
    vendorAvatar: '/img/kingMedia.png',
    description: 'Cung cấp mâm tiệc Teabreak, bánh kem nghệ thuật và các loại bánh ngọt cao cấp phục vụ cho tiệc sinh nhật, hội thảo, khai trương.',
    inclusions: [
      'Bánh kem sinh nhật / sự kiện thiết kế theo concept',
      'Set bánh ngọt Teabreak 5 - 7 loại phong phú',
      'Trái cây tươi cắt sẵn theo mùa',
      'Dụng cụ ăn uống tự hủy thân thiện môi trường'
    ]
  },
  { 
    id: 3, 
    name: 'Gói MC chuyên nghiệp', 
    price: 3000000, 
    img: '/img/anhMC.png',
    rating: 4.6,
    reviewsCount: 125,
    vendorName: 'HoaBinh Events',
    vendorAvatar: '/img/HBGevent.png',
    description: 'Cung cấp MC nam/nữ chuyên nghiệp, ngoại hình đẹp, chất giọng truyền cảm, xử lý tình huống linh hoạt cho đám cưới, Year End Party, khai trương.',
    inclusions: [
      'MC dẫn chương trình chuyên nghiệp (tối đa 4 tiếng)',
      'Soạn thảo và chốt kịch bản chi tiết cùng BTC',
      'Hỗ trợ tổng duyệt trước giờ G',
      'Tương tác và tổ chức Minigame khuấy động không khí'
    ]
  },
  { 
    id: 4, 
    name: 'Gói trang trí tiệc cuối năm', 
    price: 4000000, 
    img: '/img/endYear.png',
    rating: 4.6,
    reviewsCount: 125,
    vendorName: 'HoaBinh Events',
    vendorAvatar: '/img/HBGevent.png',
    description: 'Trang trí trọn gói Year End Party hoành tráng cho doanh nghiệp với Backdrop chụp ảnh lớn, thảm đỏ, hiệu ứng ánh sáng sân khấu.',
    inclusions: [
      'Backdrop chụp ảnh check-in khổ lớn (3m x 5m)',
      'Thảm đỏ lối đi và khu vực check-in',
      'Hệ thống đèn LED chiếu sáng sân khấu',
      'Trang trí bàn tiệc VIP theo tone màu chủ đạo của công ty'
    ]
  },
  { 
    id: 5, 
    name: 'Gói chụp ảnh & quay phim sự kiện', 
    price: 2000000, 
    img: '/img/quayPhim.png',
    rating: 4.6,
    reviewsCount: 125,
    vendorName: 'King Event Media',
    vendorAvatar: '/img/kingMedia.png',
    description: 'Đội ngũ thợ chụp ảnh và quay phim chuyên nghiệp ghi lại những khoảnh khắc đáng nhớ trong sự kiện với thiết bị máy quay 4K hiện đại.',
    inclusions: [
      '1 Cameraman / Photographer chuyên nghiệp (4 tiếng)',
      'Giao toàn bộ file ảnh gốc ngay sau sự kiện',
      'Chỉnh sửa (edit) 50-100 ảnh đẹp nhất',
      'Dựng 1 video Highlight sự kiện dài 2 - 3 phút'
    ]
  },
  { 
    id: 6, 
    name: 'Gói & phụ kiện hoa cho sự kiện', 
    price: 300000, 
    img: '/img/hoaCuoi.png',
    rating: 4.6,
    reviewsCount: 125,
    vendorName: 'PartyDesign VN',
    vendorAvatar: '/img/PDesigh.png',
    description: 'Cung cấp hoa tươi/hoa lụa nghệ thuật làm hoa cài áo, hoa cầm tay cô dâu, hoa để bàn tiệc cho các sự kiện cưới hỏi, hội nghị.',
    inclusions: [
      'Hoa cầm tay cô dâu / hoa đại biểu cao cấp',
      'Hoa cài áo chú rể / khách mời VIP',
      'Lọ hoa tươi để bàn đại biểu / bàn tiệc',
      'Giao hàng tận nơi trước thời gian diễn ra sự kiện'
    ]
  }
];

// Hàm tìm sản phẩm theo id (sẽ thay bằng DB khi Hi Hi xong)
function findProduct(productId) {
  return mockProducts.find(p => p.id === parseInt(productId));
}

// Route xử lý xem chi tiết dịch vụ theo ID
app.get('/services/:id', (req, res) => {
  const serviceId = parseInt(req.params.id);
  const service = findProduct(serviceId);

  if (!service) {
    return res.status(404).send('Không tìm thấy gói dịch vụ này.');
  }

  // Lấy 3 sản phẩm gợi ý khác
  const relatedProducts = mockProducts.filter(p => p.id !== service.id).slice(0, 6);

  res.render('service-detail.html', { service, relatedProducts });
});


// ======================================================
// ===        XEM CHI TIẾT SẢN PHẨM / DỊCH VỤ           ===
// ======================================================
app.get('/services/:id', (req, res) => {
    const serviceId = parseInt(req.params.id);
    const service = findProduct(serviceId);

    if (!service) {
        return res.status(404).send('Không tìm thấy gói dịch vụ này.');
    }

    // Lấy 6 sản phẩm gợi ý khác
    const relatedProducts = mockProducts.filter(p => p.id !== service.id).slice(0, 6);

    res.render('service-detail.html', { service, relatedProducts });
});

// GET /cart - Hiển thị trang giỏ hàng
app.get('/cart', isAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  res.render('cart.html', { cart });
});

// POST /cart/add - Thêm sản phẩm vào giỏ
app.post('/cart/add', isAuthenticated, (req, res) => {
  const { product_id } = req.body;
  const product = findProduct(product_id);

  if (!product) {
    return res.status(404).send('Không tìm thấy sản phẩm.');
  }

  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Nếu đã có trong giỏ → tăng số lượng
  const existing = req.session.cart.find(item => item.product_id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    req.session.cart.push({
      product_id: product.id,
      name:       product.name,
      price:      product.price,
      img:        product.img,
      qty:        1
    });
  }

  console.log(`[GIỎ HÀNG] Thêm: ${product.name} | User: ${req.session.user.username}`);
  res.redirect('/cart');
});

// POST /cart/update - Tăng/giảm số lượng
app.post('/cart/update', isAuthenticated, (req, res) => {
  const { product_id, action } = req.body;

  if (!req.session.cart) {
    return res.redirect('/cart');
  }

  const item = req.session.cart.find(i => i.product_id === parseInt(product_id));
  if (item) {
    if (action === 'plus') {
      item.qty += 1;
    } else if (action === 'minus' && item.qty > 1) {
      item.qty -= 1;
    }
  }

  res.redirect('/cart');
});

// POST /cart/remove - Xóa 1 sản phẩm khỏi giỏ
app.post('/cart/remove', isAuthenticated, (req, res) => {
  const { product_id } = req.body;

  if (req.session.cart) {
    req.session.cart = req.session.cart.filter(
      item => item.product_id !== parseInt(product_id)
    );
  }

  res.redirect('/cart');
});

// POST /cart/clear - Xóa toàn bộ giỏ hàng
app.post('/cart/clear', isAuthenticated, (req, res) => {
  req.session.cart = [];
  res.redirect('/cart');
});

// GET /api/cart-count - Trả số lượng item trong giỏ (dùng cho badge navbar)
app.get('/api/cart-count', isAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  res.json({ count });
});

// ======================================================

app.listen(PORT, () => {
  console.log(`Server đang chạy thành công tại: http://localhost:${PORT}`);
});
