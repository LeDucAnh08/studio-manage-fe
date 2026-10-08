# Baseline trước refactor UI customer

Ngày: 2026-10-06, Asia/Bangkok. Source snapshot có **162 file** trong [manifest hashes](customer-baseline-hashes.json). Working tree có nhiều thay đổi sẵn; không reset hoặc format lại công việc ấy.

[Command checks](customer-baseline-checks.md): check và 17 unit tests pass; build pass trước sửa source. Esbuild/Vitest/Vite bị giới hạn sandbox ở lần đầu; cùng source chạy ngoài sandbox đạt.

## UI evidence trước sửa

Chụp Chrome headless từ **source Vite tại 127.0.0.1:4013**, API proxy /api tới demo local 5002. Portal/rental bật như demo hiện có; các tài khoản demo chỉ đăng nhập và đọc màn hình. Capture hoàn tất trước foundation edits. Không tạo booking/rental/payment hoặc tài khoản bằng các form demo.

17 PNG nằm tại `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/baseline/`; index.json ghi route/theme/viewport. Các file này là evidence local, thuộc thư mục git-ignore.

| Nhóm | Routes / state | Viewport và theme |
|---|---|---|
| Đăng ký | /register; normal và confirm mismatch | 1440 light/dark; 320 dark/error |
| Khám phá | /portfolio, /costumes | Portfolio1440 light/360 dark; catalog360 dark |
| Form lỗi | /member-intake/baseline-invalid-token, /feedback thiếu context | 360 dark |
| Account | /account/bookings, /account/profile, /account/rentals | List1440 dark; profile360 dark |
| Staff | /profile và dashboard / | Profile1440 light/dark; dashboard1440 dark |
| Empty | /account/bookings | 360 dark, mock GET /api/bookings trả data[] và pagination.total=0 |
| Auth loading | /account/bookings trước khi refresh hoàn tất | 360 dark, delay refresh3s trên browser |

Empty/loading là fixtures phía browser, không sửa data demo. Hai trạng thái này có state-fixtures.json; các baseline khác đọc dữ liệu demo có sẵn.

## Giới hạn

Đây là baseline đại diện cho slice đầu, không phải mọi trạng thái của 14 trang đã render. Các trang workflow/rental detail và token hợp lệ của intake/student/feedback phải có capture riêng ngay trước batch tương ứng; chưa nghiệm thu luồng submit của chúng.

Flag-off chưa có browser matrix; baseline ghi flag-on hiện tại, tests scope/toast kiểm classifier khi flags off. Chưa đo LCP, contrast toàn site, native picker của OS, mobile keyboard/safe-area hoặc visual regression toàn customer.

Chỉ dùng baseline để so trước-sau; không đánh dấu finding đóng chỉ bằng việc có ảnh.


## Đối chiếu sau base — 2026-10-08

Baseline trên là capture lịch sử trước foundation, không được bổ sung retroactively thành mọi state trước sửa. Sau base, 143/162 file giữ hash và19existing files thay customer presentation đúng phạm vi; 13original Portfolio+logo giữ nguyên. Profile staff1440light/dark PNG vẫn trùng từng byte. Các shared branches khác kiểm defaults/gates/source preservation và journeys, không có full pixel baseline. Full47unit/4E2E/check/build đạt; [QA-customer.md](QA-customer.md) ghi evidence cùng các giới hạn, rollback và48dispositions. Bảng baseline17PNG vẫn giữ nguyên.
