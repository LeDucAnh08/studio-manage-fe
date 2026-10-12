# Customer auth layout: phương án 2 và kiểm chứng

Ngày 2026-10-08 (Asia/Bangkok). Phạm vi: AUTH01 trong [plan](../../tasks/plan.md) và [todo](../../tasks/todo.md). User chọn **phương án 2 theo thứ tự hai mockup đã hiển thị** cho login/register. Implementation, checks và visual QA đã hoàn tất; [auth QA](customer-auth-layout-qa.md) có `final result: passed`. Tài liệu này tách khỏi evidence lịch sử O01–O04 trong [customer-login-checks.md](customer-login-checks.md).

## Bố cục và nguồn tham chiếu

`CustomerAuthLayout` dùng chung cho customer `/login` và `/register`. Desktop chia story/form theo 53/47: story nền #f7f7f7 chứa logo, copy ngắn và hai ảnh Portfolio thật; form trắng phẳng tối đa 400px ở bên phải. CSS chỉ áp dưới `.customer-ui`. Staff `/staff/login` tiếp tục dùng legacy JSX/theme ngoài scope.

Dưới 744px, layout xếp dọc, logo 40px, headline gọn, ảnh chính cao 144px với `object-position: 50% 25%`; eyebrow/description và ảnh phụ ẩn. Từ 744 đến 1127px, hai vùng padding 32px; desktop dùng padding 48/64px cho story và 48px cho form. Form giữ spacing theo tokens, cuộn dọc tự nhiên khi cần; không có sticky CTA hoặc nhân bản form.

Mockup nguồn: `C:/Users/Admin/.codex/generated_images/01a10f5c-9fa0-7e63-9b54-9b7028d55721/exec-34dd286b-51ea-4eae-86d7-23d5d9bd048d.png`. Reference 1487×1058 được fit tỷ lệ và pad trắng tới 1440×1024 khi lập comparison, không sửa ảnh nguồn. `desktop-comparison.png` đặt source trái/implementation phải; `form-comparison.png` hỗ trợ kiểm vùng form.

DESIGN nguồn ưu tiên trước các kích thước phóng đại của ảnh sinh: Inter, h1 22px, story headline 28px, fields 56px/r8/font16, CTA 48px/r8 và photo radius 14px. Form không có card border/shadow. Ảnh bạn bè giữ tỷ lệ vuông tự nhiên thay vì kéo dài theo mockup. Không thêm font, palette, features hoặc claims về studio từ nội dung sinh.

## Ảnh và preservation

| Ảnh                  | Nguồn hiện có                                                     | Slot / loading                                                            |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Chân dung tốt nghiệp | `src/assets/images/customer-portfolio/tnv00817-640.webp`, 640×960 | Desktop 2:3; mobile crop 144px; eager, fetchpriority high, decoding async |
| Kỷ niệm bạn bè       | `src/assets/images/customer-portfolio/pbi00061-640.webp`, 640×640 | Giữ 1:1, cạnh dưới thẳng với ảnh chính; lazy, ẩn dưới 744px               |

Hai ảnh được lấy từ `portfolioImages`, dùng preview 640 có sẵn, không thêm srcSet candidate hay tải original vào auth layout. `CustomerImage` giữ tỷ lệ slot, clip 14px, placeholder neutral khi đang tải và thông báo fallback khi ảnh lỗi. Ẩn ảnh bằng CSS trên mobile là quy tắc presentation; không suy thành đã chứng minh browser không request ảnh phụ.

Source batch gồm bốn files: `src/components/customer/CustomerAuthLayout.tsx`, `src/pages/LoginPage.tsx`, `src/pages/ClientRegisterPage.tsx`, `src/styles/customer-login.css`. Không sửa auth controller, routing, API, DESIGN hoặc assets. Không thêm dữ liệu ảnh sản phẩm, keyword search hay calendar.

AST token review xác nhận ba form subtrees (customer login, staff login và customer register), cùng các biểu thức/handler liên quan `requestedReturnTo`, `returnTo`, `returnState`, `onSubmit`, giống source trước AUTH01. Giữ credential payload, validation, autocomplete/ref, auth roles, safe return, draft và entry contract O01–O04.

Preservation checker pass: **137/162 baseline files unchanged, 25 expected changed**, không có changed file ngoài danh sách dự kiến; 14 assets gốc gồm 13 Portfolio images và logo giữ nguyên. Số 25 bao gồm các thay đổi có chủ đích từ base/login trước đây, không phải 25 files bị sửa mới ở AUTH01. Shared layout là file mới, nằm ngoài count 162 baseline.

## Checks hiện tại

| Kiểm                               | Kết quả / phạm vi                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Targeted unit                      | **3 files/19 tests PASS**, 91.45s: Login 13, ClientRegister 3, CustomerMedia 3; giữ assertions hành vi hiện có  |
| `npm run check`                    | PASS; ESLint 0 errors/8 baseline warnings, TypeScript và Prettier pass                                          |
| `npm run build`                    | PASS, 4020 modules/39.28s; warnings Browserslist/circular vendor có sẵn                                         |
| Form/source preservation           | PASS theo AST token review và preservation checker ở trên                                                       |
| Register responsive                | 320/744/1128/1440, height 1024: không overflow ngang, một h1, đủ bốn field cao 56px; `responsive-register.json` |
| Staff pixel comparison             | Light 1440×1024 pixel-identical; `visual-comparison.json`                                                       |
| Visual QA và tương tác layout cuối | PASS: source/final capture full-view và focused comparison; links, validation, API error, Tab/focus             |

Full unit 73/73, booking/rental E2E 2/2, browser 35 và staff light/dark 1440×1000 của đợt O01–O04 là evidence lịch sử; không chạy lại toàn suite/E2E trong đợt appearance này. Responsive/light observations hiện tại không được suy thành dark-theme matrix, whole-browser zoom hoặc mobile keyboard thật đã kiểm cho source mới.

## Artifacts và giới hạn

Artifacts ignored tại `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/auth-ideation/`: `desktop-comparison.png`, `form-comparison.png`, `login-{320,744,1128,1440}-verified.png`, `register-{320,744,1128,1440}-verified.png`, `login-mobile.png`, `register-mobile.png`, `register-mobile-errors.png`, `login-keyboard-focus.png`, `login-mobile-api-error.png`, `responsive-login.json`, `responsive-register.json`, `keyboard.json`, `console.json` và `visual-comparison.json`. Captures `*-verified.png` được chụp native sau fresh AX; không dùng fullPage `login-320.png` bị stale compositor. Chi tiết trong customer-auth-layout-qa.md.

Phạm vi hiện tại là Chrome Windows và viewport emulation. Chưa ghi nhận QA mới cho iOS/Android keyboard thật, Safari, whole-browser zoom 200%, password manager hay dark profile. Staff parity hiện tại chỉ screenshot light 1440×1024; không gọi đây là full staff regression. Những giới hạn lịch sử khác vẫn ở [QA-customer.md](QA-customer.md).

Preview local: [login](http://127.0.0.1:4013/login) và [register](http://127.0.0.1:4013/register). Chưa merge/deploy. Rollback riêng presentation batch AUTH01 nếu cần, giữ auth/business changes và assets có sẵn; không reset working tree.
