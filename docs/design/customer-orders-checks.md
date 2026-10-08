# Customer orders — kiểm tra runtime

Ngày kiểm tra: **08/10/2026**. Phạm vi UI17/UI19–UI23: danh sách booking/đơn thuê, workflow booking, chi tiết đơn thuê và tạo yêu cầu thuê. Đối chiếu `frontend/DESIGN-customer.md` và `frontend/docs/design/AUDIT-customer.md`.

Kiểm tra trên source preview `http://127.0.0.1:4013`, Windows Chrome headless, viewport cao 1000px, `html.dark`. Trong đợt này chỉ cập nhật harness/artifacts và tài liệu này; không sửa hoặc format source/tests frontend, không chạy lại unit/build/E2E.

## Kết quả thực chạy

| Đợt | Phạm vi | Checks/measurements đạt | Finding còn lại |
| --- | --- | --- | --- |
| Customer | 5 trang × 5 viewport, thêm consent/stale/extension/preview | 82/82 | 0 |
| States | Empty/error/retry/loading/filter/pagination/catalog ở 320px | 23/23 | 0 |
| Staff | Scope legacy/gates: admin, kế toán, thợ chụp; customer vào route staff | 10/10 | 0 |

Lưu **41 screenshot**, **113 request API được mock**, không request bất ngờ và không `pageerror`. Một POST `quote.accept` được mock trả 409 để kiểm tra stale; không request API nào được chuyển tiếp tới backend hoặc ghi dữ liệu nghiệp vụ. Auth cũng dùng fixture, không cần đăng nhập thật.

Các số 82/23/10 là kiểm tra runtime và measurements trong harness, không phải số unit test. Ba measurements trong customer ghi nhận CTA có nhãn dài tự tăng chiều cao 68px ở 320px; đó là hành vi được giữ để không cắt chữ.

## Customer matrix

Mỗi route dưới đây đã chạy ở **320 / 390 / 744 / 1128 / 1440px**:

| Route | Dữ liệu/states đã kiểm tra |
| --- | --- |
| `/account/bookings` | Tên dài, 3 trạng thái, thông báo, filter và pagination |
| `/account/rentals` | Tên dài, tiền bằng 0 và tiền lớn, pagination |
| `/account/bookings/booking-1` | Quote đã đồng ý; qty/unit/line total/server total, cọc/còn thu/hoàn, lịch sử thanh toán |
| `/account/rentals/rental-1` | Kỳ thuê, size/qty, đơn giá kỳ thuê ban đầu, phí gia hạn đã đồng ý, còn thu/cần hoàn, lịch sử thanh toán |
| `/rental/start?item=costume-1` | Chọn mẫu/size/qty, native date, liên hệ/ghi chú, giá tham khảo lớn |

Kết quả đo: không horizontal overflow; header **80px**, h1 **22px**, input/select/date/time **56px/r8/font16**, textarea tối thiểu 120px, card/surface **r14, không shadow**, CTA thường **48px/r8**, CTA dài tối thiểu 48px và xuống dòng. Controls/surface customer vẫn trắng khi `html.dark`.

Các sửa presentation cuối đã kiểm tra:

- NewRental: gutter mobile **16px**, 744px **24px**, content top **112px** (= header80 + khoảng32); desktop giữ form gọn ở giữa.
- Booking table ≤390px: label/value xếp đầy chiều rộng; tổng **9.876.543.210 ₫** cao 29.39px với line-height29.4px, một dòng, căn trái. Table vẫn được tìm thấy bằng role và giữ 4 header báo giá/5 header thanh toán cùng dữ liệu.
- Badge resource “Đã giữ lịch”: nền **#f7f7f7**, font13; empty booking card **r14**.
- Native date sau khi focus và chờ transition: border **2px #222**, `color-scheme: light`; giữ `type=date`.

Fixture tài chính gồm qty2 × unit4.938.271.605, dòng miễn phí0, server total9.876.543.210, cọc500.000; rental sizeM/qty2/unit100.000 theo **cả kỳ thuê**, phí gia hạn150.000, còn thu0/cần hoàn500.000, reference thanh toán dài không có dấu cách. Không thay công thức giá trong QA.

Tại 320px đã kiểm tra quote chưa đồng ý → POST mock409 → alert, nút đồng ý bật lại, chưa ghi nhận consent; payload vẫn `action=quote.accept`, `expectedVersion=7`. Native extension field và form rental preview → quay lại giữ size/date cũng đạt.

## States và staff

Booking/rental: empty, lỗi500, retry hiện card, loading có screenshot. Booking loading có cả hai nút pagination disabled; rental initial loading chưa hiện pagination vì chưa nhận total. Filter booking gửi **approved/page1 → approved/page2 → pending/page1**; rental gửi page2. Harness chờ response đúng endpoint/query để tránh đọc request trước đó. Catalog thuê empty/error cũng đạt.

Admin (role0), kế toán (role5), thợ chụp (role3) ở 1440px: không `.customer-ui` hay customer order controls/surfaces. Admin/kế toán rental cũng giữ branch legacy. Input tiền của kế toán vẫn **36px/r10/font14**, khớp kết quả baseline07/10; nút “Ghi nhận giao dịch” hiện, không có customer consent. Fixture thợ chụp đã redacted quote/payments nên khối tài chính/consent ẩn. Customer (role6) vào `/workflow-bookings/booking-1` bị chuyển về `/account/bookings`.

## Lặp lại và bằng chứng

Chạy từ repository root khi source preview4013 đang phục vụ đúng bản source và không có edit/HMR:

```powershell
node .workflow-tools/customer-ui/orders-runtime/verify-orders.cjs --phase=customer
node .workflow-tools/customer-ui/orders-runtime/verify-orders.cjs --phase=states
node .workflow-tools/customer-ui/orders-runtime/verify-orders.cjs --phase=staff
```

Harness, JSON và PNG nằm ở `.workflow-tools/customer-ui/orders-runtime/` (ignored, artifacts local; không phải CI suite được commit). JSON cuối: `customer-results.json` (02:37:23 UTC), `states-results.json` (02:38:08 UTC), `staff-results.json` (02:40:06 UTC), ngày08/10. Kết quả07/10 giữ trong `initial-20261007-*-results.json`.

False positives của harness đã được sửa: normalize whitespace quanh inline price; chờ request filter/page mới; chờ focus transition; legacy staff radius lấy đúng baseline **10px**, không suy đoán6px. Không coi các lỗi harness này là lỗi UI.

## Giới hạn

- Empty/error/loading kiểm tra ở320px; các trạng thái item/financial chính có đủ5 viewport. Chỉ Chrome trên Windows, chưa chứng minh browser/device khác.
- Kiểm tra native date bao phủ shell/focus/type; chưa mở và đánh giá native calendar popup theo OS/locale.
- All-API mocks chứng minh frontend render/gates/payload ở các fixture; không chứng minh backend authorization/privacy, transaction/idempotency với DB thật. Các behavior test và E2E nằm trong báo cáo kiểm tra tập trung riêng.
- Staff QA bao phủ roles0/3/5 và customer6; không phải so pixel từng trang staff, không bao phủ roles1/2/4.
- Fixture không có Drive delivery, photos hay timeline events; không dùng kết quả này để kết luận các states ấy đã đạt. Table roles/labels kiểm tra qua Playwright, chưa thay cho kiểm tra screen reader đầy đủ.
