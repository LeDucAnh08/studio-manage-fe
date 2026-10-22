# Phân nhóm danh mục thuê — 20/10/2026

## Thay đổi

- Sau khi chọn đủ kỳ thuê và tải được hàng còn trống, customer chọn Tất cả / Trang phục / Phụ kiện bằng các nút hiển thị số mẫu. Danh mục con xuất hiện ngay bên dưới, không nằm trong bộ lọc đóng/mở.
- Chọn nhóm hoặc danh mục lọc ngay trên kết quả khả dụng đã tải, không gọi lại API. Giữ lựa chọn trong URL bằng `kind` và `category`, giữ nguyên ngày thuê khi chuyển nhóm, tải lại trang hoặc xóa bộ lọc.
- Kết quả có hai tầng: loại hàng → danh mục. Tên danh mục trùng nhau được gộp khi hiển thị trong cùng loại hàng, chuẩn hóa Unicode NFKC, khoảng trắng và hoa/thường. Không gộp xuyên Trang phục/Phụ kiện; không sửa ID, loại hàng hoặc dữ liệu kho.
- Mẫu chưa có danh mục vào Trang phục khác / Phụ kiện khác. Chỉ hiển thị danh mục có mẫu đáp ứng kỳ thuê và bộ lọc. Một lựa chọn URL không còn hàng hiển thị trạng thái rỗng và nút xem tất cả danh mục, không tự chuyển sang nhóm khác.
- Bộ lọc bổ sung giữ kích cỡ và giá/ngày. Bỏ hai dropdown loại hàng/danh mục cũ để tránh điều khiển trùng. Giữ date-first, xử lý loading/error, chống phản hồi cũ và CTA mang kỳ thuê sang form.
- Heading theo thứ tự h1 → h2 loại hàng → h3 danh mục → h4 sản phẩm. Nút chọn là button native có `aria-pressed`, focus outline, mục tiêu 48px và wrap nhãn dài theo CSS token customer.

## Kiểm chứng

- 11/11 test `src/pages/RentalCatalogPage.test.tsx` đạt: kỳ thuê, số lượng/giá hiển thị, grouping/Unicode, fallback, URL, local filtering không refetch, đổi nhóm/xóa lọc, empty và stale response.
- TypeScript frontend `--noEmit`, ESLint phạm vi thay đổi, Prettier và `git diff --check` đạt. Vite build 4026 modules thành công; vẫn có cảnh báo Browserslist/circular chunk từ cấu hình hiện có.
- Review độc lập không có finding P0/P1/P2; tất cả CSS token mới được xác định trong design system hiện có.
- API preview chỉ đọc kỳ 22–24/10/2026 trả 21 mẫu: 17 trang phục, 4 phụ kiện. Không sửa backend, seed/reset hoặc ghi dữ liệu demo.
- Computer Use yêu cầu quyền truy cập Chrome nhưng hết thời gian chờ. Chưa xác minh trực tiếp giao diện, bàn phím hoặc responsive bằng browser; không coi CSS review hoặc test jsdom là visual QA.

Preview: http://127.0.0.1:4013/costumes?receiveDate=2026-10-22&returnDate=2026-10-24. Không commit/push trong đợt thay đổi này.

Đã gửi yêu cầu mở preview qua Codex; công cụ trả `queued`, chưa coi trang đã được mở/quan sát. Backend/Mongo preview được bật lại từ cùng dữ liệu local trước khi kiểm API, không chạy launcher seed/reset.
