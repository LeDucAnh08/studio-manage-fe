# QA customer — đợt đầu

Ngày: 2026-10-06. Phạm vi nghiệm thu: **UI00–UI04 và UI15**, theo [plan](../../tasks/plan.md). UI05–UI14 và UI16–UI26 chưa hoàn tất; O01–O10 vẫn có điều kiện.

## Kết quả

Đã thêm tokens/font customer, scope bao cả bước xác thực, một toast adapter, button/fields và giao diện đăng ký khách. Trang đăng ký dùng nền trắng, ink/Rausch và Inter; field cao 56px, control bo 8px, card bo 14px, CTA cao 48px. Giữ validation, payload, chuẩn hoá username, returnTo và chuyển sang login sau thành công.

Không đổi root/dark staff tokens, ThemeProvider/ThemeMode, guards, quyền, API/services hoặc trạng thái nghiệp vụ. So với 162 baseline hashes: **158 giữ nguyên**, 4 file có sẵn thay theo phạm vi: App.tsx, main.tsx, tailwind.config.js, ClientRegisterPage.tsx. Các file customer/font/tests mới được thêm riêng. DESIGN customer/admin và audit giữ nguyên hash.

| Kiểm chứng | Evidence / kết quả |
|---|---|
| Commands trước sửa | [Baseline checks](customer-baseline-checks.md): check, 17 tests và build pass |
| Commands sau sửa | [Foundation checks](customer-foundation-checks.md): toàn bộ 26 tests pass trước sửa CTA/Slot; check, 15 focused tests và build pass trên bản cuối |
| Scope/toast behavior | 6 tests: bước xác thực đúng scope, staff ngoài scope, giữ lựa chọn theme; một container; toast giữ appearance lúc tạo qua navigation; gates/unknown paths không nhận customer toast |
| Controls behavior | 3 tests: giữ refs/value/autocomplete/description; liên kết lỗi thay theo state; disabled Slot child không vượt capture/ARIA/tabIndex; giữ native submit |
| Register regression | 3 tests có sẵn và 3 returnTo tests; giữ payload không gửi roles, chuẩn hoá username, xác nhận mật khẩu và return target |
| Runtime | 13 nhóm assertion Chrome headless pass; xem local `foundation/results.json` |
| Staff appearance | /profile tại 1440px, light/dark: PNG sau sửa **trùng từng byte** với baseline; phạm vi visual parity chỉ gồm màn này |
| Bản build demo | Build với API `/api`, portal/rental bật: pass, 3979 modules, 24.45s. Smoke tại `http://127.0.0.1:4001`: register đúng metrics và account/rentals mở đúng route; chỉ đọc màn hình, không ghi nghiệp vụ |

13 nhóm assertion gồm 6 viewports và 7 nhóm focus/error/native control/pending-toast/staff hai themes/auth loading.

## Runtime đo thực tế

| Kiểm | Kết quả |
|---|---|
| /register dưới html.dark | 320/360/390/744/1128/1440px: canvas trắng, font Inter đã tải, themeMode vẫn dark, không overflow ngang |
| Field | 56px, radius 8px, font 16px, nền trắng; focus border 2px ink #222222, không shadow, giữ chiều cao 56px |
| CTA | 48px, radius 8px, background #ff385c; pending disabled #ffd1da |
| Card đăng ký | radius 14px; max-width 448px là narrow form variant |
| Error |confirm mismatch có aria-invalid và description khớp lỗi, role alert |
| Native CSS fixture | date/time/select 56px; textarea tối thiểu 120px; radius 8px, font 16px, light và không shadow dưới html.dark; ngày/giờ native giữ nguyên |
| Submit/pending |browser mock POST /auth/register: đúng payload, normalize username, không roles; chưa tạo tài khoản demo |
| Success→login | toast customer giữ font/light/radius 14px sau navigate sang login legacy; chỉ một container, giữ themeMode |
| Auth loading |customer scope bao loading trước ClientLayout, nền trắng/font customer; staff outside scope |

Native fixture kiểm stylesheet bằng controls mang customer-control trong browser. Các trang date/time chưa migrate; fixture chưa nghiệm thu picker/handlers của booking/rental. Focus assertion chờ transition 120ms ổn định trước đo.

Runtime phát hiện CTA cao 50px bởi border và review phát hiện child capture/attrs override disabled Slot; đã sửa và kiểm lại. Bản cuối không có assertion failure.

## Font và tokens

Inter variable được self-host từ [website chính thức](https://rsms.me/inter/) tại [font asset gốc](https://rsms.me/inter/font-files/InterVariable.woff2). Metadata: Inter Variable, Version 4.001;git-9221beed3, wght 100–900, opsz 14–32, 352240 bytes.

SHA-256 font: `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3`. Parser WOFF2/cmap kiểm 102 codepoints tiếng Việt (U+1EA0–U+1EF9 và các chữ cái cơ sở tiếng Việt), không thiếu; browser font-face load pass. Metadata local: font-metadata.json.

[OFL.txt](../../src/assets/fonts/OFL.txt) chứa nguyên giấy phép từ [repo Inter v4.1](https://github.com/rsms/inter/blob/v4.1/LICENSE.txt), tải nguyên văn qua CDN khi raw endpoint không phản hồi. SHA-256: `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a`. Không sửa font binary hoặc cài package.

Display line heights giảm khoảng 2% theo ghi chú Inter substitute của DESIGN; badge/rating roles hiện chỉ có token. Success/warning toast dùng neutral ink và giữ type/icon; error dùng #c13515, ghi là bổ sung cho các khoảng trống của DESIGN.

## Disposition audit

| Finding / nhóm | Trạng thái đợt đầu |
|---|---|
| C01/T01 |Partial: tokens/font ở scope có evidence; consumer hardcodes/dark branches còn phải migrate |
| C02/C10 |Scope/auth fallback/toast foundation đã nghiệm thu; login presentation/entry vẫn theo Q2 |
| C07/T04/K01/K03/K05/L03 |Đăng ký khách đã migrate; các consumers khác còn mở |
| K02/K04/K05/R09 |Primitives có contract/evidence; toàn consumer/action area chưa đóng |
| R01 |Breakpoints aliases có; shell/menu/grid chưa migrate |
| Các finding khác và phần ảnh |Open; đợt này không sửa Portfolio/catalog/ảnh/workflow/rental presentation |

48 findings chưa được đóng toàn bộ và giao diện chưa đạt 100% DESIGN. UI05 chờ consumers thực tế cho card/price/status primitives; UI15 chỉ cần button/fields/section nên dependency đổi sang UI03/UI04.

## Evidence local và giới hạn

- Baseline 17 PNG: `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/baseline/`.
- Foundation 13 PNG và results.json: `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/foundation/`. Auth-loading foundation có viewport 1440px; baseline auth-loading 360px.
- Preview source: [đăng ký khách](http://127.0.0.1:4013/register).
- Smoke bản build: `.workflow-tools/customer-ui/demo-smoke.json`. Dùng địa chỉ IPv4 `127.0.0.1:4001`; `localhost:4001` trong môi trường này trả HTML Vite từ một server khác. Không dừng hoặc sửa server đó.
- Chưa chạy full E2E/drop DB, real registration submit hoặc full flag-off browser matrix.
- Chưa kiểm iOS/Android keyboard, native picker popup của OS, zoom 200%, mọi loading/error/success của các trang còn lại. Staff chỉ có visual parity của profile hai theme; source/hash bảo toàn defaults rộng hơn.
- Warnings check/build có sẵn không tăng; không sửa unrelated work hoặc format toàn repo.

Rollback theo diff presentation của 4 file có sẵn và các file customer mới; giữ code/business changes có sẵn. Không git reset hoặc revert cả working tree.
