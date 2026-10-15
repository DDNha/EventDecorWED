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
app.use(express.static('public'));

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
    category: 'decor',
    unit: 'gói/ngày',
    location: 'TP.HCM',
    executionTime: 'Setup trước 3 tiếng',
    vendorName: 'PartyDesign VN',
    vendorAvatar: '/img/PDesigh.png',
    description: 'Gói trang trí sinh nhật cao cấp bao gồm cổng bóng nghệ thuật, bàn Gallery theo chủ đề, hệ thống đèn LED và phông nền thiết kế riêng.',
    inclusions: [
      'Phông nền (Backdrop) thiết kế theo yêu cầu',
      'Cổng bóng nghệ thuật phối màu cao cấp',
      'Bàn Gallery trang trí đầy đủ phụ kiện & khay bánh',
      'Hệ thống đèn pha chiếu sáng khu vực check-in',
      'Nhân sự vận chuyển, lắp đặt và dọn dẹp trọn gói'
    ],
    colors: ['Đỏ', 'Vàng Kem', 'Hồng Pastel', 'Hồng Cam', 'Xanh Da Trời', 'Xanh Mint', 'Tím Hoa Cà'],
    gifts: [
      ' Tặng phiếu giảm giá hoặc thẻ thành viên VIP cho lần ghé thăm tiếp theo)',
      'Miễn phí hoặc hỗ trợ sử dụng hệ thống loa, micro, màn hình LED, hoặc máy chiếu để chiếu slide ảnh/video kỷ niệm.'
    ],
    notes: [
      'Màu sắc của gói sẽ được phối tone sur tone từ phông màn, nơ ghế, khăn bàn cho đến tem chai nước suối.',
      'Bộ ấm tách trà và đĩa lót ly sử dụng 100% gốm sứ Minh Long cao cấp.',
      'Bộ lư đồng, bát nhang, chân đèn được điêu khắc họa tiết Rồng, chạm nổi 3D sang trọng.',
      'Gói cơ bản đã bao gồm bộ ghế Tiffany tiêu chuẩn cho tiệc.'
    ],
    pricingDetails: {
      baseIncluded: 'Bao gồm trọn gói trang trí + 12 ghế Tiffany tiêu chuẩn',
      extraItemFee: 'Phụ thu phát sinh thêm ghế: 600,000 VNĐ/gói/12 ghế tăng thêm',
      deliveryNotes: 'Phụ thu 200,000 VNĐ/nhà đối với các trường hợp địa hình khó thi công: Nhà trong hẻm sâu xe tải không vào được, nhà chung cư không có thang máy, hoặc nhà phố thi công trên lầu cao không có thang tải.'
    },
    variants: [
      { variantId: 'v1_gold', name: 'Tone Vàng Gold Hoàng Gia', colorCode: '#FFD700', variantImg: '/img/birthday.png', priceModifier: 0 },
      { variantId: 'v1_pink', name: 'Tone Hồng Pastel Công Chúa', colorCode: '#FFB6C1', variantImg: '/img/birthday-pink.png', priceModifier: 100000 },
      { variantId: 'v1_blue', name: 'Tone Xanh Dương Chrome Vũ Trụ', colorCode: '#1E90FF', variantImg: '/img/birthday-blue.png', priceModifier: 200000 }
    ]
  },
  { 
    id: 2, 
    name: 'Gói làm bánh & tiệc cho sự kiện', 
    price: 800000, 
    img: '/img/BanhvaSuKien.png',
    rating: 4.9,
    reviewsCount: 14,
    category: 'catering',
    unit: 'set/30 người',
    location: 'TP.HCM',
    executionTime: 'Giao trước giờ G 1 tiếng',
    vendorName: 'King Event Media',
    vendorAvatar: '/img/kingMedia.png',
    description: 'Cung cấp mâm tiệc Teabreak, bánh kem nghệ thuật và các loại bánh ngọt cao cấp phục vụ cho tiệc sinh nhật, hội thảo, khai trương.',
    inclusions: [
      'Bánh kem sinh nhật / sự kiện thiết kế theo concept',
      'Set bánh ngọt Teabreak 5 - 7 loại phong phú',
      'Trái cây tươi cắt sẵn theo mùa',
      'Dụng cụ ăn uống tự hủy thân thiện môi trường'
    ],
    colors: ['Trắng Kem', 'Hồng Pastel', 'Xanh Mint'],
    gifts: [
      'Tặng kèm 01 bộ dao cắt bánh cao cấp và 30 cây nến phục vụ tiệc',
      'Miễn phí mượn kệ trưng bày bánh 3 tầng bằng pha lê sang trọng'
    ],
    notes: [
      'Bánh được làm mới 100% trong ngày sự kiện diễn ra, không sử dụng chất bảo quản.',
      'Đã bao gồm khay kệ setup bàn tiệc tiêu chuẩn tại vị trí khách hàng yêu cầu.',
      'Quý khách cần báo trước các trường hợp dị ứng thực phẩm của khách mời (nếu có).'
    ],
    pricingDetails: {
      baseIncluded: 'Set menu tiêu chuẩn định lượng vừa đủ cho 30 khách',
      extraItemFee: 'Đặt thêm bánh ngọt lẻ: Phát sinh từ 25,000 VNĐ - 40,000 VNĐ/phần',
      deliveryNotes: 'Miễn phí giao hàng bán kính 5km. Ngoại thành phụ thu phí ship tùy theo khoảng cách định vị của ứng dụng giao hàng.'
    },
    variants: [
      { variantId: 'v2_european', name: 'Menu Tiệc Ngọt Kiểu Pháp', colorCode: '#D2B48C', variantImg: '/img/BanhvaSuKien.png', priceModifier: 0 },
      { variantId: 'v2_healthy', name: 'Menu Tiệc Healthy & Keto', colorCode: '#98FB98', variantImg: '/img/teabreak-healthy.png', priceModifier: 150000 }
    ]
  },
  { 
    id: 3, 
    name: 'Gói MC chuyên nghiệp', 
    price: 3000000, 
    img: '/img/anhMC.png',
    rating: 4.6,
    reviewsCount: 125,
    category: 'talent',
    unit: 'người/4 tiếng',
    location: 'TP.HCM',
    executionTime: 'Có mặt trước giờ G 1. tiếng',
    vendorName: 'HoaBinh Events',
    vendorAvatar: '/img/HBGevent.png',
    description: 'Cung cấp MC nam/nữ chuyên nghiệp, ngoại hình đẹp, chất giọng truyền cảm, xử lý tình huống linh hoạt cho đám cưới, Year End Party, khai trương.',
    inclusions: [
      'MC dẫn chương trình chuyên nghiệp (tối đa 4 tiếng)',
      'Soạn thảo và chốt kịch bản chi tiết cùng BTC',
      'Hỗ trợ tổng duyệt trước giờ G',
      'Tương tác và tổ chức Minigame khuấy động không khí'
    ],
    requirements: [
      'Kỹ năng chuyên môn: Có kiến thức sâu về quản lý sự kiện, thiết kế dòng chảy chương trình và phối hợp bộ phận âm thanh, ánh sáng.',
      'Kinh nghiệm: Tối thiểu 1 năm kinh nghiệm dẫn các sự kiện tương tự, nhạy bén trong xử lý tình huống phát sinh trên sân khấu.',
      'Sự tỉ mỉ và chi tiết: Nghiên cứu kỹ thông tin đối tác, bám sát lịch trình timeline cốt lõi và kiểm soát chặt chẽ logistics nội dung.',
      'Kỹ năng giao tiếp: Ngoại hình sáng, giọng nói chuẩn vùng miền, tương tác kết nối tốt với cả đội ngũ nhân sự lẫn khách mời.',
      'Sáng tạo & Chịu áp lực: Khả năng tùy biến ngôn từ linh hoạt, giữ vững phong thái chuyên nghiệp và bình tĩnh dưới áp lực giờ giấc khẩn cấp.',
      'Tính chuyên nghiệp và tôn trọng: Đảm bảo tác phong, trang phục đúng brief và duy trì thái độ chuẩn mực đối với toàn bộ khách hàng.'
    ],
    notes: [
      'Trang phục MC tự chuẩn bị theo đúng tông màu (Dresscode) chủ đạo mà ban tổ chức yêu cầu.',
      'MC sẽ chủ động liên hệ trực tiếp với bộ phận điều phối âm thanh (Audio Operator) trước sự kiện để khớp nhạc hiệu.'
    ],
    pricingDetails: {
      baseIncluded: 'Phục vụ trong phạm vi thành phố Hồ Chí Minh (Bán kính dưới 15km) với thời gian tối đa 4 tiếng.',
      overtimeFee: 'Phí phát sinh thêm giờ: 500,000 VNĐ / 1 tiếng phát sinh ngoài kịch bản.',
      distanceFee: 'Chi phí đi xa (Ngoại thành/Tỉnh lân cận): Phụ thu 500,000 VNĐ chi phí di chuyển đường dài + Hỗ trợ phương tiện đi lại hoặc chi phí lưu trú nếu sự kiện kéo dài qua đêm.'
    },
    variants: [
      { variantId: 'v3_vn_male', name: 'MC - Tiếng Việt', colorCode: '#00008B', variantImg: '/img/anhMC.png', priceModifier: 0 },
      { variantId: 'v3_bilingual', name: 'MC Song ngữ (Anh - Việt)', colorCode: '#4B0082', variantImg: '/img/mc_sngu.png', priceModifier: 1500000 }
    ]
  },
  { 
    id: 4, 
    name: 'Gói trang trí tiệc cuối năm', 
    price: 4000000, 
    img: '/img/endYear.png',
    rating: 4.6,
    reviewsCount: 125,
    category: 'decor',
    unit: 'gói/ngày',
    location: 'TP.HCM',
    executionTime: 'Setup trước 3 tiếng',
    vendorName: 'HoaBinh Events',
    vendorAvatar: '/img/HBGevent.png',
    description: 'Trang trí trọn gói Year End Party hoành tráng cho doanh nghiệp với Backdrop chụp ảnh lớn, thảm đỏ, hiệu ứng ánh sáng sân khấu.',
    inclusions: [
      'Backdrop chụp ảnh check-in khổ lớn (3m x 5m)',
      'Thảm đỏ lối đi và khu vực check-in',
      'Hệ thống đèn LED chiếu sáng sân khấu',
      'Trang trí bàn tiệc VIP theo tone màu chủ đạo của công ty'
    ],
    colors: ['Đen Gold (Gatsy)', 'Đỏ Truyền Thống', 'Xanh Bạc (Futuristic)'],
    gifts: [
      'Tặng kèm 01 bảng Welcome đón khách thiết kế chuẩn theo bộ nhận diện thương hiệu công ty',
      'Miễn phí lắp đặt hệ thống hashtag cầm tay chụp ảnh vui nhộn (Tối đa 10 cái)'
    ],
    notes: [
      'Kích thước backdrop mặc định là 3x5m, sử dụng bạt hiflex chất lượng cao không xuyên sáng.',
      'Toàn bộ kết cấu khung sắt thi công đều được gia cố tạ xích chịu lực chống lật an toàn.'
    ],
    pricingDetails: {
      baseIncluded: 'Bao gồm toàn bộ nhân sự lắp đặt ban ngày và dọn dẹp tháo dỡ ngay sau khi tiệc kết thúc.',
      extraItemFee: 'Mở rộng kích thước backdrop tăng thêm: 150,000 VNĐ / m² phát sinh.',
      deliveryNotes: 'Miễn phí thi công trong các trung tâm hội nghị nội thành. Các mặt bằng yêu cầu thợ phải setup muộn sau 0h đêm sẽ phụ thu 15% phí tăng ca đêm của đội thợ.'
    },
    variants: [
      { variantId: 'v4_gatsy', name: 'Concept Đêm Gatsy Thượng Lưu', colorCode: '#333333', variantImg: '/img/endYear.png', priceModifier: 0 },
      { variantId: 'v4_neon', name: 'Concept ngoài trời ', colorCode: '#FF00FF', variantImg: '/img/yep-ngoaitro.png', priceModifier: 1000000 }
    ]
  },
  { 
    id: 5, 
    name: 'Gói chụp ảnh & quay phim sự kiện', 
    price: 2000000, 
    img: '/img/quayPhim.png',
    rating: 4.6,
    reviewsCount: 125,
    category: 'media',
    unit: 'gói/buổi',
    location: 'TP.HCM',
    executionTime: 'Có mặt trước giờ G 1 tiếng ',
    vendorName: 'King Event Media',
    vendorAvatar: '/img/kingMedia.png',
    description: 'Đội ngũ thợ chụp ảnh và quay phim chuyên nghiệp ghi lại những khoảnh khắc đáng nhớ trong sự kiện với thiết bị máy quay 4K hiện đại.',
    inclusions: [
      '1 Cameraman / Photographer chuyên nghiệp (4 tiếng)',
      'Giao toàn bộ file ảnh gốc ngay sau sự kiện',
      'Chỉnh sửa (edit) 50-100 ảnh đẹp nhất',
      'Dựng 1 video Highlight sự kiện dài 2 - 3 phút'
    ],
    gifts: [
      'Tặng 01 ảnh tập thể khung gỗ lớn cỡ 20x30cm in ép gỗ cao cấp giao tận nơi.',
      'Lưu trữ dữ liệu ảnh gốc miễn phí trên hệ thống Cloud của Vendor trong vòng 6 tháng.'
    ],
    notes: [
      'Toàn bộ file ảnh gốc (định dạng JPG) sẽ được bàn giao qua Google Drive hoặc link nội bộ trong vòng 24 giờ sau khi sự kiện kết thúc.',
      'Video Highlight đã chỉnh sửa hoàn thiện sẽ được bàn giao sau 3 - 5 ngày làm việc.',
      'Quý khách có quyền yêu cầu chỉnh sửa lại video tối đa 2 lần miễn phí nếu chưa đúng ý.'
    ],
    pricingDetails: {
      baseIncluded: 'Gói chụp/quay tiêu chuẩn trong 4 tiếng nội thành TP.HCM',
      overtimeFee: 'Phụ thu quay/chụp ngoài giờ: 500,000 VNĐ / 1 tiếng phát sinh.',
      distanceFee: 'Chi phí đi xa (Ngoại thành/Tỉnh lân cận): Phụ thu 500,000 VNĐ chi phí di chuyển đường dài.'
    },
    variants: [
      { variantId: 'v5_standard', name: 'Cơ bản (1 Máy chụp)', colorCode: '#C0C0C0', variantImg: '/img/kingMedia.png', priceModifier: 0 },
      { variantId: 'v5_premium', name: 'Nâng cấp (1 Chụp + 1 Quay 4K)', colorCode: '#2F4F4F', variantImg: '/img/quaynangcap.png', priceModifier: 2000000 }
    ]
  },
  { 
    id: 6, 
    name: 'Gói & phụ kiện hoa cho sự kiện', 
    price: 300000, 
    img: '/img/hoaCuoi.png',
    rating: 4.6,
    reviewsCount: 125,
    category: 'floral',
    unit: 'bộ',
    location: 'TP.HCM',
    executionTime: 'Giao trước giờ G 2 tiếng',
    vendorName: 'PartyDesign VN',
    vendorAvatar: '/img/PDesigh.png',
    description: 'Cung cấp hoa tươi/hoa lụa nghệ thuật làm hoa cài áo, hoa cầm tay cô dâu, hoa để bàn tiệc cho các sự kiện cưới hỏi, hội nghị.',
    inclusions: [
      'Hoa cầm tay cô dâu / hoa đại biểu cao cấp',
      'Hoa cài áo chú rể / khách mời VIP',
      'Lọ hoa tươi để bàn đại biểu / bàn tiệc',
      'Giao hàng tận nơi trước thời gian diễn ra sự kiện'
    ],
    colors: ['Hồng Pastel', 'Trắng Pure', 'Đỏ Rượu Bordeaux', 'Vàng Nắng'],
    gifts: [
      'Tặng 01 hộp bảo quản hoa chuyên dụng giữ hoa tươi suốt 12 tiếng.',
      'Voucher giảm 10% khi đặt hoa trang trí xe cưới.'
    ],
    notes: [
      'Hoa tươi được tuyển chọn kỹ từ nhà vườn Đà Lạt, cắm mới 100% trước giờ giao.',
      'Kiểu dáng hoa cầm tay và hoa cài áo phối đồng bộ theo đúng màu sắc sự kiện.'
    ],
    pricingDetails: {
      baseIncluded: 'Bao gồm 1 bó hoa cầm tay + 1 hoa cài áo chú rể',
      extraItemFee: 'Thêm hoa cài áo đại biểu: 30,000 VNĐ / cái',
      deliveryNotes: 'Miễn phí giao hàng trong bán kính 5km.'
    },
    variants: [
      { variantId: 'v6_silk', name: 'Hoa Lụa Cao Cấp', colorCode: '#FFE4E1', variantImg: '/img/PDesigh.png', priceModifier: 0 },
      { variantId: 'v6_fresh_local', name: 'Hoa Tươi Nội Địa (Đà Lạt)', colorCode: '#FFD700', variantImg: '/img/flower-local.png', priceModifier: 200000 },
      { variantId: 'v6_fresh_import', name: 'Hoa Tươi Nhập Khẩu (Hà Lan/Ecuador)', colorCode: '#FF0000', variantImg: '/img/flower-import.png', priceModifier: 900000 }
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
