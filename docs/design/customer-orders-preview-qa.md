# Design QA: Đơn của tôi, phương án 3

Ngày 26/10/2026, Asia/Bangkok. Phạm vi `/account/orders`, chọn đơn và xem tiến độ trên dữ liệu thật. Báo cáo form thuê trước đây được giữ tại [customer-rental-form-qa.md](docs/design/customer-rental-form-qa.md).

## Findings và lịch sử sửa

Không còn P0/P1/P2 cần xử lý trong phạm vi đã kiểm.

- P2 — khung nội dung ban đầu dùng giới hạn 1280px của shell, làm cột tiến độ hẹp hơn mockup. Đã scope container của riêng màn này tới 1440px, chỉnh tỷ lệ cột 35% / phần còn lại, gap24 và padding cột chi tiết32. `comparison-final.png` xác nhận hai vùng có tỷ lệ phù hợp, CTA nhìn thấy trong viewport.
- P2 — huy hiệu trạng thái và tên gói tranh chiều rộng ở mobile. Đã xếp huy hiệu dưới tên trong hàng danh sách ở mobile, giới hạn chiều cao danh sách để nhiều đơn không đẩy tiến độ quá xa. Đã mở `mobile-320-final.png` và `mobile-final.png`, không còn nhãn bị ép thành các từ rời.
- Bản chụp full-page `desktop.png` có chiều cao1167, không dùng để kết luận fidelity với viewport1024. Lượt so sánh cuối dùng `desktop-final.png` đúng viewport. Capture mobile/tablet đầu bị ảnh hưởng vị trí cuộn khi đổi viewport; bản cuối đưa trang về scrollY0 trước khi chụp.
- Lỗi HMR tạm thời từng trả mô-đun rỗng sau khi lưu file. Đã làm mới cache theo sự kiện file, tải lại và mở tab mới; trang tải bình thường, console của tab mới không có lỗi. Không thay logic sản phẩm để né lỗi này.

## Visual truth và evidence

- Source được chọn: ảnh thứ ba của bộ mockup Đơn của tôi, `exec-65dd46d3-db63-476b-a2b2-8ba28f52beeb.png`.
- Bản copy trong workspace: `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/orders-ideation/selected-option-3.png`.
- Artifacts: `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/orders-ideation/qa/`.
- Implementation: `desktop-final.png`, `mobile-final.png`, `mobile-320-final.png`, `tablet-final.png`; `notifications.png` kiểm popover.
- Desktop CSS viewport1440×1024, DPR1. Source1487×1058 và raster IAB1434×1020 được fit giữ tỷ lệ vào từng nửa1440×1024 của canvas2880×1024; thêm nền trắng ở mép, không bóp tỷ lệ. Chênh lệch6/4px của capture không được coi là overflow.
- Đã mở trực tiếp ảnh ghép `comparison-final.png` (source trái/render phải) và `comparison-detail-final.png` để kiểm typography, timeline, lịch, badge và CTA. Capture tab mới sau kiểm cuối có cùng layout và trạng thái.
- State khớp source: hai đơn, chọn Thanh xuân Ngoại cảnh của lớp12A6/THPT Việt Đức,37 thành viên; lịch19/11/2026 07:30–15:00 tại Hoàng thành Thăng Long; trạng thái Đã chốt lịch, mốc14/10,22/10,24/10. Đơn còn lại Kỷ yếu Sân trường đã hoàn tất. Ngày lấy từ hồ sơ và sự kiện thực tế, không hardcode vào UI.

## Năm bề mặt fidelity

- Typography: dùng Inter Customer có sẵn, body16px, metadata14px, tên đơn ở danh sách20px, tiêu đề trang32px, tiêu đề preview28px. Tên dài xuống dòng tự nhiên; mobile không cắt tên/trạng thái. Nét raster mockup đậm hơn nhẹ là khác biệt P3, không đổi font toàn sản phẩm.
- Spacing/layout: đúng danh sách trái, đường chia dọc và preview phải trên desktop; một cột trên mobile. Timeline có các mốc hoàn thành và mốc hiện tại, không coi phần bàn giao tương lai là đã xong. Gutter mobile16px; controls/CTA tối thiểu48px, hàng đơn là nút đầy chiều rộng. Footer dùng shell có sẵn, có thể cần cuộn thêm so với mockup để giữ vùng chạm của liên kết.
- Colors: tái sử dụng trắng, ink#222222, muted#6a6a6a, pink#ff385c; tint#fff1f4 cho đơn/mốc đang chọn, trạng thái hoàn tất có nền trung tính. Không đổi palette, không gradient hoặc shadow trang trí.
- Assets: logo Yume và icon thư viện Lucide có sẵn; không cần raster mới. Dùng Check/Bell/Plus/ArrowRight/RefreshCw phù hợp mockup, không dùng ảnh giả hoặc screenshot thay UI.
- Copy/content: bỏ tiêu đề lặp và tab Chụp ảnh đơn lẻ khi thuê tắt. Trạng thái lấy lifecycle, ưu tiên ngày/địa điểm của lịch đã xác nhận. Báo giá, hủy và hoàn tất có câu hướng dẫn tương ứng; không thêm bước chọn trang phục hoặc thao tác thanh toán vào preview.

## Chức năng và kiểm tra

- Browser thật: chọn hai đơn, lọc Hoàn tất, mở/đóng thông báo bằng Escape, mở hồ sơ đầy đủ, Back và liên kết quay lại giữ ngữ cảnh. Trạng thái lựa chọn, bộ lọc và trang nằm trên query; đổi tab vẫn reset ngữ cảnh của tab mới.
- Đã kiểm scrollWidth không vượt innerWidth tại320/390/744/1440. Đã mở ảnh mobile320/390 và tablet; giao diện xếp dọc ở mobile, nút mở hồ sơ đầy chiều rộng. Viewport tạm đã reset.
- Console tab bàn giao tải mới: không có lỗi. Không tạo booking, thanh toán, giữ kho hay đánh dấu thông báo đã đọc trên database ứng dụng trong QA.
- 37 frontend tests liên quan đạt; sau thay đổi lưu ngữ cảnh, chạy lại28 tests orders/detail. Bao gồm phản hồi đến muộn không ghi đè đơn khác, retry độc lập, lọc/phân trang, lỗi và đơn bị hủy/từ chối, thông báo và điều hướng tab.
- Kiểm thử MongoDB riêng `studio_customer_order_views_test` đạt:25 đơn của một khách, lọc trước phân trang20 dòng, trang2, hồ sơ cũ chưa có workflow,401/400 và cách ly chủ sở hữu. Chỉ database test được dọn.
- TypeScript frontend/backend, ESLint các file TS/TSX liên quan, Prettier và diff whitespace đạt.

## Giới hạn và checklist

- Browser QA dùng Chromium/IAB trên Windows; chưa kiểm Safari, trình đọc màn hình hoặc điện thoại vật lý. Lỗi/empty/loading và thao tác đánh dấu đọc được kiểm bằng unit; không sửa network thật hoặc thông báo của tài khoản để tạo các trạng thái đó.
- API bổ sung `view` và metadata cho summary, giữ quyền truy cập hiện có; schema, giá, nguồn lực và quy trình tài chính không đổi. Rental tiếp tục dùng giao diện và cờ tính năng hiện có.
- P3 có chủ đích: notification ở cụm hành động của trang để không thay header dùng chung; footer và cỡ chữ một số nhãn theo component có sẵn. Không có control quan trọng bị cắt/che.
- [x] Dùng đúng ảnh thứ ba theo thứ tự đã hiển thị.
- [x] So sánh toàn màn và vùng chi tiết trên cùng canvas.
- [x] Mọi thao tác chính dùng dữ liệu/API hiện có.
- [x] Đã kiểm desktop/mobile và giữ ngữ cảnh khi quay lại.

final result: passed
