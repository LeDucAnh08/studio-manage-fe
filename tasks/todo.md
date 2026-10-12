# Checklist refactor UI customer

Ngày lập: 2026-10-06. Cập nhật: 2026-10-08. Plan: [plan.md](plan.md). Nguồn: [DESIGN](../DESIGN-customer.md), [audit](../docs/design/AUDIT-customer.md).

Mã task `UI00–UI26` tách biệt với finding `C/T/K/L/R` của audit; `O01–O10` là modules có điều kiện.

Ngày 08/10, user chọn **phương án 2 theo thứ tự mockup hiển thị** cho login/register. Đợt appearance này là `AUTH01`: đã triển khai và qua targeted unit/check/build/preservation; visual QA cuối đã pass. Full suite/E2E/browser35 của O01–O04 bên dưới là evidence lịch sử trước layout mới. Xem [customer-auth-layout-checks.md](../docs/design/customer-auth-layout-checks.md).

**Phần cơ sở UI00–UI26 và phần login O01–O04 đã triển khai và nghiệm thu trong phạm vi Chrome local.** Đợt cơ sở ngày 08/10 đạt 47 unit tests/4 E2E, TypeScript/ESLint/Prettier/build; 8 lint warnings có sẵn. Customer orders82/states23/staff10, forms32, Portfolio18 và image states3 đạt; network ảnh có 6 cases. User yêu cầu refactor login ngày 08/10; `/login` customer và `/staff/login` legacy là implementation default đã thông báo. Đợt login đạt full unit 73/73, booking/rental E2E 2/2, browser35 và check/build cuối. Đây là 27 tasks base và 4 tasks login riêng, không đổi cách đánh số base. Q1/Q3 và O05–O10 còn mở. Evidence mới của login tách khỏi các số lịch sử ở [customer-login-checks.md](../docs/design/customer-login-checks.md). Giới hạn OS/browser zoom, staff pixel parity và các gaps DESIGN nằm trong [QA-customer.md](../docs/design/QA-customer.md); không suy base hoàn tất thành toàn DESIGN đạt 100%. File paths bên dưới tính từ gốc frontend; các file dự kiến được đối chiếu với implementation thực tế trong QA.

Size S: khoảng 1–2 source files; M:3–5 files; task evidence không đếm screenshot batches vào source implementation. Nếu số file hoặc effort vượt một phiên focused, chia task trước khi làm. UI25 ghi rõ từng batch ≤5 file; các module có điều kiện chỉ mở theo decision.

Verification codes/commands/prerequisites nằm ở [plan.md — Verification](plan.md#6-verification-và-prerequisites). Lặp checks khi có thay đổi mới/failure/concern; không rerun toàn suite sau mọi utility edit.

## Giai đoạn 0: Baseline

### UI00: Ghi baseline UI và nghiệp vụ

- [x] UI00 hoàn tất acceptance và verification

**Mục đích:** Ghi trạng thái working tree, kết quả kiểm tra ban đầu và ảnh trước refactor theo từng nhóm trang. Tách lỗi có sẵn khỏi lỗi phát sinh trong đợt UI.

**Nghiệm thu:**

- [x] Có baseline customer và các màn shared staff đại diện ở light/dark, gồm loading/error/empty.
- [x] Ghi check/test/build hiện tại và trạng thái feature gates; chưa đánh dấu pass nếu chưa chạy.
- [x] Mỗi nhóm ảnh baseline chụp theo batch nhỏ; không thay source hoặc reset thay đổi có sẵn.

**Verification:** V0; dùng dữ liệu local/test hợp lệ cho intake/student/feedback. Lưu evidence theo route, viewport và state.

**Phụ thuộc:** Không. **Rủi ro:** Thấp. **Scope:** S.

**Files evidence:** `docs/design/customer-baseline.md`; `docs/design/customer-baseline-checks.md`; `docs/design/customer-baseline-hashes.json`.

**Audit:** Evidence/quality gate; không đóng finding bằng lập tài liệu.

**Evidence đợt đầu:** [QA-customer.md](../docs/design/QA-customer.md) và [checks](../docs/design/customer-foundation-checks.md); baseline riêng cho UI00. Chỉ tick các criteria của task này, không suy toàn customer đã đạt DESIGN.

**Checkpoint giai đoạn 0:**

- [x] Evidence và acceptance của các task phía trên được kiểm; staff/customer đúng phạm vi
- [x] Các checks liên quan thực sự hoàn tất; failure có sẵn/thiếu prerequisite được ghi rõ
- [x] Không thay business contract, assets gốc hoặc working tree ngoài batch

## Giai đoạn 1: Nền tảng customer

### UI01: Thêm token và font customer

- [x] UI01 hoàn tất acceptance và verification

**Mục đích:** Tạo palette, typography, spacing, radius và elevation riêng cho customer; Inter là mặc định đề xuất của plan. Tải font từ nguồn có giấy phép và hỗ trợ tiếng Việt khi triển khai.

**Nghiệm thu:**

- [x] Có primary/active/disabled/error, ink/body/muted/canvas/hairline theo DESIGN; type scale và radius 8/14 tách role.
- [x] CSS/font chỉ áp dưới customer scope; giữ :root/.dark/default font và screens staff.
- [x] Breakpoints customer 744/1128/1440 thêm alias, không đổi sm/md/lg/xl; source font và giấy phép được ghi nhận.

**Verification:** V1; computed styles trên scope thử và staff, font tiếng Việt, staff light/dark; chưa migrate hàng loạt.

**Phụ thuộc:** UI00. **Rủi ro:** Thấp. **Scope:** M.

**File dự kiến:** `src/styles/customer.css`; `tailwind.config.js`; `src/main.tsx`; `src/assets/fonts/inter-vietnamese-variable.woff2`; `src/assets/fonts/OFL.txt`.

**Audit:** C01, T01, L02, L04, L05, R01.

**Evidence đợt đầu:** [QA-customer.md](../docs/design/QA-customer.md) và [checks](../docs/design/customer-foundation-checks.md); baseline riêng cho UI00. Chỉ tick các criteria của task này, không suy toàn customer đã đạt DESIGN.

### UI02: Đặt scope ở route và toast

- [x] UI02 hoàn tất acceptance và verification

**Mục đích:** Bao customer routes và auth fallback bằng appearance context ở route boundary. Giữ một ToastContainer, chọn presentation theo surface; không thay logic auth.

**Nghiệm thu:**

- [x] CustomerScope bao cả ProtectedRoute của /account; public, standalone forms và route sau gate được phân loại rõ.
- [x] Tokens và auth fallback trong scope thử vẫn sáng khi html.dark; quay lại staff giữ themeMode; scope không tạo shell/main lồng. Các consumer cũ được nghiệm thu light sau task migrate tương ứng.
- [x] Toast customer đúng palette; toast staff giữ defaults, không nhân đôi container và xác định appearance khi toast sống qua navigation.

**Verification:** V1 + auth loading/direct refresh/feature-gate matrix; kiểm tra chuyển customer↔staff khi có toast đang hiển thị.

**Phụ thuộc:** UI01. **Rủi ro:** Vừa. **Scope:** M.

**Files thực tế:** `src/components/customer/CustomerScope.tsx`; `src/components/customer/CustomerAppearance.ts`; `src/components/customer/CustomerToastContainer.tsx`; `src/App.tsx`; `src/styles/customer.css`.

**Audit:** C02, C10.

**Evidence đợt đầu:** [QA-customer.md](../docs/design/QA-customer.md) và [checks](../docs/design/customer-foundation-checks.md); baseline riêng cho UI00. Chỉ tick các criteria của task này, không suy toàn customer đã đạt DESIGN.

**Tasklet UI02-test — đã hoàn tất:** `src/components/customer/CustomerScope.test.tsx` (một file riêng). Kiểm guard bootstrap customer/staff, giữ theme, một toast container và appearance qua navigation/gates; 6/6 tests pass. Giữ UI02 source batch ở ≤5 file.

### UI03: Chuẩn hoá nút customer

- [x] UI03 hoàn tất acceptance và verification

**Mục đích:** Tạo adapter nút/Link cùng contract presentation, reuse behavior primitive hiện có khi không mang theo style cũ.

**Nghiệm thu:**

- [x] Primary 48px/radius 8/label 16-500, active/disabled đúng DESIGN; secondary trắng viền ink, text variant rõ.
- [x] Giữ refs/asChild/type/disabled/pending; padding không che giấu h 9 hoặc opacity 50 từ legacy.
- [x] Focus rõ; press không translate hoặc đổi shadow; pill là variant có mục đích.

**Verification:** V2 states + Tab/Enter/Space, Link và button; staff Button default giữ nguyên. Chỉ thêm test behavior nếu có logic mới.

**Phụ thuộc:** UI02. **Rủi ro:** Thấp. **Scope:** S.

**File dự kiến:** `src/components/customer/CustomerButton.tsx`; `src/styles/customer.css`; `src/components/customer/CustomerControls.test.tsx` (behavior test).

**Audit:** K01, K02, R09.

**Evidence đợt đầu:** [QA-customer.md](../docs/design/QA-customer.md) và [checks](../docs/design/customer-foundation-checks.md); baseline riêng cho UI00. Chỉ tick các criteria của task này, không suy toàn customer đã đạt DESIGN.

### UI04: Chuẩn hoá field customer

- [x] UI04 hoàn tất acceptance và verification

**Mục đích:** Thống nhất Input, Textarea, native Select, label/helper/error và vỏ date/time. Giữ native lịch trong phạm vi cơ sở.

**Nghiệm thu:**

- [x] Input/select/date/time 56px/radius 8/font 16; white/hairline, focus 2px ink; textarea dùng chiều cao nội dung có chủ đích.
- [x] Label 14-500 muted, helper 13/14 và error #c13515; htmlFor/ref/required/aria-invalid được bảo toàn.
- [x] CSS global date/select và html.dark không thắng field khách; dữ liệu native date/time, autocomplete và validation không đổi.

**Verification:** V2 normal/focus/disabled/error/native date/time dưới html.dark; field lengths tiếng Việt. Chưa đổi calendar picker.

**Phụ thuộc:** UI02. **Rủi ro:** Vừa. **Scope:** M.

**File dự kiến:** `src/components/customer/CustomerFields.tsx`; `src/styles/customer.css`; `src/components/customer/CustomerControls.test.tsx` (refs/ARIA).

**Audit:** C07, T06, K03, K04, K05.

**Evidence đợt đầu:** [QA-customer.md](../docs/design/QA-customer.md) và [checks](../docs/design/customer-foundation-checks.md); baseline riêng cho UI00. Chỉ tick các criteria của task này, không suy toàn customer đã đạt DESIGN.

### UI05: Chuẩn hoá card, status và giá

- [x] UI05 hoàn tất acceptance và verification

**Mục đích:** Thêm primitives thực sự dùng cho section/card/header, status và price roles. Presentation nhận số có sẵn, không tính lại phí.

**Nghiệm thu:**

- [x] Card 14px, padding 16 hoặc 24, surface phẳng hoặc một shadow đúng role; title/section/caption có roles.
- [x] Price amount/unit/estimate/total rõ, format vi-VN nhất quán; không gộp công thức booking và rental.
- [x] Status giữ nhãn/icon trạng thái; mặc định neutral theo palette, error riêng; loading/missing/error bổ sung được ghi là extension của DESIGN.

**Verification:** V2 + V3 số 0/số lớn/unit và statuses dài; không unit-snapshot riêng cho từng class.

**Phụ thuộc:** UI03, UI04. **Rủi ro:** Thấp. **Scope:** M.

**File dự kiến:** `src/components/customer/CustomerSurface.tsx`; `src/components/customer/CustomerPrice.tsx`; `src/components/customer/CustomerStatusBadge.tsx`; `src/styles/customer.css`.

**Audit:** C06, T05, T07, K10, K11, K16, L04, L05.

**Checkpoint giai đoạn 1:**

- [x] Evidence và acceptance của các task phía trên được kiểm; staff/customer đúng phạm vi
- [x] Các checks liên quan thực sự hoàn tất; failure có sẵn/thiếu prerequisite được ghi rõ
- [x] Không thay business contract, assets gốc hoặc working tree ngoài batch

## Giai đoạn 2: Shell và điều hướng

### UI06: Chuẩn hoá public shell desktop

- [x] UI06 hoàn tất acceptance và verification

**Mục đích:** Áp header/container/footer target cho public routes; Logo chỉ thêm opt-in customer appearance nếu cần, default staff giữ nguyên.

**Nghiệm thu:**

- [x] Header 80px, nav 16-600/active ink; editorial 1280/list 1440/detail 1080 theo variant, gutter theo token.
- [x] Footer full ba nhóm nội dung Yume có route thật, legal 13px; có minimal variant cho flow nhập liệu.
- [x] Public không đổi themeMode; logo contain/dimensions giữ nguyên, CTA nguồn/source/query và account destinations theo hợp đồng hiện có.

**Verification:** V4 desktop/tablet links, anchors, feature gates, staff logo light/dark. Đợt base giữ login links; contract login bổ sung được kiểm ở O01–O04.

**Phụ thuộc:** UI03, UI05. **Rủi ro:** Vừa. **Scope:** M.

**File dự kiến:** `src/components/Layout/PublicSiteLayout.tsx`; `src/components/customer/CustomerContainer.tsx`; `src/components/customer/CustomerFooter.tsx`; `src/components/atoms/Logo.tsx`; `src/styles/customer.css`.

**Audit:** K13, K14, L03.

### UI07: Chuẩn hoá account shell

- [x] UI07 hoàn tất acceptance và verification

**Mục đích:** Đồng bộ account container/header/nav/footer minimal, giữ routes và hành vi tài khoản.

**Nghiệm thu:**

- [x] Mọi NavLink có active contract, header và container theo role, footer minimal có chủ đích.
- [x] Tên user dài, logout, booking/rental gate và link alias hoạt động như trước.
- [x] Account dùng scope từ route, không đặt theme global hoặc sửa role checks.

**Verification:** V4 client direct refresh, logout, tên dài và portal/rental flags; staff Layout không đổi.

**Phụ thuộc:** UI06. **Rủi ro:** Vừa. **Scope:** S.

**File dự kiến:** `src/components/Layout/ClientLayout.tsx`; `src/components/customer/CustomerFooter.tsx`; `src/styles/customer.css`.

**Audit:** K13, K14, L03.

### UI08: Menu mobile customer

- [x] UI08 hoàn tất acceptance và verification

**Mục đích:** Thêm menu sheet dùng Radix behavior hiện có, chỉ cho public/account customer; giải quyết portal inheritance khi overlay xuất hiện lần đầu.

**Nghiệm thu:**

- [x] Dưới 744 dùng logo/menu, tablet 744–1127 và desktop 1128 có nav contract rõ; không giữ chip scroll làm nav chính.
- [x] Sheet có customer tokens/scrim 50%, focus trap/Escape/focus return/scroll lock; portal không lấy .dark staff.
- [x] Mọi link/menu/CTA có vùng chạm, tên dài không clip tại 320; đóng sheet khi điều hướng.

**Verification:** V4 + viewport boundary matrix; test focus/menu behavior nếu mới, staff dialog/nav default giữ nguyên.

**Phụ thuộc:** UI06, UI07. **Rủi ro:** Vừa. **Scope:** M.

**File dự kiến:** `src/components/customer/CustomerMobileMenu.tsx`; `src/components/Layout/PublicSiteLayout.tsx`; `src/components/Layout/ClientLayout.tsx`; `src/components/customer/CustomerScope.tsx`; `src/styles/customer.css`.

**Audit:** R01, R02, R08, R09.

**Tasklet UI08-test (chỉ khi menu thêm behavior cần test):** phụ thuộc UI08; tối đa 1 file `src/components/customer/CustomerMobileMenu.test.tsx`. Kiểm keyboard/focus return, close-on-navigation và không rò appearance; verification V4 + targeted unit. Đếm test trong batch riêng, không thêm file thứ 6 vào UI08. Nếu chỉ reuse Radix behavior và manual V4 đủ thì ghi evidence thay vì viết test phản chiếu primitive.

**Checkpoint giai đoạn 2:**

- [x] Evidence và acceptance của các task phía trên được kiểm; staff/customer đúng phạm vi
- [x] Các checks liên quan thực sự hoàn tất; failure có sẵn/thiếu prerequisite được ghi rõ
- [x] Không thay business contract, assets gốc hoặc working tree ngoài batch

## Giai đoạn 3: Khám phá và form công khai

### UI09: Portfolio hero và các section tĩnh

- [x] UI09 hoàn tất acceptance và verification

**Mục đích:** Chuyển hero, about copy, services/process/reviews sang color/type/band/spacing customer. Ảnh và rating form ở task sau.

**Nghiệm thu:**

- [x] Hero 28px theo role, section 22/21/20, title 16; body 16/14 và captions đúng scale.
- [x] Gradient/glow editorial, weight 800, shadow tiers và khoảng 80/112px được thay bằng palette/elevation/section 64.
- [x] Giữ copy/anchors/concept context và CTA destinations; không đổi dữ liệu hay submit.

**Verification:** V3 visual desktop/mobile trước-sau cho sections; anchors /services,/pricing,/concepts,/consultation vẫn đúng.

**Phụ thuộc:** UI06. **Rủi ro:** Thấp. **Scope:** S.

**File dự kiến:** `src/pages/PortfolioPage.tsx`; `src/styles/customer.css`.

**Audit:** C03, C05, T02, T07, L01, L02, L04.

### UI10: Card gói ở khám phá và chọn gói

- [x] UI10 hoàn tất acceptance và verification

**Mục đích:** Hợp nhất presentation gói marketing/select và phần so sánh, giữ controller/draft của wizard.

**Nghiệm thu:**

- [x] Tên/price/meta/radius/padding thống nhất; featured/selected là state rõ, không gradient/scale/shadow 2xl.
- [x] So sánh tối đa 3, lựa chọn/gỡ/sửa giữ nguyên; service card có grid riêng được ghi rõ.
- [x] Price/unit theo người và estimate giữ nguồn số và nhãn, không làm thành báo giá cố định.

**Verification:** V3 + V-booking-unit; test existing package compare và draft unchanged.

**Phụ thuộc:** UI05, UI09. **Rủi ro:** Vừa. **Scope:** M.

**File dự kiến:** `src/components/customer/CustomerPackageCard.tsx`; `src/pages/PortfolioPage.tsx`; `src/pages/BookingWizardPage.tsx`; `src/pages/NewBookingPage.test.tsx`.

**Audit:** T05, K08, K10, L05, R03.

### UI11: Feedback inline và contact Portfolio

- [x] UI11 hoàn tất acceptance và verification

**Mục đích:** Dùng field/button/rating customer cho mini feedback và contact band; giữ submit semantics của flow inline.

**Nghiệm thu:**

- [x] Rating ink và visible focus/vùng chạm; không dùng glyph 30px làm toàn vùng click.
- [x] Field/error/helper/CTA theo contract, contact trắng/soft và nội dung/link giữ nguyên.
- [x] Loading/success/retry/disabled của feedback được giữ, rating value/onChange không đổi.

**Verification:** V2 + V-forms; submit một lần trên local fixture, errors/success, Tab và mobile labels.

**Phụ thuộc:** UI03, UI04, UI09. **Rủi ro:** Vừa. **Scope:** S.

**File dự kiến:** `src/components/customer/CustomerRatingInput.tsx`; `src/pages/PortfolioPage.tsx`; `src/styles/customer.css`.

**Audit:** C03, C07, C09, K03, K05, K15, R09.

### UI12: Catalog và bộ lọc hiện có

- [x] UI12 hoàn tất acceptance và verification

**Mục đích:** Chuẩn hoá card/filter/price/skeleton/empty của catalog với data hiện tại, chưa thêm search backend hoặc ảnh giả cho từng món.

**Nghiệm thu:**

- [x] Filters loại/danh mục/size/giá giữ query và submit/reset; controls/buttons đúng 56/48.
- [x] Card/grid 1-2-4 theo 744/1128, photo slot 1:1/radius 14 nhưng minh hoạ nhóm hàng được ghi đúng khi chưa có ảnh.
- [x] Title/price/status neutral, skeleton tương ứng final geometry; empty/error/retry và CTA rental/booking theo gate giữ nguyên.

**Verification:** V3 + V-rental; filters, long name/price/size lists, gate off và mobile; thiếu ảnh thật ghi exception chưa đóng K07 hoàn toàn.

**Phụ thuộc:** UI04, UI05, UI06. **Rủi ro:** Vừa. **Scope:** M.

**File dự kiến:** `src/pages/RentalCatalogPage.tsx`; `src/components/customer/CustomerCatalogCard.tsx`; `src/styles/customer.css`.

**Audit:** C03, C05, T02, T05, K04, K07, K12, L01, R03.

### UI13: Hai form thông tin thành viên

- [x] UI13 hoàn tất acceptance và verification

**Mục đích:** Đồng bộ intake/student fields, lựa chọn gender/costume, headers/status và responsive hai cột.

**Nghiệm thu:**

- [x] Tokens/type/card/error và form container theo roles; controls có nhãn và cùng height.
- [x] Height/weight một cột trên mobile rồi hai khi đủ chỗ; statuses/radio/checkbox giữ semantics và selections.
- [x] Intake token/privacy/draft/add another và student schedule/submission giữ behavior hiện tại; ngày text không biến thành picker.

**Verification:** V-forms trên token local hợp lệ: loading/error/expired/submitted/retry, chọn costume và draft refresh; 320/744.

**Phụ thuộc:** UI04, UI05. **Rủi ro:** Vừa. **Scope:** M.

**File dự kiến:** `src/pages/PublicMemberIntakePage.tsx`; `src/pages/StudentFormPage.tsx`; `src/components/customer/CustomerChoice.tsx`; `src/styles/customer.css`.

**Audit:** C05, C07, T04, T06, T07, K04, K05, K16, R07.

### UI14: Standalone feedback và submit bar

- [x] UI14 hoàn tất acceptance và verification

**Mục đích:** Hợp nhất các section feedback, dùng rating chung và sửa submit bar responsive/safe-area.

**Nghiệm thu:**

- [x] Type/palette/section/card/helper/button thống nhất; hai rating cùng ink/keyboard/value semantics.
- [x] Rating label wrap/stack 320–390; bar opaque, safe-area và content clearance đúng chiều cao thực.
- [x] Required/completion/canSubmit/pending/errors/success giữ; desktop/mobile dùng cùng một submit action.

**Verification:** V-forms + V2/V3; keyboard/zoom/mobile, long status, disabled/pending, duplicate submit stress.

**Phụ thuộc:** UI05, UI11. **Rủi ro:** Vừa. **Scope:** M.

**File dự kiến:** `src/pages/FeedbackFormPage.tsx`; `src/components/customer/CustomerFeedbackSection.tsx`; `src/components/customer/CustomerRatingInput.tsx`; `src/styles/customer.css`.

**Audit:** C04, C05, C07, C09, T04, T07, K15, K16, L06, R07, R08.

### UI15: Đăng ký khách

- [x] UI15 hoàn tất acceptance và verification

**Mục đích:** Chuyển registration sang customer form tokens, giữ hợp đồng auth và return target.

**Nghiệm thu:**

- [x] Title/fields/CTA/error/card đúng customer roles và narrow container.
- [x] Username/password/confirm validation, payload không gửi roles và API endpoint giữ nguyên.
- [x] returnTo query/state và success→login behavior hiện tại được giữ; đợt base giữ entry cũ, presentation/entry login bổ sung nghiệm thu ở O01–O04.

**Verification:** V-auth-unit + V2; error/success, keyboard, mobile. Không sửa staff-register.

**Phụ thuộc:** UI03, UI04. **Rủi ro:** Thấp. **Scope:** S.

**File dự kiến:** `src/pages/ClientRegisterPage.tsx`; `src/styles/customer.css`.

**Audit:** C07, T04, K01, K03, K05, L03.

**Evidence đợt đầu:** [QA-customer.md](../docs/design/QA-customer.md) và [checks](../docs/design/customer-foundation-checks.md); baseline riêng cho UI00. Chỉ tick các criteria của task này, không suy toàn customer đã đạt DESIGN.

**Checkpoint giai đoạn 3:**

- [x] Evidence và acceptance của các task phía trên được kiểm; staff/customer đúng phạm vi
- [x] Các checks liên quan thực sự hoàn tất; failure có sẵn/thiếu prerequisite được ghi rõ
- [x] Không thay business contract, assets gốc hoặc working tree ngoài batch

## Giai đoạn 4: Đặt/thuê và các trang shared

### UI16: Profile customer trong trang shared

- [x] UI16 hoàn tất acceptance và verification

**Mục đích:** Áp appearance customer từ route scope cho Profile/PasswordSection, giữ default staff và gate Telegram.

**Nghiệm thu:**

- [x] Customer title/card/badge/input/error theo roles; thay --text-secondary undefined chỉ ở appearance khách.
- [x] Không đổi profile/password validation, submit/toast và phần Telegram staff.
- [x] Style chọn theo route scope, không thêm hoặc thay checks quyền theo appearance.

**Verification:** V-forms + V4; manual profile/password customer và staff light/dark với fixtures hợp lệ, validation/pending/error/success. V-auth-unit chỉ là regression auth bổ sung.

**Phụ thuộc:** UI04, UI05, UI07. **Rủi ro:** Vừa. **Scope:** S.

**File dự kiến:** `src/pages/ProfilePage.tsx`; `src/styles/customer.css`.

**Audit:** C08, T04, T05, K16, L03.

### UI17: Danh sách booking và rental customer

- [x] UI17 hoàn tất acceptance và verification

**Mục đích:** Đồng bộ order cards, status toolbar hiện có, pagination và CTA trong customer surface; không thay search/filters của nghiệp vụ staff.

**Nghiệm thu:**

- [x] Card/type/status/price cùng roles, pagination wrap và CTA48; rental title explicit 16 thay body 14 inherited.
- [x] Booking status/refresh và rental pagination/request unchanged; không tự thêm API filter/search.
- [x] Shared admin/role branches giữ markup appearance staff, route/hash/query và destinations đúng.

**Verification:** V3 + V-booking-e2e/V-rental; client và admin lists, empty/error/loading/pagination.

**Phụ thuộc:** UI05, UI07. **Rủi ro:** Vừa. **Scope:** M.

**File dự kiến:** `src/components/customer/CustomerOrderCard.tsx`; `src/components/customer/CustomerListToolbar.tsx`; `src/pages/BookingsPage.tsx`; `src/pages/RentalListPage.tsx`.

**Audit:** T03, K02, K09, K12, R08, R09.

### UI18: Wizard fields và review

- [x] UI18 hoàn tất acceptance và verification

**Mục đích:** Chuẩn hoá các bước thông tin/review/estimate/buttons, giữ native datetime và toàn bộ controller/draft/idempotency.

**Nghiệm thu:**

- [x] Page/section/field/price/CTA/customer container đúng metrics; date/time shell theoT 04.
- [x] Step back/edit/compare/context/session refresh/login giữ payload/draft và các validations hiện có.
- [x] Estimate vẫn tham khảo, cùng handlers/loading/disabled; chưa thêm sticky CTA hoặc đổi action submit.

**Verification:** V-booking-unit + V-booking-e2e; VN datetime, retry/key, draft refresh và widths. K06/R05 interaction chưa đóng trong base.

**Phụ thuộc:** UI04, UI05, UI10. **Rủi ro:** Vừa. **Scope:** M.

**File dự kiến:** `src/pages/BookingWizardPage.tsx`; `src/pages/NewBookingPage.test.tsx`; `src/styles/customer.css`.

**Audit:** T03, T05, K03, K04, K05, K10, L02, L03.

### UI19: Booking detail: summary, quote và payment

- [x] UI19 hoàn tất acceptance và verification

**Mục đích:** Migrate các section read-only của detail customer theo từng nhóm nhỏ, giữ nguồn dữ liệu/financial calculations và staff view.

**Nghiệm thu:**

- [x] Customer overview/status/quote/fee/cọc/payment instructions đúng type/card/price; staff presentation unchanged.
- [x] Mobile breakdown list giữ đầy đủ quantity/unit/total/cọc/còn thu; desktop bảng hiện hữu có thể giữ.
- [x] Quote version, accepted state, ownership/roles và các action gates/calculations không đổi.

**Verification:** V-workflow; customer/admin/accountant/photographer, financial/privacy gates, money 0/số lớn, 320/744/1128.

**Phụ thuộc:** UI05, UI17. **Rủi ro:** Cao. **Scope:** M.

**File dự kiến:** `src/pages/BookingWorkflowDetailPage.tsx`; `src/components/customer/CustomerPriceBreakdown.tsx`; `src/styles/customer.css`.

**Audit:** C06, T03, T05, K10, L02, R06.

### UI20: Booking detail: forms và action areas

- [x] UI20 hoàn tất acceptance và verification

**Mục đích:** Migrate forms/change request/delivery consent/review/buttons ở nhánh khách, không extract cả workflow controller.

**Nghiệm thu:**

- [x] Fields/native date+time/feedback/errors/CTA theo metrics, labels dài wrap và focus rõ.
- [x] Accept quote/current version, revisions/delivery acceptance/change requests/pending và keys giữ nguyên.
- [x] Staff-only quote/resource/payment controls không nhận customer presentation; mỗi thao tác gửi đúng một action.

**Verification:** V-workflow + manual fixtures hoặc bổ sung behavior cases cho change/cancellation, stale quote, failure/retry và duplicate interaction; kiểm role 6/staff branches. Wizard unit chỉ là regression, không cover detail forms.

**Phụ thuộc:** UI04, UI19. **Rủi ro:** Cao. **Scope:** M.

**File dự kiến:** `src/pages/BookingWorkflowDetailPage.tsx`; `src/styles/customer.css`; `e2e/workflow-business.spec.cjs`.

**Audit:** C07, T06, K01, K04, K05, K15, R08, R09.

### UI21: Rental detail: quote, payment và settlement

- [x] UI21 hoàn tất acceptance và verification

**Mục đích:** Chuẩn hoá summary/list/breakdown của rental customer bằng presentation chung, giữ semantics phí kỳ thuê và cọc bảo đảm.

**Nghiệm thu:**

- [x] Name/size/quantity/fee/deposit/due/refund/settlement đọc rõ; unit price kỳ thuê không thành đơn giá ngày.
- [x] Customer surfaces/type/status chung, staff quote/finance/handover summaries appearance nguyên.
- [x] Amounts/accepted version/order status/roles/refund calculations giữ nguyên, mobile không ép wide row.

**Verification:** V-rental; quote→return damage→settlement→refund→review, client/admin/accountant financial states.

**Phụ thuộc:** UI05, UI17, UI19. **Rủi ro:** Cao. **Scope:** M.

**File dự kiến:** `src/pages/RentalDetailPage.tsx`; `src/components/customer/CustomerPriceBreakdown.tsx`; `src/styles/customer.css`.

**Audit:** T03, T05, K10, L02, L03, R06.

### UI22: Rental detail: sửa yêu cầu và gia hạn

- [x] UI22 hoàn tất acceptance và verification

**Mục đích:** Migrate các fields và CTA khách sửa yêu cầu/gia hạn/đồng ý; các thao tác staff giữ defaults.

**Nghiệm thu:**

- [x] Native date/time/control/radius/focus/long CTAs theo customer contract.
- [x] Change request/draft/current quote/accepted extension/idempotency/pending giữ behavior.
- [x] Không đổi staff request keys/handover/payment actions, không tạo consent trùng qua Enter/click.

**Verification:** V-rental + manual fixtures hoặc bổ sung behavior cases cho change/cancellation, extension, failure/retry, stale version và duplicate interaction; validation/date shell dưới html.dark.

**Phụ thuộc:** UI04, UI21. **Rủi ro:** Cao. **Scope:** M.

**File dự kiến:** `src/pages/RentalDetailPage.tsx`; `src/styles/customer.css`; `e2e/rental-flow.spec.cjs`.

**Audit:** K01, K04, K05, R08, R09.

### UI23: Form tạo đơn thuê

- [x] UI23 hoàn tất acceptance và verification

**Mục đích:** Chuẩn hoá chọn món/size/quantity/ngày nhận-trả/price reference và submit của rental public.

**Nghiệm thu:**

- [x] Fields/cards/title/price/button thống nhất, receive/return native giữ format, grid mobile rõ.
- [x] Chọn size/quantity/extra line và draft refresh/login khôi phục dữ liệu; quote vẫn do studio xác nhận.
- [x] Rental gate và fallback context giữ nguyên; không bổ sung date availability/API hay giá động.

**Verification:** V-rental +320/744, draft refresh→auth→submit, 0/items unavailable/date validation.

**Phụ thuộc:** UI04, UI05, UI12. **Rủi ro:** Vừa. **Scope:** S.

**File dự kiến:** `src/pages/NewRentalPage.tsx`; `src/styles/customer.css`.

**Audit:** T03, K01, K04, K05, K10, L02, L03.

**Checkpoint giai đoạn 4:**

- [x] Evidence và acceptance của các task phía trên được kiểm; staff/customer đúng phạm vi
- [x] Các checks liên quan thực sự hoàn tất; failure có sẵn/thiếu prerequisite được ghi rõ
- [x] Không thay business contract, assets gốc hoặc working tree ngoài batch

## Giai đoạn 5: Ảnh hiện có

### UI24: Ảnh Portfolio và responsive collage

- [x] UI24 hoàn tất acceptance và verification

**Mục đích:** Chuẩn hoá loading/crop/clip/alt của ảnh hiện có, giảm fixed geometry hero/about và khai báo image policy. Chưa gán ảnh kỷ yếu cho sản phẩm thuê.

**Nghiệm thu:**

- [x] Editorial hero/about có aspect/crop rõ, clip 14 khi dùng photo role; alt có nghĩa hoặc rỗng khi trang trí, logo contain.
- [x] Hero priority phù hợp, ảnh dưới fold lazy; pending/error neutral giữ khung, không gọi concept gradient là loading placeholder.
- [x] Hero có ảnh mobile từ nguồn hiện hữu nếu composition phù hợp; offsets không tràn/clip, motion theo reduced-motion.

**Verification:** V-image + V3; slow/error/disabled-image, layout shift/network actual, 320/744/1024/1128. Ghi ratio editorial exceptions.

**Phụ thuộc:** UI09, UI11. **Rủi ro:** Vừa. **Scope:** M.

**File dự kiến:** `src/components/customer/CustomerImage.tsx`; `src/pages/PortfolioPage.tsx`; `src/components/atoms/Logo.tsx`; `src/styles/customer.css`.

**Audit:** R04, L05.

### UI25: Responsive derivatives ảnh hiện có theo batch

- [x] UI25 hoàn tất acceptance và verification

**Mục đích:** Tạo resized WebP variants của 13 nguồn Portfolio, giữ originals và nối srcset/sizes. Kế hoạch ban đầu chia A–E3/3/3/3/1. Generation thực tế chạy2/2/3/3/3 với mỗi lệnh ≤5 file; acceptance bên dưới là hậu kiểm A–E3/3/3/3/1 của toàn bộ assets, không xác nhận chronology generation như kế hoạch ban đầu. [Evidence và điều chỉnh](../docs/design/customer-images-checks.md).

**Nghiệm thu:**

- [x] Hậu kiểm A/B/C/D3 nguồn và E1 nguồn; mỗi nguồn có1 derivative640 và original làm candidate lớn. Generation batches thực tế2/2/3/3/3, mỗi lệnh ghi ≤5 file.
- [x] Mỗi batch có dimensions/quality/crop/srcset/sizes được kiểm tra tại viewport tương ứng; cache reuse nguồn dùng chung.
- [x] Ghi source bytes và network đo thật tách biệt; chỉ mở thêm candidate sau measurement, chia task mới nếu vượt 5 file.

**Verification:** V-image sau từng batch; build/imports, visually inspect resized output, network on mobile/desktop. Giữ manifest source→variant.

**Phụ thuộc:** UI24. **Rủi ro:** Vừa. **Scope:** M mỗi batch.

**File dự kiến:** `src/assets/images/customer/* (tối đa3 file/batch)`; `src/components/customer/customerImages.ts`; `src/pages/PortfolioPage.tsx`.

**Audit:** Phần 5.2 — dung lượng nguồn/responsive delivery.

**Tasklets hậu kiểm A–E đã hoàn tất; generation chronology thực tế đã ghi ở trên:**

- [x] UI25-A: tối đa 3 nguồn, ≤3 derivative files + manifest + consumer ( ≤5 file ghi)
- [x] UI25-B: tối đa 3 nguồn tiếp theo, cùng contract
- [x] UI25-C: tối đa 3 nguồn tiếp theo, cùng contract
- [x] UI25-D: tối đa 3 nguồn tiếp theo, cùng contract
- [x] UI25-E: nguồn còn lại; inspect/network/build và chốt manifest

Mỗi review group A–E có dimensions/quality/visual/import và candidate/network evidence trong báo cáo ảnh. Không có network log ngay sau từng bước generation ban đầu. Khi mở candidate trung gian cho desktop DPR2/3, tách asset task mới theo measurements; không coi số453.330 source bytes là network trong mọi trường hợp.

**Checkpoint giai đoạn 5:**

- [x] Evidence và acceptance của các task phía trên được kiểm; staff/customer đúng phạm vi
- [x] Các checks liên quan thực sự hoàn tất; failure có sẵn/thiếu prerequisite được ghi rõ
- [x] Không thay business contract, assets gốc hoặc working tree ngoài batch

## Giai đoạn 6: Nghiệm thu

### UI26: Nghiệm thu và ghi các gap còn mở

- [x] UI26 hoàn tất acceptance và verification

**Mục đích:** Chốt evidence/traceability cho base UI, so sánh staff và customer, ghi rõ các finding còn deferred theo phạm vi.

**Nghiệm thu:**

- [x] Mọi acceptance base đã có evidence; V-final và các journey/local states đã kiểm, lỗi baseline được tách.
- [x] 48 findings có disposition: closed/partial/deferred/exception; không ghi 100% tuân thủ khi calendar/ảnh catalog/search/sticky còn mở. Login được nghiệm thu ở đợt bổ sung O01–O04.
- [x] Staff/admin appearance và behaviors được so trước-sau; docs nêu rollback đơn vị task, không có deploy/merge trong plan UI.

**Verification:** V-final; review ảnh customer/staff, gate matrix và pending decisions. Chỉ tick task sau checks thực sự hoàn tất.

**Phụ thuộc:** UI08, UI12, UI13, UI14, UI15, UI16, UI17, UI18, UI20, UI22, UI23, UI25. **Rủi ro:** Vừa. **Scope:** S.

**File dự kiến:** `docs/design/QA-customer.md`; `tasks/todo.md`; `docs/design/customer-baseline.md`.

**Audit:** Evidence/quality gate; không đóng finding bằng lập tài liệu.

**Checkpoint giai đoạn 6:**

- [x] Evidence và acceptance của các task phía trên được kiểm; staff/customer đúng phạm vi
- [x] Các checks liên quan thực sự hoàn tất; failure có sẵn/thiếu prerequisite được ghi rõ
- [x] Không thay business contract, assets gốc hoặc working tree ngoài batch

## Module có điều kiện

Polish bổ sung sau review cuối (không cần đổi contract):

- [ ] Đồng bộ typography nhánh lịch sử có dữ liệu: summary báo giá/bàn giao của BookingWorkflowDetailPage và h3 phiên bản RentalDetailPage sang title16/600 riêng customer; giữ staff defaults và xác minh state có history.

Các mục này không nằm trong base mặc định. Ngày 08/10, user yêu cầu “refactor cả login luôn”, mở O01–O04. `/login` customer và `/staff/login` legacy là mặc định kỹ thuật đã thông báo, không phải URL được user chọn trong câu hỏi trước đó. Q1/Q3 và điều kiện sticky vẫn mở; không tick task chỉ vì đã tạo specification.

### O01: Áp presentation login khách và giữ staff legacy

- [x] O01 hoàn tất trong phạm vi presentation

**Điều kiện:** Yêu cầu login ngày 08/10; mặc định Q2 trong plan. **Phụ thuộc:** UI03, UI04, UI15.

**Mục đích:** Reuse LoginPage/auth handler; customer branch theo DESIGN, staff branch ngoài scope giữ markup/default styles cũ.

**Nghiệm thu:**

- [x] `/login` dùng palette/type/fields56/r8/CTA48/card14/title22; không shadow/glow. `/staff/login` giữ presentation legacy; PNG light/dark trùng baseline.
- [x] Cùng auth handler, credentials, role redirects và safeBookingReturnTo; legacy JSX không đổi. Refs/autocomplete/required validation giữ, customer branch bổ sung messages/ARIA/error alert/busy.
- [x] Responsive 320/390/744/1128/1440 dưới light/dark không overflow, không đổi stored themeMode.

**Verification:** V-auth-unit + guest/client/admin/accountant entry/direct URL; không dùng appearance để phân quyền.

**Files thực tế (2):** `src/pages/LoginPage.tsx`; `src/styles/customer-login.css`. Không tạo trang/auth form clone; CustomerScope chọn presentation.

**Audit:** C04, T04, K01, K03.

### O02: Nối login entry ở router/guard

- [x] O02 hoàn tất cho entry contract

**Điều kiện:** Q2. **Phụ thuộc:** O01.

**Mục đích:** `/login` public trong CustomerScope và không bị portal/rental gate; `/staff/login` public ngoài scope. Guard/API chỉ chọn entry đúng surface.

**Nghiệm thu:**

- [x] Guest customer đến `/login`, guest staff đến `/staff/login`; guest `/` vẫn đến Portfolio. Entry helper không cấp quyền hoặc mở whitelist return URL.
- [x] Direct login refresh/bootstrapping không loop; `/login` public ngay cả khi portal/rental tắt. Role checks và feature gates giữ nguyên.
- [x] API 401 loại trừ `/auth/login`; customer resume query/hash giữ nguyên, non-resume chọn entry. AuthContext không đổi.

**Verification:** Kiểm cục bộ guest/client/staff entry, direct refresh, gates on/off và rejected returnTo. Full V-auth-unit/V-booking-e2e nghiệm thu tại O04 sau khi cập nhật assertions entry mới.

**Files thực tế (4):** `src/App.tsx`; `src/components/ProtectedRoute.tsx`; `src/services/api.ts`; `src/utils/loginEntry.ts`.

**Audit:** C02, C10.

### O03: Cập nhật các link đăng nhập khách

- [x] O03 hoàn tất cho customer/staff links

**Điều kiện:** Q2. **Phụ thuộc:** O02.

**Mục đích:** Customer links tiếp tục `/login`; staff Sidebar/logout và link quay lại đăng nhập của staff registration chuyển `/staff/login`. Page title nhận diện entry staff mới.

**Nghiệm thu:**

- [x] Header/register/wizard/rental tiếp tục customer entry `/login`; staff links dùng `/staff/login`.
- [x] Booking/rental draft và validated return context sống qua login/register. LoginPage state/query có hash và expired-session API resume giữ query/hash; guard guest vẫn lưu path+search như baseline.
- [x] Đăng nhập tài khoản staff từ entry khách vẫn redirect theo logic auth hiện tại, không được cấp quyền khách bằng style.

**Verification:** Kiểm cục bộ header/register/wizard/rental entry và draft/query/hash; full V-auth-unit/V-booking-e2e/V-rental tại O04 sau khi cập nhật assertions entry mới.

**Files thực tế (3):** `src/components/Layout/Sidebar.tsx`; `src/pages/RegisterRequestPage.tsx`; `src/hooks/usePageTitle.ts`. Customer link consumers được kiểm, không cần sửa source của chúng.

**Audit:** K02, K13.

### O04: Regression auth cho entry đã chọn

- [x] O04 hoàn tất sau checks đợt login

**Điều kiện:** Q2. **Phụ thuộc:** O03.

**Mục đích:** Kiểm hai entry, roles, safe return và API 401; nghiệm thu credentials/error/pending/retry cùng draft qua booking/rental E2E. Không xoá assertion cũ để né thay đổi presentation.

**Nghiệm thu:**

- [x] Tests giữ explicit payload/roles/redirect/query assertions, không xoá case cũ để né failure. Full unit 73/73 và booking/rental E2E 2/2 pass sau sửa source label.
- [x] Cover customer/staff entry, invalid return target và refresh draft; auth handler/legacy JSX được đối chiếu AST, check/build cuối pass.
- [x] 35 browser groups pass: main23 và entry12; 10 viewport/theme cases, staff light/dark PNG byte-identical, validation/focus/error/pending/retry/roles/return/register đã kiểm. Chronology và artifacts ghi trong QA.

**Verification:** V-auth-unit + V-booking-e2e/V-rental; check/build.

**Test files thực tế (4):** `src/pages/LoginPage.test.tsx`; `src/components/customer/CustomerScope.test.tsx`; `src/utils/loginEntry.test.ts`; `src/services/api.test.ts`. Register/returnTo tests và booking/rental E2E cũ được chạy giữ assertions; evidence browser trong `login-runtime/`.

**Audit:** Regression/evidence cho module.

### O05: Customer calendar/date contract

- [ ] O05 hoàn tất khi điều kiện đã chốt

**Điều kiện:** Q1 bao calendar. **Phụ thuộc:** UI04, UI08.

**Mục đích:** Tạo lịch dựa DayPicker đang có, không sửa calendar staff hoặc thêm availability API. Giữ date strings/times và VN timezone contract.

**Nghiệm thu:**

- [ ] Day 40px tròn, selected ink/trắng, range soft; overlay customer light.
- [ ] Keyboard/Escape/focus return, labels/min/max/disabled và month/year edges hoạt động.
- [ ] Chuyển đổi ngày giờ tái sử dụng quy tắc hiện có, không dùng UTC date slicing làm đổi ngày; chỉ thêm adapter thật sự cần.

**Verification:** Behavior tests cho chọn ngày/focus/range và V-calendar; không test snapshot class.

**File dự kiến ( ≤5):** `src/components/customer/CustomerCalendar.tsx`; `src/components/customer/CustomerDatePicker.tsx`; `src/components/customer/customerDateAdapter.ts (chỉ nếu cần)`; `src/components/customer/CustomerDatePicker.test.tsx`; `src/styles/customer.css`.

**Audit:** K06.

### O06: Migrate lịch ở tạo booking/rental

- [ ] O06 hoàn tất khi điều kiện đã chốt

**Điều kiện:** Q1 bao calendar. **Phụ thuộc:** O05, UI18, UI23.

**Mục đích:** Nối picker mới vào field state hiện có; time input có thể native nhưng có chung shell.

**Nghiệm thu:**

- [ ] Start/end VN, giới hạn hiện có và receive/return đúng; draft/back/edit/login không mất.
- [ ] Payload/idempotency và estimate không đổi, picker không tạo submit ngoài ý muốn.
- [ ] Tests chọn ngày qua UI/keyboard, đồng thời giữ ISO payload assertions; không chỉ .fill native cũ.

**Verification:** V-calendar + V-booking-unit/V-booking-e2e/V-rental.

**File dự kiến ( ≤5):** `src/pages/BookingWizardPage.tsx`; `src/pages/NewRentalPage.tsx`; `src/pages/NewBookingPage.test.tsx`; `e2e/booking-flow.spec.cjs`; `e2e/rental-flow.spec.cjs`.

**Audit:** K06.

### O07: Migrate lịch ở detail customer

- [ ] O07 hoàn tất khi điều kiện đã chốt

**Điều kiện:** Q1 bao calendar. **Phụ thuộc:** O06, UI20, UI22.

**Mục đích:** Nối calendar customer cho đổi lịch/gia hạn mà giữ controls staff.

**Nghiệm thu:**

- [ ] Customer-only appearance/fields, staff native/calendar còn behavior cũ.
- [ ] Accepted quote/version, change state và extension action gates giữ nguyên.
- [ ] Qua ngày/cuối tháng/năm, disabled ranges, pending/retry không tạo action trùng.

**Verification:** V-calendar + V-workflow/V-rental; manual fixtures hoặc behavior cases cho change/cancellation/extension/pending/retry, vì journeys hiện tại chưa cover đủ các nhánh này.

**File dự kiến ( ≤5):** `src/pages/BookingWorkflowDetailPage.tsx`; `src/pages/RentalDetailPage.tsx`; `e2e/workflow-business.spec.cjs`; `e2e/rental-flow.spec.cjs`.

**Audit:** K06.

### O08: Sticky estimate và mobile CTA của wizard

- [ ] O08 hoàn tất khi điều kiện đã chốt

**Điều kiện:** Chốt riêng sau nghiệm thu base UI; thay composition tương tác. **Phụ thuộc:** UI26, UI18, UI08.

**Mục đích:** Ánh xạ estimate cuối bước sang sticky rail/mobile summary khi phù hợp; không ép CTA gửi vào các bước chưa đủ điều kiện.

**Nghiệm thu:**

- [ ] Rail tablet/desktop và bottom summary mobile theo target, safe-area/keyboard/clearance.
- [ ] Một nguồn handlers/pending/disabled; cùng payload và idempotency, không gửi trùng khi resize.
- [ ] Estimate vẫn tham khảo; giá và CTA không che errors hoặc field đang focus.

**Verification:** V-sticky + V-booking-unit/V-booking-e2e; keyboard/click/resize pending, 320/744/1128.

**File dự kiến ( ≤5):** `src/components/customer/CustomerReservationSummary.tsx`; `src/pages/BookingWizardPage.tsx`; `src/styles/customer.css`; `src/pages/NewBookingPage.test.tsx`.

**Audit:** L06, R05, R08.

### O09: Sticky quote action nếu phù hợp detail

- [ ] O09 hoàn tất khi điều kiện đã chốt

**Điều kiện:** Chốt sau review consent/quote; không phải footer chung. **Phụ thuộc:** O08, UI20, UI22.

**Mục đích:** Chỉ áp mobile quote summary/accept ở state được phép; giữ action gates và ý nghĩa tài chính.

**Nghiệm thu:**

- [ ] Chỉ hiện khi có quote/current version và khách có quyền; không hiện accept sau consent hoặc pending.
- [ ] Không tạo bản sao form/handler có thể submit hai lần; accepted quote/version và amounts đúng.
- [ ] Sticky không che table/errors/footer; desktop/mobile parity và staff default giữ.

**Verification:** V-sticky + V-workflow/V-rental; manual fixtures hoặc behavior cases cho stale quote/version, failure/retry và duplicate-click stress; journeys hiện tại chưa cover đủ.

**File dự kiến ( ≤5):** `src/components/customer/CustomerReservationSummary.tsx`; `src/pages/BookingWorkflowDetailPage.tsx`; `src/pages/RentalDetailPage.tsx`; `e2e/workflow-business.spec.cjs`; `e2e/rental-flow.spec.cjs`.

**Audit:** L06, R05, R08.

### O10: Đặc tả ảnh thật và search catalog

- [ ] O10 hoàn tất khi điều kiện đã chốt

**Điều kiện:** Q1 mở rộng tính năng; ảnh phụ thuộc Q3. **Phụ thuộc:** UI12, UI24.

**Mục đích:** Discovery và chốt data contract trước khi thêm image field, keyword API hoặc gallery thật. Chưa invent backend endpoint, ảnh từng món, upload UI hay trang detail mới.

**Nghiệm thu:**

- [ ] Xác định nguồn/quyền dùng ảnh, mapping item/concept, image metadata/fallback và endpoint hiện có sau khi đọc backend.
- [ ] Chốt query/pagination/keyword semantics nếu search tên được yêu cầu; không thêm Where/When/Who vô tác dụng.
- [ ] Tách backend/API/image delivery/migration thành tasks ≤5 file sau khi contract rõ; label partial findings được giữ đến khi có ảnh thật.

**Verification:** Review schema/API source và samples, kiểm hợp đồng types/service; không gọi discovery là feature đã triển khai.

**File dự kiến ( ≤5):** `docs/design/EXT-customer-catalog.md`.

**Audit:** K07, K12.

## Appearance auth đã được chọn

### AUTH01: Áp dụng phương án 2 cho customer login/register

- [x] AUTH01 hoàn tất acceptance và visual QA trong phạm vi Chrome local

**Quyết định:** User chọn phương án 2 hiển thị ngày 08/10. **Phụ thuộc:** UI15, UI24, O01–O04. **Rủi ro:** Thấp. **Scope:** M.

**Mục đích:** Dùng `CustomerAuthLayout` chung: desktop có story #f7f7f7 và hai ảnh Yume thật bên trái, form trắng tối đa 400px bên phải; mobile dưới 744px có ảnh chính 144px và ẩn ảnh phụ. Giữ font/palette/controls theo DESIGN và staff ngoài scope.

**Nghiệm thu:**

- [x] Login/register dùng cùng layout, ảnh `tnv00817`/`pbi00061` bản 640 có sẵn; không sửa ảnh gốc hoặc DESIGN. Inter title 22/story 28, fields 56/r8, CTA 48/r8, photo14; ảnh bạn bè giữ tỷ lệ vuông thay vì kéo dài như mockup.
- [x] Form subtrees và `requestedReturnTo`/`returnTo`/`returnState`/`onSubmit` giữ nguyên qua AST; targeted 19 tests, check/build và preservation pass. Không thay auth/routing/API hoặc staff source.
- [x] Hoàn tất visual QA và tương tác trên layout cuối; ghi rõ responsive/ảnh/focus/validation và phạm vi staff parity đã kiểm.

**Verification đã chạy:** Login 13/Register 3/Media 3 = 3 files/19 tests pass (91.45s); `npm run check` pass với 0 errors/8 warnings baseline, TypeScript/Prettier pass; `npm run build` pass 4020 modules/39.28s với warnings cũ. Preservation 137/162 unchanged, 25 expected changed, 14 original images giữ nguyên. Register 320/744/1128/1440 không overflow và fields 56; staff light 1440×1024 pixel-identical. Browser links, Tab/focus, validation và invalid-login alert đã kiểm; [auth QA](../docs/design/customer-auth-layout-qa.md) có `final result: passed`. Login/register320/390/744/1128/1440 có native captures và không overflow ngang. Không gọi checks chọn lọc này là full suite/E2E mới.

**Files thực tế (4):** `src/components/customer/CustomerAuthLayout.tsx`; `src/pages/LoginPage.tsx`; `src/pages/ClientRegisterPage.tsx`; `src/styles/customer-login.css`.

**Evidence:** [customer-auth-layout-checks.md](../docs/design/customer-auth-layout-checks.md). Source và rendered comparisons nằm trong artifacts `auth-ideation/`; toàn bộ evidence O01–O04 trước đây giữ nhãn lịch sử.

## Booking appearance được duyệt

### BOOK01: Ba bước đặt dịch vụ theo mockup 2

- [x] BOOK01 hoàn tất UI và visual QA trong phạm vi Chrome local

**Quyết định:** User chọn mockup2 và duyệt cả hai màn tiếp theo09/10; bỏ chi tiết dev. User chọn đổi tên/mô tả gói Demo trong API preview. **Phụ thuộc:** UI10/UI18, AUTH01. **Phạm vi:** Customer wizard public/account; staff/admin ngoài phạm vi UI.

**Nghiệm thu:**

- [x] Rail ảnh Portfolio thật/tiến trình; gói dạng hàng, đủ7 gói API; form/review đúng composition được duyệt và tokens.
- [x] Không có nhãn dữ liệu minh họa, mã nội bộ hoặc copy Demo trong customer flow. Metadata2 gói/2 loại trang phục được đổi, ID/giá/thông số khác giữ; không seed/reset DB.
- [x] Validation, draft/returnTo, timezone và submit/idempotency giữ17/17 declarations qua AST; regression guest→login→client remount→submit pass.
- [x] 15 renders320/390/744/1128/1440 không overflow; mobile bar81px, review actions48/fullwidth. Lỗi sticky che4 nút focus desktop đã sửa và kiểm lại0 bị che.
- [x] 20 targeted tests pass; NewBooking4 được kiểm lại sau markup cuối; check/build32.89s pass. Tab QA đóng, form bàn giao rỗng, viewport reset.

**Evidence:** [design-qa.md](../design-qa.md), artifacts `booking-ideation/qa/`. Không chạy E2E tạo booking/admin review trên preview; authenticated browser, Safari/mobile keyboard thật còn ngoài checks đợt này. O05–O10 vẫn có điều kiện; BOOK01 không đóng O08 estimate bước cuối.

**Files UI:** `src/App.tsx`; `src/pages/BookingWizardPage.tsx`; `src/components/customer/CustomerPackageCard.tsx`; `src/styles/customer-portfolio.css`; `src/styles/customer-booking-wizard.css`. Tests: `src/pages/NewBookingPage.test.tsx`. Metadata seed: `ops/seed-demo.cjs` ở repo gốc.

## Theo dõi quyết định và evidence

- [ ] Q1: ghi lựa chọn phạm vi thực tế của user, cập nhật module in/out
- [x] Q2: ghi yêu cầu login 08/10 và mặc định `/login` customer, `/staff/login` legacy; user chưa chọn URL cụ thể trong câu hỏi trước đó
- [x] AUTH01: ghi lựa chọn phương án 2 cho appearance login/register; không coi lựa chọn mockup là thay đổi entry contract Q2
- [ ] Q3: ghi nguồn/mapping ảnh được cung cấp, hoặc data dependency còn mở
- [x] QA-customer.md: ảnh/route/state/viewport + kết quả checks + staff diff
- [x] Disposition 48 findings: closed/partial/deferred/exception và gaps ảnh

Evidence task base: [QA-customer.md](../docs/design/QA-customer.md), [forms](../docs/design/customer-forms-checks.md), [orders](../docs/design/customer-orders-checks.md) và [images](../docs/design/customer-images-checks.md). Login entry O01–O04 có [evidence riêng](../docs/design/customer-login-checks.md); appearance hiện tại AUTH01 có [auth layout checks](../docs/design/customer-auth-layout-checks.md). UI08 dùng browser focus/escape/resize assertions cùng Radix, không thêm unit phản chiếu primitive. UI17 dùng shared CustomerOrderCard/OrderControls và toolbar classes, không tạo CustomerListToolbar chưa cần. UI25 paths thực: src/assets/images/customer-portfolio/ và src/assets/images/portfolio-images.ts. Source styles tách theo consumer; final polish chia batch4files rồi1prop.

Không tick task khi mới chỉ sửa code mà chưa kiểm chứng runtime cần thiết. Không gọi screenshots 360px hiện có là visual regression suite. Không chạy E2E trên DB demo cần giữ; xem prerequisites trong plan.
