# Thống nhất màn đặt dịch vụ customer

Ngày23/10/2026, Asia/Bangkok. User chọn dùng cùng màn đặt dịch vụ độc lập đang mở từ Trang phục cho tất cả điểm vào.

- Header ở Khám phá dịch vụ, Trang phục và Dịch vụ của tôi đều trỏ `/booking/start?source=...`. Nút trong footer tài khoản và CTA danh sách hiện có cũng dùng cùng đường dẫn.
- `/account/bookings/new` trở thành alias chuyển sang `/booking/start` với `replace`, giữ query/hash/router state. Alias nằm ngoài ClientLayout và ProtectedRoute để khách chưa đăng nhập cũng mở được cùng wizard; gửi yêu cầu vẫn theo kiểm tra tài khoản khách hàng hiện có.
- Giữ nguyên wizard, draft/sessionStorage, nguồn tham khảo, gói đã chọn, validation, returnTo/login và idempotency. Không thêm màn mới hoặc đổi API/quyền admin/staff. Portal tắt vẫn dùng nhánh tư vấn hiện có.
- 41/41 tests đạt: CustomerHeader19, CustomerOrders18, NewBookingPage4. Bao gồm link từ ba khu vực, click footer/CTA và flow draft → đăng nhập → submit/retry.
- TypeScript noEmit, ESLint các file thay đổi, Prettier và diff check đều đạt.
- Browser kiểm guest vào URL cũ có `?source=account&concept=Vintage#review`: chuyển đúng canonical URL, giữ query/hash/context và có một main, không có header account bọc bên ngoài. Bấm nút header từ Trang phục và Portfolio đều tới cùng `.customer-wizard`, tải đủ7 gói thật.
- Backend demo5003/Mongo27029 đã được khởi động lại từ dữ liệu hiện có để kiểm runtime; không seed/reset DB hoặc tạo booking trong lúc kiểm.
- Capture local: `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/booking-entry-2026-10-23/unified-booking.jpg`. Không kiểm authenticated browser submission hay tạo giao dịch; các contract đó được kiểm qua unit regression.
