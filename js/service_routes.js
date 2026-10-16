const express = require("express");
const router = express.Router();

// Dữ liệu mẫu khớp với 6 thẻ ở trang chủ.
// Sau này bạn có thể thay bằng truy vấn database.
const SERVICES = [
  {
    id: 1,
    title: "Gói trang trí sinh nhật cao cấp",
    image: "/img/birthday.png",
    rating: 4.6,
    reviews: 125,
    price: 1500000,
    short: "Không gian sinh nhật được thiết kế riêng theo chủ đề bạn chọn.",
    duration: "3 giờ (setup + dọn dẹp)",
    area: "TP. Hồ Chí Minh và Bình Dương",
    partner: "Party Planner",
    includes: [
      "Backdrop theo chủ đề",
      "Bóng bay trang trí",
      "Bàn quà và bàn tiệc",
      "Chữ tên / số tuổi",
      "Nhân viên setup tại chỗ",
    ],
    description:
      "Gói trang trí sinh nhật cao cấp phù hợp cho tiệc 20-50 khách. Đội ngũ sẽ trao đổi chủ đề, màu sắc trước ngày tổ chức và hoàn tất setup trước giờ tiệc.",
  },
  {
    id: 2,
    title: "Gói làm bánh & tiệc cho sự kiện",
    image: "/img/BanhvaSuKien.png",
    rating: 4.9,
    reviews: 14,
    price: 800000,
    short: "Bánh và đồ ăn nhẹ cho sự kiện, làm theo số lượng khách.",
    duration: "Giao trong ngày",
    area: "TP. Hồ Chí Minh",
    partner: "Sweet House",
    includes: [
      "Bánh kem theo yêu cầu",
      "Bánh ngọt / finger food",
      "Dụng cụ cắt bánh",
      "Giao tận nơi",
    ],
    description:
      "Bánh và tiệc nhẹ được làm tươi trong ngày, có thể tùy chỉnh hương vị và số lượng.",
  },
  {
    id: 3,
    title: "Gói MC chuyên nghiệp",
    image: "/img/anhMC.png",
    rating: 4.6,
    reviews: 125,
    price: 3000000,
    short: "MC dẫn chương trình cho tiệc cưới, sinh nhật, sự kiện doanh nghiệp.",
    duration: "Tối đa 4 giờ",
    area: "Toàn quốc (có phụ phí di chuyển)",
    partner: "Golden Voice",
    includes: [
      "Kịch bản chương trình",
      "Họp trao đổi trước sự kiện",
      "Dẫn chương trình trọn buổi",
      "Trang phục theo yêu cầu",
    ],
    description:
      "MC có kinh nghiệm, chủ động điều phối chương trình và tương tác với khách mời.",
  },
  {
    id: 4,
    title: "Gói trang trí tiệc cuối năm",
    image: "/img/endYear.png",
    rating: 4.6,
    reviews: 125,
    price: 4000000,
    short: "Trang trí tiệc tất niên, year end party cho công ty và nhóm bạn.",
    duration: "4 giờ (setup + dọn dẹp)",
    area: "TP. Hồ Chí Minh và Bình Dương",
    partner: "Event Pro",
    includes: [
      "Backdrop sân khấu",
      "Trang trí bàn tiệc",
      "Đèn và bóng trang trí",
      "Cổng chào / photobooth",
    ],
    description:
      "Gói trang trí dành cho tiệc 50-150 khách, theo concept bạn chọn.",
  },
  {
    id: 5,
    title: "Gói chụp ảnh & quay phim sự kiện",
    image: "/img/quayPhim.png",
    rating: 4.6,
    reviews: 125,
    price: 2000000,
    short: "Ghi lại toàn bộ khoảnh khắc sự kiện bằng ảnh và video.",
    duration: "Tối đa 4 giờ",
    area: "TP. Hồ Chí Minh",
    partner: "Moment Studio",
    includes: [
      "1 nhiếp ảnh gia + 1 quay phim",
      "Ảnh chỉnh sửa cơ bản",
      "Video highlight 2-3 phút",
      "Giao file qua link tải",
    ],
    description:
      "Nhận ảnh trong 3 ngày và video highlight trong 7 ngày sau sự kiện.",
  },
  {
    id: 6,
    title: "Gói & phụ kiện hoa cho sự kiện",
    image: "/img/hoaCuoi.png",
    rating: 4.6,
    reviews: 125,
    price: 300000,
    short: "Hoa tươi và phụ kiện hoa cho bàn tiệc, cổng chào, cầm tay.",
    duration: "Giao trong ngày",
    area: "TP. Hồ Chí Minh",
    partner: "Flora Studio",
    includes: ["Hoa cầm tay / hoa cài áo", "Hoa để bàn", "Phụ kiện trang trí"],
    description: "Hoa tươi theo mùa, phối màu theo chủ đề sự kiện.",
  },
];

function getService(id) {
  return SERVICES.find((s) => s.id === id);
}

// GET /services/:id
router.get("/services/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const service = getService(id);

  if (!service) {
    return res.status(404).send("Không tìm thấy dịch vụ");
  }

  const related = SERVICES.filter((s) => s.id !== id).slice(0, 3);
  res.render("service_detail.html", { service, related });
});

module.exports = router;
module.exports.SERVICES = SERVICES;
