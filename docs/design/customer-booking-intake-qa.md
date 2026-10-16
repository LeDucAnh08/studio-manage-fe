# Design QA: customer booking intake, phương án 3

Hoàn tất ngày 13/10/2026, Asia/Bangkok. BOOK02 triển khai phương án 3 đã chỉnh ngày 12/10: tiến trình ở trên, hồ sơ phẳng, đúng một link quay lại ở đầu trang. Evidence BOOK01 giữ tại [customer-booking-wizard-qa.md](docs/design/customer-booking-wizard-qa.md); auth giữ tại [customer-auth-layout-qa.md](docs/design/customer-auth-layout-qa.md).

## Phạm vi và visual truth

Source được chọn theo thứ tự ảnh đã hiển thị của bộ mockup mới nhất:
C:/Users/Admin/.codex/generated_images/01a10f5c-9fa0-7e63-9b54-9b7028d55721/exec-b0ad70cf-3756-407c-9c22-50345269a912.png.

Route ứng dụng: /account/bookings/:id. Branch mới chỉ chạy khi customer appearance, vai trò khách, booking pending, lifecycle intake và chưa có quote. Admin/staff và các lifecycle khác giữ nhánh hiện có. Loading/error customer dùng section trong main của ClientLayout.

Preview so sánh dùng cùng source frontend tại http://127.0.0.1:4016/account/bookings/000000000000000000000016, với API fixture trong bộ nhớ, không kết nối DB. Dữ liệu khớp mockup: lớp 12A1, gói Thanh xuân Ngoại cảnh, 42 thành viên, gửi 09/10/2026 · 14:30, đề xuất 17/10/2026 · 08:00–16:00 UTC+7. Không thêm giá/cọc, thao tác hủy/đổi lịch hoặc sự kiện studio đã xử lý vào state này.

## Capture và phép đối chiếu

Artifacts: C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/booking-detail-ideation/qa/.

- Source raster 1487×1058. CSS viewport 1487×1058, DPR1; capture native 1481×1054. Không kéo giãn source/render: đặt nguyên ảnh cạnh nhau và bù mép trắng 6×4px. Combined canvas 2974×1058, source trái/render phải.
- Đã mở initial-desktop-comparison.png và final-desktop-comparison.png để đối chiếu cùng state/view; đã mở final-desktop-progress-comparison.png để đọc rõ status, connector, biểu tượng và copy. compare.py giữ ảnh gốc và ghi cách chuẩn hóa.
- final-desktop.png là render sau chỉnh; pending-{320,390,744,1128,1440}.png là 5 captures responsive. Mobile/tablet cao 844px, desktop 1024px, full-page capture để kiểm toàn bộ nội dung. responsive.json ghi số đo DOM.
- Đã mở trực tiếp captures 390/744; reviewer độc lập xem thêm 320/1128 và source/render combined. long-{320,744,1487}.png, missing.png, multiday.png, load-error.png, quote-transition.png lưu các state riêng, không dùng thay so sánh pending.

## Findings và lịch sử sửa

Không còn P0/P1/P2 cần xử lý trong phạm vi đã kiểm.

| Finding ban đầu                                                    | Sửa                                                                           | Evidence sau sửa                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| P2: ảnh crop giữa cắt sát đầu nhân vật bên trái                    | Giữ ảnh Portfolio thật, đổi object-position thành center 10%                  | final-desktop-comparison, pending390/744; ảnh đủ các khuôn mặt |
| P2: nhãn/value metadata thiếu căn cột và phân nhóm                 | Hai nhóm dl; nhãn căn đều, divider lịch/metadata; nhóm stack ở kích thước hẹp | final-desktop-comparison, responsive captures, overflow0       |
| P2: tiến trình và lịch sử thiếu liên kết/phân cách như bố cục chọn | Thêm separator; history một hàng desktop, stack mobile; UTC+7 cùng dòng       | focused progress comparison, final desktop, pending390/744     |

Source có chữ lớn hơn token DESIGN. Implementation chủ động giữ Inter Customer self-hosted và scale 28/22/20/16/14: h1/h2 theo DESIGN-customer.md, giá trị lịch 20/600. Giữ hierarchy/layout của phương án chọn. Đây là điều chỉnh có chủ đích theo design system, không gọi là pixel match. Header/footer dùng ClientLayout hiện có; footer có thể hiện sớm hơn trong viewport vì scale chữ thực nhỏ hơn mockup.

## Năm bề mặt fidelity

| Bề mặt          | Kết quả                                                                                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Font/typography | Inter Customer có tiếng Việt; h1 28/700, h2 22/500, lịch 20/600, body 14–16; wrap nội dung dài, không cắt field                                                                                                                                           |
| Spacing/layout  | White base, soft progress strip, thông tin/ảnh rồi history; rhythm token, không card lồng card hoặc shadow; desktop hai cột, mobile tiến trình/details xếp dọc                                                                                            |
| Color/tokens    | Ink/body/muted/hairline từ customer tokens; Rausch cho marker hiện tại và chấm status, nền pill tint 8%; staff không nhận CSS mới                                                                                                                         |
| Ảnh/assets      | Logo thật từ shell; may01381-640.webp thật qua CustomerImage, crop 640/448, radius14, object-position10%; lazy, async decode, placeholder dùng chung; icon từ thư viện đã cài                                                                             |
| Copy/content    | Dữ liệu API thật khi chạy ứng dụng; timezone VN, giữ ngày kết thúc khác ngày bắt đầu; thiếu thông tin ghi Chưa cập nhật. Bỏ version/mã nội bộ; chỉ một back/refresh. Caption studio đổi thành sẽ kiểm tra và phản hồi vì pending chưa chứng minh đã xử lý |

Timeline dùng event thật, sort mới nhất trước. Riêng thông báo nhận yêu cầu tách tiêu đề đã nhận và phần nội dung còn lại để tránh lặp; không dựng sự kiện tương lai. Trường school/note/reviewNote tùy chọn được giữ khi có dữ liệu.

## Kiểm tra hành vi và responsive

- 320/390/744/1128/1440: overflow ngang0, một main ở intake, một back link, một refresh button, cả hai cao48px. Dữ liệu dài ở320/744/1487 cũng overflow0, giữ2 event và ghi chú.
- Refresh thực sự gọi GET workflow và legacy; counter tăng2→3→4→5→6 qua các state. request-counts.json:9 workflow GET,8 legacy GET (một workflow503 chủ động không gọi legacy), business writes0. Login/refresh auth chỉ là phiên fixture local.
- Missing:6 placeholders, history trống đúng copy, không Invalid Date/undefined/NaN. Multiday giữ17/10 bắt đầu và18/10 kết thúc.
- Quote transition: refresh rời intake view, hiện table báo giá của nhánh cũ. Không click đồng ý báo giá; consent/idempotency được kiểm bằng unit mocks.
- Lỗi tải503 chủ động: alert, một back và một Thử lại; main1. Thử lại phục hồi intake, alert0. Back mở đúng /account/bookings, link từ list trở lại đúng detail.
- Keyboard: Tab từ back sang refresh, Shift+Tab trở lại; outline solid2px, controls48px, top112px desktop, không bị header80px che. keyboard-back.png, interactions.json lưu evidence.
- Browser console error check trước/sau: không có JavaScript error được ghi nhận. API503 là case lỗi chủ động dựng, không coi đó là lỗi ứng dụng chưa sửa.

## Checks và giới hạn

Targeted32 tests pass: CustomerOrders17, NewBooking4, CustomerScope11. Sau chỉnh markup cuối đã chạy lại CustomerOrders17/17 pass. Một test timestamp ban đầu cần scope vùng details để tránh hai time hợp lệ; option exact của Testing Library được bỏ để TypeScript pass.

npm run check pass:0 errors,8 warnings baseline. npm run build pass:4023 modules,1m7s; Browserslist/circular chunk warning từ cấu hình hiện có. Không thêm dependency.

Ứng dụng4013, backend5002 và GET public packages đều200 sau mở lại; dùng đúng Mongo preview data path hiện có, không seed/reset hoặc sửa hồ sơ. QA browser dùng API memory riêng. Không chạy E2E tạo booking, nhận báo giá, đặt cọc hay giao dịch trên DB; Safari, keyboard mobile thật và screen reader thực còn ngoài phạm vi này.

P3 có thể chỉnh tiếp: tỷ lệ/chiều dài connector và hình học icon khác nhẹ raster mock; scale token làm mật độ chữ khác mock. Không còn lỗi ảnh crop, tràn nội dung hoặc điều hướng lặp.

## Checklist bàn giao

- [x] Phương án3 đúng bộ ảnh sửa mới nhất; duy nhất một back link ở đầu.
- [x] Customer intake có dữ liệu/ảnh/tiến trình và các state phụ hoạt động.
- [x] Các gate nghiệp vụ, API, timezone và staff giữ contract.
- [x] So sánh source/render cùng input; P2 đã sửa và có capture sau sửa.
- [x] Responsive, focus, targeted tests, check/build pass; preview giữ chạy local.

final result: passed
