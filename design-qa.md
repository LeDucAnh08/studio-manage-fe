# Design QA: form thuê riêng, phương án 2

Ngày 20/10/2026, Asia/Bangkok. User chọn ảnh thứ hai của bộ mockup form thuê: **Danh sách gọn**. Phạm vi là presentation của `/rental/start`; giữ các bước kiểm tra hàng, bản nháp, đăng nhập, xem lại và gửi yêu cầu hiện có.

## Findings và lịch sử sửa

Không còn P0/P1/P2 cần xử lý trong phạm vi đã kiểm.

| Mức độ | Vị trí và bằng chứng trước sửa                                                                                                                           | Tác động                                      | Sửa và bằng chứng sau sửa                                                                                                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2     | `desktop-initial-1440.jpg`: viền ô số lượng vẫn bo riêng ở giữa stepper; style `:root.dark` của control ghi đè CSS mới                                   | Nhóm tăng/giảm bị tách thành ba control rời   | Bổ sung selector customer cho trạng thái dark/focus, nối viền và giữ outline bàn phím. `comparison-form.png`, computed input radius `0px`                                                                                         |
| P2     | `desktop-final-1440.jpg` ở lượt trước chỉnh: textarea bị min-height toàn cục đẩy summary xuống dưới viewport; form có nhiều khoảng trống hơn ảnh đã chọn | Tổng tiền và CTA khó thấy khi đã chọn hai món | Scope min-height textarea80px; giảm gap theo token4/8/12/16/24, padding hàng và khoảng đầu trang. Capture cuối `responsive-1440.jpg`/`desktop-final-1440.jpg`: summary kết thúc y1023.45 trong viewport1024, CTA đủ chiều cao48px |

Artifacts trước và sau dùng cùng thư mục QA dưới đây; tên `desktop-final-1440.jpg` được ghi lại sau mỗi lượt. `desktop-initial-1440.jpg` giữ lượt đầu; `responsive-1440.jpg` là lượt cuối dùng cho comparison. Không coi khác biệt chữ raster hay antialiasing là lỗi sản phẩm.

## Visual truth và evidence

- Source gốc: `C:/Users/Admin/.codex/generated_images/01a10f5c-9fa0-7e63-9b54-9b7028d55721/exec-7a607050-60de-4111-881f-25f28c670dec.png`.
- Bản copy nguyên vẹn trong workspace: `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/rental-form-ideation/selected-option-2.png`.
- Artifacts: `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/rental-form-ideation/qa/`.
- Viewport CSS desktop1440×1024, DPR1. Source1487×1058 được chuẩn hóa1440×1024. Screenshot IAB1434×1020 được đặt nguyên kích thước trên canvas1440×1024, thêm nền trắng ở mép6/4px; không kéo giãn implementation. Sai khác mép capture không tính là overflow.
- Implementation: `responsive-1440.jpg`, `desktop-final-1440.jpg`; mobile: `mobile-390.jpg` full page; các viewport khác: `responsive-{320,744,1128}.jpg`.
- Full-view comparison: `comparison-full.png`; focused comparison của items/contact/summary: `comparison-form.png`. Đã mở trực tiếp cả hai ảnh ghép để đối chiếu source và render trên cùng canvas. `compare.py` ghi cách chuẩn hóa/crop.
- State khớp source: khách chưa đăng nhập, kỳ22–24/10/2026, 3 ngày; áo dài trắng sizeM số lượng2,125.000/ngày →750.000; nón lá sizeFREE số lượng2,15.000/ngày →90.000; tổng840.000,4 món. Contact rỗng. Giá và tồn lấy từ API local, không hardcode dữ liệu này vào UI.

## Năm bề mặt fidelity

- **Typography:** font Inter Customer tự host; computed h1 là28px, section22px, body14–16px theo `DESIGN-customer.md`. Raster có heading nặng/lớn hơn; dùng scale và weight của design system là điều chỉnh có chủ đích. Nhãn desktop ẩn bằng kỹ thuật sr-only nhưng vẫn liên kết với control; trên mobile hiện đầy đủ. Tên mẫu giữ native select, không thay bằng text tĩnh.
- **Spacing/layout:** form trắng, container1200 gồm padding32 mỗi bên; nội dung1136px. Kỳ thuê có nền xám nhạt, items theo sáu cột và đường phân cách, contact hai cột desktop, summary tĩnh phía dưới. Không thêm card/shadow bao quanh. Navbar chung88px giữ nguyên so với code đã duyệt; raster khoảng75px. Inputs56px, action48px và radius8 theo design system, khác control nhỏ hơn trong raster. Dưới1128 chuyển item thành hàng xếp, dưới744 contact/footer một cột; mọi phần tiếp tục theo dòng cuộn tự nhiên.
- **Colors/tokens:** canvas trắng, ink#222222, muted#6a6a6a, surface#f7f7f7, đường kẻ theo token; pink#ff385c cho CTA/tổng tiền. Không thêm màu hardcode vào component. Customer giữ theme sáng khi document có class dark.
- **Assets/icons:** giữ logo Yume thật và navbar hiện có. CalendarDays/CirclePlus/Minus/Plus/Trash2 dùng Lucide đã cài; không tạo SVG riêng, ảnh sản phẩm giả hoặc placeholder. Mockup này không đòi hỏi ảnh mới. Font không tải từ dịch vụ ngoài.
- **Copy/content:** đúng h1/intro/contact/action của lựa chọn. Nhãn cột dùng tiếng Việt “Mẫu thuê/Kích cỡ/Giá thuê/ngày/Tiền thuê” thay các từ tương đương trong raster; helper tồn kho ghi rõ “tối đa… cho dòng này” vì còn phải trừ các dòng trùng mẫu/cỡ. Giá hiển thị bằng shared CustomerPrice/ký hiệu₫. Giữ cảnh báo gửi yêu cầu chưa giữ hàng, không thêm tiền cọc hoặc cam kết giữ hàng giả.

## Interactions, responsive và kiểm chứng

- Browser IAB trên preview4013/backend5002: chọn sizeM, tăng số lượng, thêm phụ kiện/sizeFREE, tổng840.000 cập nhật đúng. Date summary chỉ đọc, một backlink giữ URL kỳ thuê. Không có input date, có đúng một main.
- Browser native validation chặn bước xem lại khi contact rỗng và đưa focus tới họ tên. Nhập giá trị kiểm tra để mở bước xem lại, có đúng hai dòng/tổng/ngày; quay về chỉnh sửa và xóa thông tin liên hệ kiểm tra trước bàn giao. Không bấm gửi đơn hoặc tạo bản ghi DB.
- `metrics.json`: viewport320/744/1128/1440 có scrollWidth314/738/1122/1434, không tràn ngang;390 có scrollWidth384. Desktop1128/1440 giữ summary trong khung1024. Mobile dài hơn viewport và cuộn bình thường. Đã mở capture390 và comparison desktop để kiểm nét chữ, labels, vị trí control và CTA.
- Nút icon có tên truy cập riêng; tăng/giảm typebutton,48×56px; numeric input giữ required/min/max/step. Backlink48px, CTA48px. Giữ focus của control và disabled state; không dùng màu làm tín hiệu duy nhất.
- Browser console errors ở lượt cuối: không có. Lần click trong lúc chạy test bị timeout do máy bận; đọc lại state rồi thao tác thành công sau khi test kết thúc.
- **38/38 tests**: DailyRentalPricing21 và CustomerOrders17. Bao gồm giá/ngày không rơi về giá cũ, ngày nhận/trả tính cả hai đầu, thiếu/sai kỳ thuê, phản hồi cũ, availability theo size và dòng trùng, giới hạn tăng/giảm, thêm/xóa dòng, contact/payload, draft/login/paused/retry.
- TypeScript noEmit, ESLint hai file TSX và Prettier đạt. Production Vite build4027 modules đạt; warning Browserslist/circular vendor chunk từ cấu hình hiện có.
- Read-only review cuối không phát hiện P0/P1/P2 mới. CSS chỉ có hiệu lực dưới customer-rental-form; không đổi route/API/controller/admin/staff, không thêm dependency. Unit test vẫn kiểm form inventory staff giữ giá cũ.

## Giới hạn và checklist bàn giao

Chưa kiểm Safari, screen reader, bàn phím thiết bị thật hoặc zoom hệ điều hành; không tuyên bố kiểm tra WCAG đầy đủ. Không chạy E2E tạo đơn/nhận cọc/giữ hàng trên DB demo. Các trạng thái API lỗi, kỳ không hợp lệ, giá chưa cấu hình và paused được kiểm bằng unit, không giả lập network trong browser đợt này.

- [x] Dùng đúng phương án2 theo thứ tự ảnh hiển thị.
- [x] Giữ kỳ thuê và một backlink, không có date input lặp.
- [x] Tổng tiền động, thao tác số lượng và review giữ business contract.
- [x] Đối chiếu full/focused, desktop/mobile và scope customer.
- [x] Checks đạt; contact kiểm tra được xóa; không gửi đơn DB.

final result: passed
