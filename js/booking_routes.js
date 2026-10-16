const express = require("express");
const router = express.Router();
const { SERVICES } = require("./service_routes");

// Các bước tiến độ của một đơn hàng (theo thứ tự)
const STEPS = [
  "Đã thanh toán",
  "Đối tác xác nhận",
  "Đang chuẩn bị",
  "Hoàn thành",
];

// Đơn hàng lưu tạm trong bộ nhớ. Sau này thay bằng database.
// Khi có đăng nhập, thêm userId vào mỗi đơn và lọc theo userId ở GET /orders.
const ORDERS = [];
let nextOrderId = 1001;

const PAYMENT_METHODS = {
  momo: "Ví MoMo",
  bank: "Chuyển khoản ngân hàng",
  card: "Thẻ ATM / Visa / Mastercard",
  cod: "Thanh toán sau khi hoàn thành",
};

function getService(id) {
  return SERVICES.find((s) => s.id === id);
}

// GET /booking/:id  -> trang thanh toán
router.get("/booking/:id", (req, res) => {
  const service = getService(parseInt(req.params.id, 10));
  if (!service) return res.status(404).send("Không tìm thấy dịch vụ");

  res.render("checkout.html", {
    service,
    methods: PAYMENT_METHODS,
    errors: [],
    form: {},
  });
});

// POST /booking/:id/pay  -> xử lý thanh toán
router.post("/booking/:id/pay", (req, res) => {
  const service = getService(parseInt(req.params.id, 10));
  if (!service) return res.status(404).send("Không tìm thấy dịch vụ");

  const { name, phone, date, time, address, note, method } = req.body;
  const errors = [];

  if (!name || !name.trim()) errors.push("Vui lòng nhập họ tên.");
  if (!/^(0|\+84)\d{9}$/.test((phone || "").replace(/\s/g, "")))
    errors.push("Số điện thoại không hợp lệ.");
  if (!date || new Date(date) < new Date(new Date().toDateString()))
    errors.push("Vui lòng chọn ngày tổ chức từ hôm nay trở đi.");
  if (!address || !address.trim()) errors.push("Vui lòng nhập địa điểm tổ chức.");
  if (!PAYMENT_METHODS[method]) errors.push("Vui lòng chọn phương thức thanh toán.");

  if (errors.length) {
    return res.status(400).render("checkout.html", {
      service,
      methods: PAYMENT_METHODS,
      errors,
      form: req.body,
    });
  }

  // TODO: gọi cổng thanh toán thật (MoMo, VNPay, PayOS...) tại đây.
  // Chỉ tạo đơn khi cổng thanh toán báo thành công (thường qua callback/webhook).
  const order = {
    id: nextOrderId++,
    serviceId: service.id,
    title: service.title,
    image: service.image,
    partner: service.partner,
    price: service.price,
    customer: { name: name.trim(), phone },
    date,
    time,
    address: address.trim(),
    note: (note || "").trim(),
    method: PAYMENT_METHODS[method],
    createdAt: new Date(),
    step: 0, // chỉ số trong STEPS
  };
  ORDERS.unshift(order);

  res.redirect("/orders?new=" + order.id);
});

// GET /orders  -> lịch sử đặt hàng + tiến độ
router.get("/orders", (req, res) => {
  res.render("orders.html", {
    orders: ORDERS,
    steps: STEPS,
    newId: parseInt(req.query.new, 10) || null,
  });
});

// POST /orders/:id/advance  -> chuyển sang bước tiếp theo
// Dùng để thử giao diện. Thực tế chỉ đối tác/admin mới được gọi, nhớ thêm kiểm tra quyền.
router.post("/orders/:id/advance", (req, res) => {
  const order = ORDERS.find((o) => o.id === parseInt(req.params.id, 10));
  if (order && order.step < STEPS.length - 1) order.step++;
  res.redirect("/orders");
});

module.exports = router;
