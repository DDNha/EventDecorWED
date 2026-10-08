/**
 * js/admin/breadcrumb.js
 * Tự động render Breadcrumb dựa trên URL hoặc file HTML hiện tại
 */
(function initBreadcrumb() {
  // Bản đồ định nghĩa cấu trúc phân cấp cho từng trang
  const routeMap = {
    // Dashboard
    'dashboard.html': [
      { name: 'Dashboard', url: null }
    ],

    // Nhóm Quản lý Tài khoản
    'accounts.html': [
      { name: 'Quản lý Tài khoản', url: null }
    ],
    'accounts-customers.html': [
      { name: 'Quản lý Tài khoản', url: 'accounts.html' },
      { name: 'Tài khoản Khách hàng', url: null }
    ],
    'accounts-partners.html': [
      { name: 'Quản lý Tài khoản', url: 'accounts.html' },
      { name: 'Tài khoản Đối tác', url: null }
    ],
    'accounts-admins.html': [
      { name: 'Quản lý Tài khoản', url: 'accounts.html' },
      { name: 'Tài khoản Admin', url: null }
    ],

    // Nhóm Quản lý Dịch vụ
    'services.html': [
      { name: 'Quản lý Dịch vụ', url: null }
    ],
    'services-approval.html': [
      { name: 'Quản lý Dịch vụ', url: 'services.html' },
      { name: 'Duyệt dịch vụ', url: null }
    ],

    // Nhóm Đơn hàng & Quản lý khác
    'orders.html': [
      { name: 'Quản lý Đơn hàng', url: null }
    ],
    'reviews.html': [
      { name: 'Quản lý Nhận xét', url: null }
    ],
    'income.html': [
      { name: 'Quản lý Thu nhập', url: null }
    ],
    'salaries.html': [
      { name: 'Quản lý Lương', url: null }
    ],
    'settings.html': [
      { name: 'Cài đặt', url: null }
    ]
  };

  document.addEventListener('DOMContentLoaded', () => {
    const breadcrumbContainer = document.getElementById('breadcrumb');
    if (!breadcrumbContainer) return;

    // Lấy tên file HTML hiện tại từ thanh địa chỉ (mặc định nếu trang chủ là dashboard.html)
    const currentFile = window.location.pathname.split('/').pop() || 'dashboard.html';
    const crumbs = routeMap[currentFile] || [];

    // Luôn bắt đầu bằng "Trang chủ"
    let html = `
      <ol class="inline-flex items-center text-xs font-medium text-slate-400 select-none">
        <li class="inline-flex items-center">
          <a href="dashboard.html" class="hover:text-blue-600 transition-colors">Trang chủ</a>
        </li>
    `;

    // Render các cấp tiếp theo
    crumbs.forEach((crumb, index) => {
      const isLast = index === crumbs.length - 1;

      html += `
        <li class="inline-flex items-center">
          <span class="text-slate-300 mx-2">&rsaquo;</span>
        </li>
      `;

      if (isLast) {
        // Cấp cuối cùng (trang hiện tại) -> In đậm, màu tối hơn
        html += `
          <li aria-current="page">
            <span class="text-slate-600 font-semibold">${crumb.name}</span>
          </li>
        `;
      } else {
        // Cấp trung gian -> Có thể bấm được hoặc hover
        html += `
          <li>
            ${crumb.url 
              ? `<a href="${crumb.url}" class="hover:text-blue-600 transition-colors">${crumb.name}</a>` 
              : `<span class="hover:text-blue-600 cursor-pointer transition-colors">\${crumb.name}</span>`
            }
          </li>
        `;
      }
    });

    html += `</ol>`;
    breadcrumbContainer.innerHTML = html;
  });
})();