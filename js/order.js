// Nút "Đặt cọc ngay" ở trang chi tiết sản phẩm -> chuyển sang form đặt hàng /order/:id
// Mang theo ngày tổ chức, số lượng và tông màu khách đã chọn.
// Id dịch vụ lấy từ data-service-id của nút; nếu không có thì lấy từ đường dẫn /service-detail/:id
document.addEventListener('DOMContentLoaded', function () {
  var btnBuy = document.querySelector('.btn-buy-now');
  if (!btnBuy) {
    return;
  }

  btnBuy.addEventListener('click', function () {
    var serviceId = btnBuy.dataset.serviceId ||
      window.location.pathname.split('/').filter(Boolean).pop();
    if (!serviceId) {
      return;
    }

    var params = new URLSearchParams();

    var dateInput = document.getElementById('event-date');
    if (dateInput && dateInput.value) {
      params.set('date', dateInput.value);
    }

    var quantityInput = document.getElementById('quantity');
    if (quantityInput && parseInt(quantityInput.value, 10) > 0) {
      params.set('quantity', parseInt(quantityInput.value, 10));
    }

    var activeColor = document.querySelector('.color-tag-btn.active');
    if (activeColor) {
      params.set('color', activeColor.textContent.trim());
    }

    var query = params.toString();
    window.location.href = '/order/' + encodeURIComponent(serviceId) + (query ? '?' + query : '');
  });
});
