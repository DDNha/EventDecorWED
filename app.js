const express = require("express");
const nunjucks = require("nunjucks");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
const session = require("express-session");
const mysql = require("mysql2/promise");

// Middleware đọc dữ liệu từ Form POST
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Cấu hình Express Session
app.use(
  session({
    secret: "chuoi_bi_mat_rat_an_toan",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // Phiên tồn tại trong 1 ngày
  }),
);

// Phục vụ file tĩnh từ các thư mục css, img, js ở thư mục gốc
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/img", express.static(path.join(__dirname, "img")));
app.use("/js", express.static(path.join(__dirname, "js")));

// Nếu có lưu assets trong thư mục public (tùy chọn)
app.use(express.static(path.join(__dirname, "public")));

// Cấu hình Nunjucks Template Engine cho thư mục views/
nunjucks.configure("views", {
  autoescape: true,
  express: app,
  noCache: process.env.NODE_ENV === "development",
});
app.set("view engine", "html");

//Kết nối SQL
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456789", // Điền mật khẩu MySQL của bạn
  database: "node_auth_demo", // Tên database cần kết nối
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  try {
    await pool.query("SELECT 1");
    console.log("Kết nối MySQL thành công!");
  } catch (error) {
    console.error("Lỗi kết nối hoặc truy vấn:", error);
  }
}

 testConnection().then(); 

// Middleware kiểm tra xem người dùng đã đăng nhập chưa
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/");
}

// ---------------- ROUTES ----------------
app.get("/", async (req, res) => {
  if (!req.session) {
    return res.redirect("/login");
  }
  try {
    const [partners] = await pool.query(`SELECT * From partners`);
    res.render("index.html", {
      part: partners,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi truy vấn database");
  }
});

app.get("/about", async (req, res) => {
  try {
    const [rated] = await pool.query(`SELECT * From employee_rated`);
    res.render("aboutus.html", {
      rated: rated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi truy vấn database");
  }
});

// THÊM MỚI / CẬP NHẬT: Lấy danh sách sản phẩm từ MySQL cho trang Dịch vụ
app.get("/services", async (req, res) => {
  try {
    const [products] = await pool.query("SELECT * FROM products");
    res.render("eventservices.html", { products });
  } catch (error) {
    console.error("Lỗi lấy danh sách sản phẩm:", error);
    res.status(500).send("Lỗi truy vấn cơ sở dữ liệu");
  }
});

app.get("/partner", async (req, res) => {
  try {
    const [partners] = await pool.query(`SELECT * From partners`);
    res.render("partner.html", {
      part: partners,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi truy vấn database");
  }
});
app.get("/partner/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).send("Không tìm thấy đối tác");
  }

  try {
    const sql = `
      SELECT p.name, p.image, p.description, p.address, p.phone, p.email,
             s.name AS specialty_name
      FROM partners p
      JOIN partner_specialties ps ON ps.partner_id = p.id
      JOIN specialties s ON s.id = ps.specialty_id
      WHERE p.id = ?`;
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).send("Không tìm thấy đối tác");
    }
    const [other] = await pool.query(
      `SELECT id, name FROM partners where id <> ? limit 2`,
      [id],
    );
    return res.render("detailed-partner.html", {
      parts: rows[0],
      spec: rows.map((r) => r.specialty_name),
      other,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Lỗi truy vấn database");
  }
});
app.get("/contact", (req, res) => {
  res.render("contact.html");
});

app.post("/contact", (req, res) => {
  console.log("Thông tin liên hệ:", req.body);
  res.redirect("/contact");
});

app.get("/register", (req, res) => {
  res.render("register.html");
});

app.post("/register", (req, res) => {
  console.log("Thông tin đăng ký:", req.body);
  res.redirect("/login");
});

// API lấy thông tin user đang đăng nhập (để hiển thị lên dashboard)
app.get("/api/current-user", isAuthenticated, (req, res) => {
  res.json({ username: req.session.user.username });
});

app.get("/login", (req, res) => {
  res.render("login.html");
});

//Xử lý đăng nhập (POST)
app.post("/login", async (req, res) => {
  if (req === undefined) {
    req = {};
  }
  const { email, password } = req.body;

  try {
    // Truy vấn kiểm tra user trong database
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password],
    );

    console.log(rows);
    if (rows.length > 0) {
      // Đăng nhập thành công, lưu thông tin vào session
      req.session.user = { id: rows[0].id, username: rows[0].username };
      return res.redirect("/");
    } else {
      // Sai tài khoản hoặc mật khẩu
      return res.send(`<script>alert('Sai email hoặc mật khẩu.');</script>`);
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).send("Lỗi hệ thống server.");
  }
});

// Xử lý Đăng xuất
app.get("/logout", (req, res) => {
  if (req === undefined) {
    req = {};
  }
  req.session.destroy((err) => {
    if (err) {
      return console.log("Lỗi khi hủy session:", err);
    }
    res.redirect("/");
  });
});

// ======================================================
// ===        QUẢN LÝ GIỎ HÀNG & TRUY VẤN DỊCH VỤ       ===
// ======================================================

// Dữ liệu sản phẩm mẫu đầy đủ để test (Giữ lại nguyên vẹn code cũ)
const mockProducts = [
  {
    id: 1,
    name: "Gói trang trí tiệc cưới",
    price: 5000000,
    img: "/img/wedding.png",
  },
  { id: 2, name: "Gói sinh nhật", price: 2000000, img: "/img/birthday.png" },
  { id: 3, name: "Gói tiệc cuối năm", price: 3500000, img: "/img/endYear.png" },
  {
    id: 4,
    name: "Gói sự kiện khai trương",
    price: 4000000,
    img: "/img/HBGevent.png",
  },
  {
    id: 5,
    name: "Gói chụp ảnh & quay phim",
    price: 2500000,
    img: "/img/quayPhim.png",
  },
];

// Hàm tìm sản phẩm theo id cũ
function findProduct(productId) {
  return mockProducts.find((p) => p.id === parseInt(productId));
}

// THÊM MỚI: Hàm helper lấy chi tiết đầy đủ sản phẩm từ cơ sở dữ liệu MySQL
async function getProductDetailFromDB(productId) {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
  if (rows.length === 0) return null;

  const product = rows[0];

  const [inclusions] = await pool.query('SELECT item_text FROM product_inclusions WHERE product_id = ?', [productId]);
  const [colors] = await pool.query('SELECT color_name FROM product_colors WHERE product_id = ?', [productId]);
  const [gifts] = await pool.query('SELECT gift_text FROM product_gifts WHERE product_id = ?', [productId]);
  const [notes] = await pool.query('SELECT note_text FROM product_notes WHERE product_id = ?', [productId]);
  const [requirements] = await pool.query('SELECT requirement_text FROM product_requirements WHERE product_id = ?', [productId]);
  const [variants] = await pool.query('SELECT * FROM product_variants WHERE product_id = ?', [productId]);

  return {
    ...product,
    pricingDetails: {
      baseIncluded: product.baseIncluded,
      overtimeFee: product.overtimeFee,
      distanceFee: product.distanceFee,
      extraItemFee: product.extraItemFee,
      deliveryNotes: product.deliveryNotes
    },
    inclusions: inclusions.map(i => i.item_text),
    colors: colors.map(c => c.color_name),
    gifts: gifts.map(g => g.gift_text),
    notes: notes.map(n => n.note_text),
    requirements: requirements.map(r => r.requirement_text),
    variants: variants
  };
}

// ======================================================
// ===        XEM CHI TIẾT SẢN PHẨM / DỊCH VỤ           ===
// ======================================================
// THÊM MỚI: Route xem chi tiết sản phẩm kết nối MySQL
app.get('/services/:id', async (req, res) => {
  const serviceId = parseInt(req.params.id);
  if (isNaN(serviceId)) {
    return res.status(400).send('ID dịch vụ không hợp lệ.');
  }

  try {
    const service = await getProductDetailFromDB(serviceId);

    if (!service) {
      return res.status(404).send('Không tìm thấy gói dịch vụ này.');
    }

    // Lấy danh sách 6 sản phẩm liên quan gợi ý bên dưới
    const [relatedProducts] = await pool.query(
      'SELECT id, name, price, img, unit FROM products WHERE id <> ? LIMIT 6',
      [serviceId]
    );

    res.render('service-detail.html', { service, relatedProducts });
  } catch (error) {
    console.error("Lỗi khi tải chi tiết sản phẩm:", error);
    res.status(500).send("Lỗi kết nối cơ sở dữ liệu.");
  }
});

// GET /cart - Hiển thị trang giỏ hàng
app.get("/cart", isAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  res.render("cart.html", { cart });
});

// POST /cart/add - Thêm sản phẩm vào giỏ
app.post("/cart/add", isAuthenticated, async (req, res) => {
  const { product_id, serviceId, selectedVariantId, selectedColor } = req.body;
  const targetId = serviceId || product_id;

  try {
    const product = await getProductDetailFromDB(targetId) || findProduct(targetId);

    if (!product) {
      return res.status(404).send("Không tìm thấy sản phẩm.");
    }

    if (!req.session.cart) {
      req.session.cart = [];
    }

    let finalPrice = product.price;
    let variantName = '';

    if (product.variants && selectedVariantId) {
      const v = product.variants.find(item => item.variantId === selectedVariantId);
      if (v) {
        finalPrice += v.priceModifier;
        variantName = v.name;
      }
    }

    const existing = req.session.cart.find(
      (item) => item.product_id === product.id && item.selectedVariantId === selectedVariantId
    );

    if (existing) {
      existing.qty += 1;
    } else {
      req.session.cart.push({
        product_id: product.id,
        name: product.name,
        variantName: variantName,
        selectedColor: selectedColor || '',
        selectedVariantId: selectedVariantId || '',
        price: finalPrice,
        img: product.img,
        qty: 1,
      });
    }

    console.log(
      `[GIỎ HÀNG] Thêm: ${product.name} | User: ${req.session.user.username}`,
    );
    res.redirect("/cart");
  } catch (error) {
    console.error("Lỗi thêm vào giỏ hàng:", error);
    res.status(500).send("Lỗi xử lý giỏ hàng.");
  }
});

// POST /cart/update - Tăng/giảm số lượng
app.post("/cart/update", isAuthenticated, (req, res) => {
  const { product_id, action } = req.body;

  if (!req.session.cart) {
    return res.redirect("/cart");
  }

  const item = req.session.cart.find(
    (i) => i.product_id === parseInt(product_id),
  );
  if (item) {
    if (action === "plus") {
      item.qty += 1;
    } else if (action === "minus" && item.qty > 1) {
      item.qty -= 1;
    }
  }

  res.redirect("/cart");
});

// POST /cart/remove - Xóa 1 sản phẩm khỏi giỏ
app.post("/cart/remove", isAuthenticated, (req, res) => {
  const { product_id } = req.body;

  if (req.session.cart) {
    req.session.cart = req.session.cart.filter(
      (item) => item.product_id !== parseInt(product_id),
    );
  }

  res.redirect("/cart");
});

// POST /cart/clear - Xóa toàn bộ giỏ hàng
app.post("/cart/clear", isAuthenticated, (req, res) => {
  req.session.cart = [];
  res.redirect("/cart");
});

// GET /api/cart-count - Trả số lượng item trong giỏ (dùng cho badge navbar)
app.get("/api/cart-count", isAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  res.json({ count });
});

// ======================================================

app.listen(PORT, () => {
  console.log(`Server đang chạy thành công tại: http://localhost:${PORT}`);
});