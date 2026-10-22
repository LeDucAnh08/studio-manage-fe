# Lối vào thuê riêng — 20/10/2026

Khách phản ánh danh mục dẫn vào đặt dịch vụ chụp. Kiểm tra trực tiếp preview 4013 cho thấy tính năng thuê đang bật và CTA sản phẩm đã mở được `/rental/start`; chưa tái hiện được việc CTA đó chuyển sang chụp ảnh. Header vẫn ghi “Đặt lịch” và dẫn vào chụp ảnh, trong khi nhánh cờ thuê tắt của thẻ sản phẩm thực sự chuyển sang `/booking/start`.

## Thay đổi

- Header ghi rõ “Đặt lịch chụp” trên mọi trang customer; giữ thứ tự và nội dung các mục điều hướng, không thay navbar theo ngữ cảnh.
- Ngay dưới kỳ thuê hợp lệ, thêm “Tạo yêu cầu thuê riêng”, giữ ngày nhận/trả và mở thẳng form thuê không cần gói chụp. Chỉ hiển thị sau khi tải được hàng khả dụng.
- Thẻ sản phẩm ghi “Thuê riêng mẫu này”, giữ ID sản phẩm và kỳ thuê.
- Sau phản hồi tiếp theo của khách, cả “Liên hệ thuê riêng” và “Thuê riêng mẫu này” đều mở `/rental/start`, giữ ID sản phẩm và kỳ thuê. Form nhập thông tin là route công khai; không dẫn sang Portfolio. Khi nhận đơn trực tuyến tạm tắt, vẫn cho điền/lưu/xem lại nhưng không gửi API hoặc chuyển đăng nhập; các gate tài khoản và giao dịch giữ nguyên.
- Không sửa API, auth, tồn kho, giá, booking hay thanh toán.
- Form lấy focus ở tiêu đề khi mở, để khách không tiếp tục ở vị trí cuộn cuối danh mục hoặc footer sau khi bấm một thẻ sản phẩm phía dưới.
- Theo yêu cầu giữ kỳ thuê: form chỉ hiển thị ngày nhận, ngày trả và số ngày tính phí; không còn ô nhập ngày. Dùng liên kết duy nhất ở đầu trang để đổi thời gian hoặc chọn mẫu trong danh mục. URL ngày mới được ưu tiên theo cặp thay cho kỳ cũ trong bản nháp; nếu thiếu/sai ngày thì quay về danh mục để chọn, không ghép một ngày mới với một ngày cũ.

## Kiểm chứng

- 12 kiểm thử danh mục đạt: ngày trước hàng, bộ lọc/nhóm hàng/URL, giá, stale response, CTA thuê riêng và nhánh tắt tính năng.
- 15 kiểm thử daily rental đạt: tạo yêu cầu chỉ có liên hệ/ngày/sản phẩm, tính tiền theo ngày, bản nháp, đường quay về qua đăng nhập và hai trường hợp guest/client vẫn nhập được khi tạm ngừng nhận đơn; giữ hành vi đơn cũ.
- 17 kiểm thử CustomerOrders và 13 kiểm thử CustomerScope đạt. Đợt sửa nút liên hệ có tổng 57 kiểm thử đạt; TypeScript, ESLint và Prettier đạt. Các kiểm thử login 13 và header 18 đã đạt ở đợt trước.
- Browser tại 4013: CTA sản phẩm mở đúng form thuê riêng, chọn sẵn áo dài trắng truyền thống, giữ kỳ 22–24/10, hiển thị 3 ngày và 300.000đ. CTA mới dưới kỳ thuê cũng mở form riêng. Chưa gửi một đơn mới vào DB demo qua browser.
- Kiểm tra bổ sung trên preview tạm 4015 với tính năng gửi đơn tắt: bấm đúng “Liên hệ thuê riêng” mở form với áo dài hồng phấn, ngày 22–24/10, giá 115.000đ/ngày, dự kiến 345.000đ; có trường người liên hệ, điện thoại và ghi chú. Không chuyển sang Portfolio. Đã lưu ảnh `rental-contact-form-off-2026-10-20.jpg` tại thư mục evidence bên dưới và dừng preview tạm sau kiểm tra.
- API catalog qua 4013 và 5002 trả HTTP 200, đủ 21 mẫu. `/api/rentals` chưa đăng nhập trả 401 đúng yêu cầu bảo vệ.
- Trong quá trình kiểm tra, Mongo demo dừng do hết bộ nhớ và API mất kết nối. Đã khởi chạy lại Mongo với nguyên thư mục dữ liệu, replica set và cấu hình cache cũ; khởi chạy lại API. Không reset/reseed; 21 giá/ngày vẫn còn. Kiểm thử chạy một worker để giảm bộ nhớ.
- Ảnh màn hình thực tế: `.workflow-tools/customer-ui/standalone-rental-entry-2026-10-20.jpg` tại repository gốc, git-ignore. Chưa kiểm đầy đủ các breakpoint, Safari hoặc giao dịch thật trong hạng mục này.
- Đợt giữ kỳ thuê: 20 kiểm thử DailyRentalPricing và 17 CustomerOrders đạt (37/37), TypeScript/ESLint/Prettier/diff check đạt. Kiểm tra kỳ từ URL, URL thiếu/sai ngày không dùng lẫn bản nháp, đổi kỳ từ danh mục kiểm tra tồn lại, bỏ qua phản hồi cũ, giữ ngày qua đăng nhập và payload tạo đơn/retry. Preview 4013 trả HTTP 200 cho API health và module form mới; chưa chụp thêm ảnh browser cho phần summary kỳ thuê.
