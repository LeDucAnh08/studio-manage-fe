# Audit design system — giao diện khách hàng

Ngày: 2026-10-06 (Asia/Bangkok). Nguồn đích: `DESIGN.md` trong repo frontend.

Đây là **audit tĩnh mã nguồn**, không sửa code, không chạy luồng ghi dữ liệu. Đã đối chiếu router, nhánh quyền, component thực sự được render, CSS toàn cục và cấu hình Tailwind. Chưa đo computed styles trong trình duyệt, chụp màn hình, đo network, hoặc kiểm chứng từng viewport. Những nhận xét về nguy cơ tràn/che nội dung được ghi rõ là cần kiểm chứng runtime.

Các đường dẫn và số dòng bên dưới tính từ **gốc repo frontend**, theo working tree tại thời điểm audit. Tài liệu này nằm tại `frontend/docs/design/AUDIT-customer.md` nếu nhìn từ repo cha.

## 1. Phạm vi khách hàng và danh mục trang/component

### 1.1. Các trang thực sự có route khách hàng

Nguồn xác định phạm vi: `src/App.tsx:96–170`; `/account/*` có `ProtectedRoute allowedRoles={[6]}` tại dòng 128. Các route staff/admin ở dòng 171–210 không thuộc phạm vi.

| File | Route/bề mặt khách hàng | Component dùng trong bề mặt này |
|---|---|---|
| `src/pages/PortfolioPage.tsx` | `/portfolio`; các section `services`, `gallery`, `packages`, `contact`, `feedback` | `PublicSiteLayout`, `Logo`; local `HeroCollage`, `RatingField`; các card dịch vụ/concept/gói/review dựng inline |
| `src/pages/RentalCatalogPage.tsx` | `/costumes`; `/rental-catalog` redirect giữ query/hash | `PublicSiteLayout`, `Badge`, `Button`, `Input`; filter native select, catalog card và skeleton inline |
| `src/pages/BookingWizardPage.tsx` | `/booking/start`, `/account/bookings/new` | `PublicSiteLayout` từ router cho route public; `ClientLayout` cho account; `Button`, `Input`, `Textarea`; local `Field`; card gói, bảng so sánh, khối ước tính inline |
| `src/pages/BookingsPage.tsx` | `/account/bookings`, nhánh `admin=false` | `BookingNotifications`, `Button`; status select, order cards, pagination inline |
| `src/pages/BookingWorkflowDetailPage.tsx` | `/account/bookings/:id`, nhánh khách | `Button`, `Input`, `Textarea`; local `Field`, `PaymentInstructionsPanel`, `ScheduleSummary`; quote/payment/delivery sections |
| `src/pages/NewRentalPage.tsx` | `/rental/start` | `PublicSiteLayout` từ router; `Button`, `Input`, `Textarea`; native select/date và các khối chọn món inline |
| `src/pages/RentalListPage.tsx` | `/account/rentals`, nhánh `client=true` | `Button`; order cards và pagination inline |
| `src/pages/RentalDetailPage.tsx` | `/account/rentals/:id`, nhánh `client=true` | `Button`, `Input`, `Textarea`; local `Field`; quote/payment/return/extension sections |
| `src/pages/LoginPage.tsx` | `/login`, phần đăng nhập đi vào luồng khách | `Logo`, `Button`, `FormField`, `Input`; đây là trang dùng chung staff |
| `src/pages/ClientRegisterPage.tsx` | `/register` | `Button`, `FormField`, `Input` |
| `src/pages/ProfilePage.tsx` | `/account/profile`, role 6 | `ProfileSection`, `PasswordSection`, `SectionCard`; `Button`, `FormField`, `Input`, `PageHeader`, `Spinner` |
| `src/pages/PublicMemberIntakePage.tsx` | `/member-intake/:token` | `PublicSiteLayout` từ router; `Button`, `Input`; native select |
| `src/pages/StudentFormPage.tsx` | `/form/:customer`, form công khai cho thành viên | `Button`, `Card`, `CardContent`, `FormField`, `Input`, `Label`, `PageLoader`, `Textarea` |
| `src/pages/FeedbackFormPage.tsx` | `/feedback`, `/feedback/:customer` | `Logo`, `Button`, `Card`, `CardContent`, `Input`, `PageLoader`, `StarRating`, `Textarea` |

Tổng cộng **14 file trang có bề mặt khách hàng**. Các alias `/services`, `/concepts`, `/pricing`, `/consultation` chỉ redirect đến section trong Portfolio (`App.tsx:108–111`), không phải bốn trang độc lập. `NewBookingPage` là re-export của wizard (`BookingsPage.tsx:345`), không phải một implementation khác.

Feature gates: `src/config/features.ts:1–3` bật client portal trừ khi cấu hình bằng `false`; rental chỉ bật khi portal bật và `VITE_CLIENT_RENTAL_ENABLED === 'true'`. Audit bao gồm code của cả các luồng nằm sau gate, không khẳng định chúng đang được bật trong môi trường triển khai.

### 1.2. Shell, component chung và phụ thuộc style

| File/nhóm | Vai trò và phạm vi |
|---|---|
| `src/components/Layout/PublicSiteLayout.tsx` | Header/footer chung của portfolio, catalog, booking public, rental public, member intake |
| `src/components/Layout/ClientLayout.tsx` | Shell `/account/*`; header/nav riêng, chưa có footer |
| `src/components/atoms/Logo.tsx` | Logo WebP dùng ở public shell, login và feedback; cũng được dùng ở staff |
| `src/components/ProtectedRoute.tsx:18–25` | Loading khi xác thực `/account/*`: spinner CSS và caption; render trước ClientLayout, dùng chung với staff |
| `src/components/ui/button.tsx`, `input.tsx`, `textarea.tsx` | Controls thực dùng ở phần lớn các trang khách; defaults cũng phục vụ staff/admin |
| `src/components/ui/form-field.tsx`, `label.tsx` | Label/helper/error ở login, register, profile, student form |
| `src/components/ui/card.tsx` | `Card`, `CardContent` ở student/feedback; các card catalog/booking/profile lại dựng riêng |
| `src/components/ui/badge.tsx`, `star-rating.tsx` | Badge filter catalog; chọn sao ở feedback. Portfolio có implementation sao khác |
| `src/components/ui/page-header.tsx`, `spinner.tsx` | Header profile; `Spinner`, `PageLoader` cho profile/student/feedback |
| `src/components/ui/tooltip.tsx` | `TooltipProvider` được bọc toàn app (`App.tsx:92`); không tìm thấy TooltipContent được render bởi các trang khách trên |
| `src/App.tsx:214` | ToastContainer toàn app; theme của thư viện được import riêng, chưa có customer style contract |
| `src/index.css`, `tailwind.config.js`, `src/context/ThemeContext.tsx`, `index.html` | Hai hệ token HSL/legacy cùng tồn tại, theme `.dark` trên `<html>`, typography, radius và breakpoint ảnh hưởng xuyên route |

Không có `ProductCard`, `EquipmentCard`, `StudioRoomCard`, `ImageGallery`, `PriceSummary`, `CustomerHeader` hay `CustomerFooter` chuyên biệt đang được dùng trong các route này. Có card inline và shell chung, nhưng chưa có các component chuyên biệt tương ứng.

### 1.3. Những phần không thuộc audit

- `RegisterRequestPage` (`/staff-register`), `Layout`, `Sidebar`, các route từ `navItems/adminItems`, dashboard, quản lý gói chụp/trang phục/khách hàng/lịch/finance/report và các form thao tác staff.
- Không coi `CustomersPage`, `CustomerDetailPage`, `CustomerSizePage` là trang khách chỉ vì tên có chữ “Customer”.
- `BookingsPage.BookingDetailPage` tại dòng 220 là export legacy; router khách hiện dùng `BookingWorkflowDetailPage`, không đưa markup legacy vào findings của giao diện hoạt động.
- `ProfilePage.TelegramSection` bị ẩn với role 6 tại dòng 328; không audit màu Telegram của staff.
- `ui/date-picker.tsx`, `calendar.tsx`, `search-input.tsx`, `rating-block.tsx`, `stars.tsx`, `table-skeleton.tsx`, `ScheduleCalendar` có trong repo nhưng không được render trong các route khách đã tìm. Barrel export `ui/index.ts` không chứng minh component được dùng. Vì vậy không đề nghị đổi các component này theo DESIGN trên toàn app.

**Ràng buộc refactor:** không thay palette, defaults `ui/*`, `:root`, `.dark`, breakpoint hoặc logic trong component shared trên toàn repo. Cần scope/variant/presentation cho khách. Login hiện dùng cùng URL trước khi biết role, nên cách chọn appearance khách phải được chốt trước khi sửa trang này; không thể chỉ đổi toàn bộ `/login`.

## 2. Chuẩn đối chiếu và cách đọc mức độ

| Nhóm | Quy tắc đích dùng để đối chiếu |
|---|---|
| Color | Primary `#ff385c`, active `#e00b41`, disabled `#ffd1da`, chữ CTA trắng; ink `#222222`, body `#3f3f3f`, muted `#6a6a6a`; canvas trắng, soft `#f7f7f7`, strong `#f2f2f2`; hairline `#dddddd`/`#ebebeb`; error `#c13515`. Public không có dark mode theo DESIGN |
| Typography | Cereal VF/Circular; Inter là substitute được DESIGN cho phép. Display thường 28/22/21/20px; title 16px; body 16/14px; caption 14/13px; badge 11px. Rating display 64px là role riêng, không phải cỡ cho mọi giá/hero |
| Component | Primary/secondary button 48px, radius8, label16/500; input56px, radius8, focus border2px ink, không ring/glow; photo/card radius14; search pill64px + orb48px; day cell40px tròn, selected ink/trắng |
| Layout | Spacing tokens 2/4/8/12/16/24/32/48/64px; major band64px; meta card16px, reservation24px; marketplace gutter16px; editorial khoảng1280px, listing detail khoảng1080px; một shadow tier và nền phẳng |
| Responsive | Mốc744/1128/1440px; nav mobile logo/menu sheet; property grid1/2/4 cột; reservation rail desktop, price/CTA bottom trên mobile |

Quy tắc xử lý chỗ chưa rõ trong DESIGN:

- Ưu tiên frontmatter token và mô tả component cụ thể. Summary có “8px base”, trong khi phần Layout ghi base4px; summary mô tả card `rounded.lg ~14px`/button32px, nhưng token và component quy định card `rounded.md=14px`, nút `rounded.sm=8px` (`DESIGN.md:142–169`, `:423`, `:452`, `:482`). Audit dùng các giá trị cụ thể này.
- Giữ nội dung và nghiệp vụ studio. “Homes/Experiences/Services”, wishlist, rating laurel, map, city grid là ví dụ marketplace; việc không có chúng không tự động là lỗi hoặc yêu cầu xây chức năng mới. Gói dịch vụ, card lịch sử đơn và form có thể cần biến thể riêng.
- `DESIGN.md:539–547` chưa quy định loading skeleton, đầy đủ error outline, hoặc success/warning. Các đề xuất bổ sung state được ghi là cần định nghĩa thêm, không coi mọi trạng thái xanh/vàng là vi phạm một token chưa tồn tại.
- Utility `gap-4`, `p-6`, `text-sm` có thể đã khớp một role đích. Hardcode/rải utility là vấn đề quản lý nhất quán; không phải mọi utility đều sai thị giác.

**Cao:** lệch ở toàn bộ surface, controls/CTA chính hoặc rủi ro cản thao tác đáng kiểm tra. **Vừa:** lệch hệ thống/thành phần lặp, hierarchy/layout thiếu nhất quán. **Thấp:** polish, hợp nhất nhỏ hoặc cần chốt ngoại lệ. Mức độ là ưu tiên design, không phải kết luận về lỗi nghiệp vụ; mức độ cao cũng không đồng nghĩa refactor ít rủi ro.

### Giá trị thực sau cấu hình hiện tại

`tailwind.config.js:55–58` và `index.css:41` làm `rounded-sm=8px`, `rounded-md=10px`, `rounded-lg=12px`. `rounded-xl=12px`, `rounded-2xl=16px`, `rounded-3xl=24px`, `rounded=4px`, `rounded-full=9999px` theo defaults còn lại. Không được đọc `rounded-md/lg` theo defaults Tailwind chưa override.

Không khai báo custom media screens: hiện `sm=640`, `md=768`, `lg=1024`, `xl=1280`, `2xl=1536`. `container.screens['2xl']=1400px` ở dòng 11 chỉ điều khiển container, không thay media breakpoint. Typography root: `html=16px`, `body=14px` (`index.css:237–244`); font lấy default sans/system của Tailwind, chưa có cấu hình/tải Cereal, Circular hoặc Inter.

## 3. Findings theo Color, Typography, Component, Layout, Responsive

### 3.1. Color

| file | vấn đề | mức độ | đề xuất |
|---|---|---|---|
| `src/index.css:11–41,80,109–152`; `tailwind.config.js:20–28` | **C01.** Primary HSL amber, primary-foreground nâu; thêm cyan accent và amber scale `#f59e0b/#d97706/#b45309`. Legacy floor `#eef2f7`, text `#0f172a/#6b7280`, border rgba khác white/ink/muted/hairline đích. Token đã tồn tại nhưng đang mô tả design system khác | Cao | Định nghĩa palette khách có scope riêng, nối các consumer khách vào palette này; giữ token staff/admin hiện có |
| `src/context/ThemeContext.tsx:17–36`; `src/App.tsx:90`; `src/components/Layout/PublicSiteLayout.tsx:41,76`; `src/pages/PortfolioPage.tsx:312–319` | **C02.** Theme system/localStorage đổi `.dark` trên toàn html; public có nút theme và nhiều dark surfaces. Khác public canvas trắng/no-dark của DESIGN; portal cũng kế thừa theme chung | Cao | Customer surface trắng có scope, không kế thừa dark appearance của staff; chốt hành vi theme ở shell khách mà không đổi lựa chọn theme staff |
| `src/pages/PortfolioPage.tsx:314–315,341,677,889,904`; `src/components/Layout/PublicSiteLayout.tsx:87`; `src/pages/RentalCatalogPage.tsx:121,390` | **C03.** Gradient amber→cyan được hardcode inline và utility ở hero, CTA, gói featured, contact, catalog. Rausch không có trong các CTA này; brand accent phủ cả bề mặt lớn | Cao | Dùng primary Rausch cho CTA, ink cho heading; canvas/soft cho bands/cards; gom gradient cũ khỏi appearance khách |
| `src/pages/LoginPage.tsx:48–59,92`; `src/pages/StudentFormPage.tsx:137,295`; `src/pages/FeedbackFormPage.tsx:190,418`; `src/components/ui/button.tsx:19` | **C04.** Gradient CTA lấy `#f59e0b → #22d3ee`; login thêm amber/cyan blobs và heading gradient. Không khớp primary/on-primary đích | Cao | Customer primary variant cho đúng consumers; login cần lựa chọn presentation theo luồng khách trước vì dùng chung staff |
| `src/pages/StudentFormPage.tsx:157,169,208,213`; `src/pages/FeedbackFormPage.tsx:214,226,257,293,329,352,375`; `src/pages/RentalCatalogPage.tsx:400–445` | **C05.** Blue/violet/teal/pink/sky/emerald/amber/cyan được dùng cho nhóm nội dung, icon, size chip; nhiều accent không có semantic contract khách | Vừa | Icon nội dung ink/muted, selected/CTA dùng primary; lập semantic tokens cho status thực sự cần. Không xoá phân biệt trạng thái chỉ để giảm palette |
| `src/pages/BookingWorkflowDetailPage.tsx:875,913,918,1255,2018,2024`; `src/pages/PublicMemberIntakePage.tsx:205`; `src/components/ui/badge.tsx:16–18` | **C06.** Status hardcode amber/emerald/cyan hoặc dùng primary cho mọi lifecycle. DESIGN chưa có đầy đủ success/warning; cần bổ sung thay vì đổi mọi status thành Rausch | Vừa | Customer StatusBadge + token status có chủ đích; giữ tên trạng thái và phân biệt với accent thương hiệu |
| `src/pages/FeedbackFormPage.tsx:262,298`; `src/pages/ProfilePage.tsx:111,125,139`; `src/components/ui/form-field.tsx:27,31`; `src/index.css:34,66` | **C07.** Required/error trộn rose500, red500, destructive theme. Màu error đích `#c13515` chưa được dùng thống nhất | Vừa | Customer error token dùng cho text/helper/required; outline-error cần bổ sung spec vì DESIGN chưa đủ |
| `src/pages/ProfilePage.tsx:46,53–54,293–297`; `src/index.css:99–111` | **C08.** `var(--text-secondary)` không có declaration trong frontend và không fallback nên màu kế thừa; badge/card lấy legacy amber/text/border/shadow khác palette khách | Vừa | Dùng token khách đã định nghĩa cho role caption/badge/card; chỉ nhánh `/account/profile` |
| `src/pages/PortfolioPage.tsx:1077–1079`; `src/components/ui/star-rating.tsx:33,43` | **C09.** Rating ở portfolio và feedback đều amber nhưng hai implementation khác nhau; DESIGN star-rating là ink `#222222` | Vừa | Dùng customer rating ink có chung states, giữ giá trị và action; không đổi Stars/RatingBlock chỉ dùng staff |
| `src/components/ProtectedRoute.tsx:18–25`; `src/App.tsx:128–130` | **C10.** Loading xác thực dùng border-primary amber/text-muted của theme chung; render trước ClientLayout nên customer tokens chỉ đặt trong ClientLayout sẽ chưa bao phủ state này | Vừa | Customer route scope bao phủ cả auth fallback, hoặc presentation loading theo route khách. Giữ logic xác thực/redirect; loading visuals cần bổ sung contract vì DESIGN chưa định nghĩa |

### 3.2. Typography

| file | vấn đề | mức độ | đề xuất |
|---|---|---|---|
| `tailwind.config.js:65–69`; `src/index.css:237–244`; `index.html:3–8` | **T01.** Không có font-family/load Cereal/Circular/Inter, không có semantic scale đầy đủ. Body mặc định14px; mọi text chưa set role kế thừa14, khác body-md16px đích | Cao | Customer typography dùng Cereal khi có nguồn font hợp lệ, hoặc Inter substitute được DESIGN cho phép; explicit role16/14/13/11, line-height/tracking tương ứng |
| `src/pages/PortfolioPage.tsx:327,332,389,482,516,586,689`; `src/pages/RentalCatalogPage.tsx:136` | **T02.** Hero portfolio36/48/60px weight800, catalog30/36/48px weight700; section headings30/36px weight700/800; giá gói30/36px weight800. Khác display28/22 và modest weights; phần hero text18px cũng ngoài body scale | Cao | Ánh xạ heading/price theo role đích, ưu tiên ảnh cho hierarchy; không lấy rating-display64px để hợp thức hoá hero/giá |
| `src/pages/BookingWizardPage.tsx:352`; `src/pages/NewRentalPage.tsx:139`; `src/pages/BookingsPage.tsx:120`; `src/pages/RentalListPage.tsx:41`; `src/pages/RentalDetailPage.tsx:211`; `src/pages/BookingWorkflowDetailPage.tsx:869` | **T03.** Tiêu đề cùng nhóm flow dùng24/30/36px, weight700; riêng wizard có tracking-tight. Chưa có page-title role chung | Vừa | Customer page title28/700 hoặc detail22/500 theo vai trò; chỉ presentation khách của các file shared |
| `src/pages/LoginPage.tsx:59`; `src/pages/ClientRegisterPage.tsx:30`; `src/pages/PublicMemberIntakePage.tsx:195`; `src/pages/FeedbackFormPage.tsx:237`; `src/pages/StudentFormPage.tsx:153`; `src/components/ui/page-header.tsx:25` | **T04.** Auth/forms dùng24/30px; student20px weight700 thay vì display-sm20/600; Profile Header24/700. Cùng loại title khác hierarchy | Vừa | Chuẩn hoá title/section title cho form khách; giữ variants theo nội dung thay đổi có chủ đích |
| `src/pages/BookingWizardPage.tsx:469,566,778,787,857`; `src/pages/RentalCatalogPage.tsx:425,461`; `src/pages/ProfilePage.tsx:302` | **T05.** Tên card18px thay vì title16; cùng giá gói hiển thị24/18/14px giữa card/compare/review; catalog price20/700 primary và profile section title14/600. Thiếu role price/title dùng chung | Vừa | Price/CardTitle primitives: title16/600, meta14/400, amount reservation21/700; total và listing price có role riêng được ghi rõ |
| `src/components/ui/button.tsx:7`; `src/components/ui/input.tsx:12`; `src/components/ui/textarea.tsx:11`; `src/components/ui/label.tsx:7`; `src/components/ui/form-field.tsx:30–31` | **T06.** Button/input/textarea14px, Label leading-none, helper12px. Target primary label/input16px, caption14/500 line-height1.29; error/helper chưa có contract chung | Vừa | Customer control typography variant, helper13/14 theo role; không thay default primitives staff |
| `src/pages/PortfolioPage.tsx:324,369,686`; `src/pages/RentalCatalogPage.tsx:132,412,415,422`; `src/pages/BookingWorkflowDetailPage.tsx:866`; `src/pages/PublicMemberIntakePage.tsx:192`; `src/pages/FeedbackFormPage.tsx:264,300,384` | **T07.** Kicker/badge/helper trộn10/11/12/14px, uppercase tracking-wider hoặc `[0.14em]`; nhiều helper là câu đọc dài ở12px. Không được coi mọi kicker là NEW tag8px đích | Vừa | Caption13/14 cho copy, badge11/600, micro-label12 chỉ cho nhãn ngắn; thêm kicker role nếu cần và chuẩn hoá tracking |

### 3.3. Component

| file | vấn đề | mức độ | đề xuất |
|---|---|---|---|
| `src/components/ui/button.tsx:7–25`; consumers `ClientRegisterPage.tsx:99`, `ProfilePage.tsx:61,142`, `NewRentalPage.tsx:346`, `RentalDetailPage.tsx:303` | **K01.** Button default36px, sm32, lg40, radius10; default/secondary có shadow, outline dùng border-input; disabled opacity50. Khác primary/secondary48px radius8, secondary outline ink, active/disabled palette rõ | Cao | Customer Button variants cho primary/secondary/text; semantic states và48px thật. Không chỉ tăng padding trên h9 cố định |
| `src/pages/PortfolioPage.tsx:340,714,724,888`; `src/pages/RentalCatalogPage.tsx:471`; `src/pages/BookingsPage.tsx:132`; `src/pages/RentalListPage.tsx:49`; `src/pages/BookingWizardPage.tsx:911` | **K02.** CTA Link viết tay, pill44px, nút nền đen, gradient, Button36/44px, labels14/600 cùng tồn tại. Đặt/thuê/continue chưa chung primary appearance; pill đang dùng cả primary thường | Cao | Customer CTA dùng chung cho Link/button với role rõ; primary48/radius8, pill chỉ variant được DESIGN cho phép; giữ đích điều hướng/action |
| `src/components/ui/input.tsx:12`; `src/components/ui/textarea.tsx:11`; `src/pages/BookingWizardPage.tsx:66,631,736`; `src/pages/PortfolioPage.tsx:822,848` | **K03.** Input default36px/radius10/bg-transparent/shadow-sm/ring; wizard min44px/radius12; portfolio native input padding10×16/radius12/ring amber. Target text-input56px/radius8/white/focus border2 ink không glow | Cao | Customer Input/Textarea visual variants; giữ autocomplete, type, validation và labels; ghi ngoại lệ chiều cao textarea thay vì áp56px cho mọi textarea |
| `src/pages/NewRentalPage.tsx:223,243,302,311`; `src/pages/PublicMemberIntakePage.tsx:234,251,269,285,373`; `src/pages/RentalCatalogPage.tsx:202,227,242,260,271`; `src/index.css:524–545` | **K04.** Select/filter/input cùng form có36/40/44px, radius10/12 và text14/16. CSS global cho date ép min40px/font16/radius12 (dark16), trong khi text/time còn36px. Không thể suy ra date36 chỉ từ h9 | Cao | Một customer field contract56/radius8 cho input/select/date/time; review cascade và native overrides trong scope khách |
| `src/pages/BookingWizardPage.tsx:138–162`; `src/pages/BookingWorkflowDetailPage.tsx:178–196`; `src/pages/RentalDetailPage.tsx:25–38`; `src/pages/NewRentalPage.tsx:298`; `src/components/ui/form-field.tsx:24–31` | **K05.** Ba Field local, labels inline và FormField chung; label14/500/400 hoặc inherited, gap6px, helper/error khác nhau. Error lặp giữa plain text và alert card | Vừa | Customer FormField/ErrorMessage chung visual roles, labels14/500 muted, gap4/8; bảo toàn htmlFor, required và error semantics |
| `src/pages/BookingWizardPage.tsx:703,718`; `src/pages/NewRentalPage.tsx:302,311`; `src/pages/BookingWorkflowDetailPage.tsx:2333,2340,2347`; `src/pages/RentalDetailPage.tsx:884` | **K06.** Ngày giờ có native datetime-local, date riêng, date+time riêng; không có customer day cells40px tròn/selected ink/range soft như DESIGN. StudentForm chỉ in ngày chụp (`:164–166`), không phải picker | Vừa | Chuẩn hoá field shell trước; calendar/range picker khách là bước riêng rủi ro cao. Nếu giữ native cần ngoại lệ visual rõ, không đổi ui DatePicker của staff |
| `src/pages/RentalCatalogPage.tsx:388–471`; `src/types/index.ts:65–75` | **K07.** Thẻ món catalog dùng icon/gradient144px, radius16, body padding20, title18, price20 primary và CTA pill đen. Khác photo-first property-card1:1/radius14/meta16px/title16. Model chưa có image field | Cao | Chuẩn hoá card visual trước; photo-first cần schema/API và ảnh thật, không thể hoàn thành bằng thay CSS. Không thêm carousel/wishlist nếu chưa có yêu cầu nghiệp vụ |
| `src/pages/PortfolioPage.tsx:670–724`; `src/pages/BookingWizardPage.tsx:451–473,541–603` | **K08.** Gói chụp lặp giữa marketing và wizard/compare: radius24/16, padding32/20, featured gradient/scale/shadow2xl so với selected ring. Không có card gói chung | Vừa | CustomerPackageCard với variant marketing/select/compare, chung type/spacing/price; gói text-only không cần ép ảnh của property card |
| `src/pages/BookingsPage.tsx:177–184`; `src/pages/RentalListPage.tsx:65–87` | **K09.** Order cards cùng công năng khác padding20/16; booking title18px, rental title14px kế thừa body; badge pill so với status text, grid và gutter khác. Radius12 cũng khác card14 đích | Vừa | CustomerOrderCard/StatusBadge chung, biến thể booking/rental; đây là hồ sơ đơn, không phải thẻ listing cần ảnh |
| `src/pages/PortfolioPage.tsx:689`; `src/pages/BookingWizardPage.tsx:850–864`; `src/pages/BookingWorkflowDetailPage.tsx:1155–1208,1303,1337`; `src/pages/RentalDetailPage.tsx:266,437,661` | **K10.** Giá công khai/ước tính/báo giá/cọc/còn thu là các khối riêng với type/card khác nhau; booking dùng bảng/stat, rental dùng list/grid. Chưa có Price/PriceBreakdown/PaymentSummary chung | Vừa | Chuẩn hoá visual roles cho Price và breakdown; giữ phân biệt đơn giá theo người, giá món, phí kỳ thuê, cọc bảo đảm, ước tính và báo giá đã chấp nhận |
| `src/pages/PortfolioPage.tsx:119`; `src/pages/BookingWizardPage.tsx:19`; `src/pages/BookingsPage.tsx:14`; `src/pages/BookingWorkflowDetailPage.tsx:83`; `src/pages/RentalCatalogPage.tsx:25`; `src/services/rentalService.ts:115` | **K11.** Money formatter lặp, khoảng trắng `đ` khác và unit `/ bạn` chỉ có ở portfolio; presentation giá chưa có contract. Đây chưa chứng minh tính tiền sai | Thấp | Format tiền chung về locale/spacing, unit theo domain; Price component nhận amount/unit/role, không gộp công thức tính tiền |
| `src/pages/RentalCatalogPage.tsx:178–283`; `src/pages/BookingsPage.tsx:139–158`; `src/pages/RentalListPage.tsx:21,65`; `src/components/Layout/PublicSiteLayout.tsx:42–113` | **K12.** Catalog có details filter5 trường và buttons; bookings status select+refresh; rentals chưa có toolbar tương đương. Không có thanh tìm kiếm khách pill64/orb48; catalog cũng không có ô search tên. ui SearchInput không được dùng | Vừa | Nếu triển khai search marketplace, dùng search khách phù hợp dữ liệu studio (món/danh mục/ngày), mobile pill/overlay. Chuẩn hoá filter toolbar trước; không tự thêm search vào mọi lịch sử/form |
| `src/components/Layout/PublicSiteLayout.tsx:41–113`; `src/components/Layout/ClientLayout.tsx:11–42` | **K13.** Public header64px + hàng nav phụ; client header autoheight hai hàng. Nav14px, active state chưa đồng nhất; client chỉ link bookings có custom active color (`:33`), chưa underline ink như target | Vừa | Customer Header/NavItem variants public/account, desktop metric80px/nav16/600 và active ink/underline; nội dung vẫn là studio |
| `src/components/Layout/PublicSiteLayout.tsx:116–143`; `src/components/Layout/ClientLayout.tsx:44–47` | **K14.** Footer public một hàng logo/link/copyright, padding40px, legal14px; target footer trắng3 cột/gutter24/padding48×80, legal13px. Account chưa có footer; auth/form độc lập cũng không có footer chuẩn | Vừa | Customer Footer có full/minimal variants; full cho marketplace, minimal cho form/account khi phù hợp, không thêm link chưa có nội dung |
| `src/pages/PortfolioPage.tsx:1060–1084`; `src/components/ui/star-rating.tsx:18–45`; `src/pages/FeedbackFormPage.tsx:270,306` | **K15.** Portfolio dùng ký tự ★30px, feedback dùng Lucide40px + hover label/scale. StarRating bỏ focus outline mà chưa có style thay thế; rating controls chưa chung contract | Vừa | Customer RatingInput có size/state/focus rõ, ink; giữ accessible labels và native button actions |
| `src/pages/FeedbackFormPage.tsx:254–388`; `src/pages/StudentFormPage.tsx:195,270`; `src/pages/ProfilePage.tsx:282–305`; `src/components/ui/card.tsx:8,17,42` | **K16.** Năm Feedback sections lặp khung p20/radius16/icon tile; Student lựa chọn gender/costume tự dựng; Profile SectionCard riêng. Card primitive12px/shadow-sm không được dùng thống nhất | Vừa | FeedbackSection, Choice/Chip, CustomerSectionCard sau khi chốt tokens; role card14/padding16 hoặc24, giữ data/validation |

### 3.4. Layout

| file | vấn đề | mức độ | đề xuất |
|---|---|---|---|
| `src/pages/PortfolioPage.tsx:383,475,510,553,580,741,781,900`; `src/pages/RentalCatalogPage.tsx:104` | **L01.** Major bands portfolio80/112px (`py-20 sm:py-28`), catalog32/48px; DESIGN section64px. Khoảng nghỉ và density khác rõ giữa hai bề mặt marketplace | Vừa | Major band64px, các form/list bands có variant riêng; giảm spacing theo role thay vì tìm-thay mọi py |
| `src/pages/PortfolioPage.tsx:494,670,753,796,903`; `src/pages/BookingWizardPage.tsx:329,451,623`; `src/pages/NewRentalPage.tsx:208`; `src/pages/BookingWorkflowDetailPage.tsx:863`; `src/pages/ClientRegisterPage.tsx:26` | **L02.** Padding/gap/margin rải20/28/40/56px (`p5/p7/p10/p14`, `gap5`, `space-y7`) và gap6/10px; nhiều số ngoài danh sách token đích. Các giá trị24/16 đang đúng không cần đổi | Vừa | Ánh xạ sang customer band/card/field/gutter tokens; radius14 không suy ra từ spacing; ghi ngoại lệ microspacing nếu cần |
| `src/components/Layout/PublicSiteLayout.tsx:42,117`; `src/components/Layout/ClientLayout.tsx:12,44`; `src/pages/PortfolioPage.tsx:321`; `src/pages/BookingWizardPage.tsx:329`; `src/pages/NewRentalPage.tsx:134`; `src/pages/ProfilePage.tsx:319` | **L03.** Public max1152px, account1024, wizard1152, rental form768, profile896; chưa có container contract. Target editorial1280/detail1080 và wide listings1440. Form nhỏ có thể hợp lý, không phải mọi trang phải1280 | Vừa | Container khách theo role editorial/list/detail/narrow-form/standard-form; thống nhất gutters và giải thích các width khác nhau |
| `src/pages/PortfolioPage.tsx:420,494,526,672,903,1016`; `src/pages/LoginPage.tsx:54,56`; `src/pages/ProfilePage.tsx:297`; `src/components/ui/button.tsx:11–19`; `src/components/ui/card.tsx:8` | **L04.** Nhiều shadow-sm/md/lg/xl/2xl, glow amber, text drop-shadow, hover nâng card/CTA và glass blur. Profile lấy legacy `0 10px 24px`; DESIGN chỉ flat hoặc một shadow tier | Cao | Customer surfaces phẳng; một shadow token cho search/popup/reservation/hover đúng role; primary press chỉ đổi màu, không lift/shadow change |
| `src/pages/PortfolioPage.tsx:670,714,1016`; `src/pages/RentalCatalogPage.tsx:388,399`; `src/components/ui/card.tsx:8`; `src/pages/ProfilePage.tsx:293`; `src/pages/FeedbackFormPage.tsx:179,254` | **L05.** Radius card/photo/form12/16/24 và pill thay nhau, có clipping lồng; target card/photo14, control8. Có token radius chung nhưng scale10/12 không biểu diễn14px | Vừa | Customer radius8/14/20/32/full riêng; một lớp chịu trách nhiệm clipping ảnh/brand mark, tránh thay --radius toàn app |
| `src/pages/BookingWizardPage.tsx:769,850`; `src/pages/FeedbackFormPage.tsx:212,397,402` | **L06.** Estimate rail `h-fit` chưa sticky; feedback lại có header/submit glass fixed và spacer80px. Chưa có contract cho sticky rail/action bar/clearance | Vừa | Chốt customer PriceSummary/SubmitBar metrics, opaque surface và content clearance; reservation pattern chỉ áp cho flow thích hợp, không mặc định mọi form |

### 3.5. Responsive

| file | vấn đề | mức độ | đề xuất |
|---|---|---|---|
| `tailwind.config.js:7–13`; `src/components/Layout/PublicSiteLayout.tsx:52,95`; `src/pages/RentalCatalogPage.tsx:384`; `src/pages/ProfilePage.tsx:319` | **R01.** Media defaults640/768/1024/1280/1536 khác mốc744/1128/1440. Public full nav chỉ hiện1280, profile2 cột1024, catalog2 cột640/3 cột1024 | Vừa | Customer screen aliases hoặc scoped media queries; không đổi default screens staff. Kiểm tra ở hai phía từng mốc đích |
| `src/components/Layout/PublicSiteLayout.tsx:52–113`; `src/components/Layout/ClientLayout.tsx:12,30` | **R02.** Public dùng hàng nav cuộn ngang ở dưới1280; account chỉ flex-wrap. Không có hamburger/sheet dưới744 như DESIGN; header cao thay đổi theo tên/nav | Cao | Customer mobile menu/sheet, desktop tabs ở mốc1128, tablet rõ ràng; giữ links/auth và focus return khi mở/đóng menu |
| `src/pages/RentalCatalogPage.tsx:323,384`; `src/pages/PortfolioPage.tsx:520`; `src/pages/BookingWizardPage.tsx:444` | **R03.** Catalog1/2/3 cột thay property1/2/4; concept gallery2/3/4, nên mobile vẫn2 cột. Gói wizard1/2/3 là domain khác, không tự động bắt buộc4 | Vừa | Catalog/listing theo grid đích; concept có variant ảnh cần chốt mật độ mobile. Service/package grid ghi quy tắc riêng nếu giữ3 |
| `src/pages/PortfolioPage.tsx:1003–1027,450,458` | **R04.** Hero ảnh ẩn dưới1024, stage520×460px, card232×288 và offsets cố định; about badges offsets±80px, hiện từ640. Khoảng1024–1127 stage lớn trong container hai cột có nguy cơ crop/overflow, chưa kiểm chứng | Vừa | Responsive collage/ảnh hero theo container, token aspect ratio; kiểm chứng tablet, không coi phần bị hidden chắc chắn tránh mọi request ảnh |
| `src/pages/BookingWizardPage.tsx:769,850,888`; `src/pages/RentalDetailPage.tsx:303`; `src/pages/BookingWorkflowDetailPage.tsx:1242` | **R05.** Wizard estimate ở rail chỉ từ1024, không sticky; CTA cuối nội dung bước wizard. CTA chấp thuận ở detail nằm trong section báo giá. Các flow này chưa có bottom price/CTA pattern; đây là gap khi ánh xạ sang reservation-card | Vừa | Sau review flow, rail desktop + summary/action bottom mobile nếu phù hợp; giữ trạng thái disabled/loading/accept quote và không tạo action gửi trùng |
| `src/pages/BookingWorkflowDetailPage.tsx:1155–1156,1336–1337`; `src/pages/RentalDetailPage.tsx:266,437,661` | **R06.** Booking quote/payment bảng min512/544px với overflow-x-auto; rental summary/list không cùng presentation. Mobile chủ động phải cuộn bảng, chưa phải bằng chứng tràn cả trang | Vừa | Summary/breakdown dạng list trên mobile, bảng desktop; giữ quantity/unit/total/cọc/hoàn đọc rõ |
| `src/pages/FeedbackFormPage.tsx:255,291`; `src/components/ui/star-rating.tsx:18–19,31,40`; `src/pages/StudentFormPage.tsx:223`; `src/pages/PublicMemberIntakePage.tsx:225` | **R07.** Rating5 sao40px + gaps khoảng208px, thêm label và gap16 trong flex không wrap: nguy cơ vượt content mobile. Student height/weight luôn2 cột, intake chỉ2 từ640 nên cùng dữ liệu khác collapse strategy | Cao | Rating label xuống hàng trên mobile; form fields nhỏ1 cột rồi2 khi đủ chỗ. Kiểm chứng320/360/390 và chữ dài, không khẳng định overflow đã đo |
| `src/pages/FeedbackFormPage.tsx:397,402–421`; `src/pages/BookingsPage.tsx:197`; `src/pages/RentalListPage.tsx:102`; `src/pages/RentalDetailPage.tsx:303,667,898`; `src/components/ui/button.tsx:7` | **R08.** Fixed feedback bar chưa safe-area, spacer80 hardcode; pagination không wrap, CTA dài kế thừa whitespace-nowrap. Nguy cơ tràn/che nội dung khi viewport hẹp, zoom hoặc keyboard mở | Vừa | Action groups wrap/full-width khi cần, safe-area padding và clearance theo bar; verify keyboard/zoom200% và labels dài |
| `src/components/ui/button.tsx:22–25`; `src/pages/BookingWizardPage.tsx:556,582,911`; `src/pages/RentalCatalogPage.tsx:471`; `src/components/Layout/ClientLayout.tsx:20` | **R09.** Nhiều nút36px, compare/logout32px, CTA44px; target primary tối thiểu48px. Một số link/glyph sao chưa có chiều cao vùng chạm explicit | Cao | Primary48px, icon/search theo role32/40/48 của DESIGN; bảo đảm vùng chạm phù hợp và visible focus, không nâng mọi icon thành cùng kích thước |

## 4. Thành phần lặp/lệch và hướng hợp nhất

| Thành phần | Các implementation hiện tại | Điểm lặp/lệch | Hướng refactor |
|---|---|---|---|
| Thẻ sản phẩm/trang phục/phụ kiện | `RentalCatalogPage:388`; selected items `NewRentalPage:208`; quote lines `RentalDetailPage:253` | Thẻ khám phá dùng icon/gradient; chọn món và quote chỉ text, các price/title/spacing tự đặt | ListingCard, RentalLineItem có role riêng; chung tên/price/meta primitives, không gộp tất cả thành một card với nhiều điều kiện |
| Thẻ thiết bị | Không thấy route/model/component khách cho thiết bị; catalog type chỉ clothing/accessory (`types/index.ts:70`) | Chưa triển khai trong frontend hiện tại, không có hai bản để so sánh | Không tự thêm tính năng. Khi có requirement, dùng ListingCard contract và data ảnh thật |
| Thẻ phòng chụp | Không thấy route/model/component khách cho phòng/studio space | Chưa triển khai; “gói chụp” trong Portfolio không phải phòng chụp | Ghi nhận ngoài implementation hiện có, không đổi gói dịch vụ thành card phòng |
| Thẻ gói/dịch vụ | `PortfolioPage:494,670`; `BookingWizardPage:451,541,771` | Title, price, feature list, selected/featured lặp nhưng radius/padding/type/state khác | CustomerPackageCard với biến thể ít, Price/FeatureList chung |
| Gallery/ảnh | `HeroCollage:994`; about mosaic `PortfolioPage:426`; concept grid `:520` | CSS background, img grid và gradient/emoji là ba cách khác nhau; không có ImageGallery thật dùng chung | Image primitive trước; Gallery cần phân biệt editorial/listing/concept. Concept có ảnh thật cần data/assets |
| Ngày giờ | Wizard datetime-local; thuê2 date; workflow date+time | Field shell/type/cascade/focus khác nhau; native picker không theo visual day-cell target | Customer date/time shell trước, calendar/range UX sau; giữ semantics múi giờ/ngày nhận-trả |
| Giá/báo giá/cọc | Portfolio card; wizard estimate; booking quote/payment; rental quote/payment | Size/alignment/unit/status/breakdown khác, money formatter lặp | Price, PriceBreakdown, PaymentSummary về presentation; domain calculations vẫn riêng |
| Nút đặt/thuê/gửi | Inline Link, Button default, gradient, min44, pill đen/trắng | Primary role bị đổi theo từng trang, active/disabled/height/focus khác | Customer Button/CTA dùng chung cho button và Link |
| Bộ lọc/tìm kiếm | Catalog details filter; booking status toolbar; rental list không filter; không global search khách | Chưa có contract toolbar/search, component SearchInput trong repo thuộc consumer staff | Customer FilterField/Toolbar; search marketplace là thay đổi riêng, chỉ thêm khi có nhu cầu/data |
| Header/footer | PublicSiteLayout; ClientLayout; login/student/feedback headers riêng | Height/container/nav states/footer presence và mobile khác nhau | Customer shell variants public/account/form/auth; footer full/minimal có chủ đích |
| Form/rating/loading | FormField chung;3 Field local; native label;2 rating controls; Card và section inline | Labels/error/helper/padding/status/skeleton khác nhau | Customer FormField, RatingInput, SectionCard; loading specs bổ sung, không sửa primitives staff |

## 5. Audit cách xử lý ảnh hiện tại

### 5.1. Ratio, crop, radius, lazy và placeholder

| file | vấn đề | mức độ | đề xuất |
|---|---|---|---|
| `src/pages/PortfolioPage.tsx:975–978,1003–1028` | Hero3 ảnh WebP local được đặt bằng CSS `background: url(...) center / cover no-repeat`. Card232×288px, ratio29:36 (~0,806), không phải1:1; wrapper radius24/shadow2xl. Không có lazy API, srcset, alt riêng, onLoad/onError, pending/error placeholder; component render rồi ẩn bằng CSS dưới1024 | Vừa | Ảnh hero là editorial, không bắt buộc crop property1:1. Dùng Image/Picture nếu ảnh mang nội dung, sizes theo container, priority có chủ đích; lazy không áp bừa ảnh LCP. Responsive conditional load cần kiểm tra network |
| `src/pages/PortfolioPage.tsx:420–444` | About wrapper aspect4:5, radius24, grid3×4/gap8/padding12. Mỗi img width/height100% object-cover, cell không có aspect token riêng; radius12 (`rounded-lg`).12 img cùng alt `TNV03816`; không loading/decoding/srcset/sizes/dimensions attr/load-error state. Nền HSL gradient và opacity0,7 tại dòng430–435 có thể hiện trước ảnh, nhưng không phải skeleton/loading state | Vừa | Customer image clipping14 khi áp role photo; giữ mosaic editorial có ngoại lệ ratio rõ. Lazy ảnh dưới fold, sizes/srcset, reserve cell geometry; alt theo nội dung hoặc alt rỗng nếu trang trí |
| `src/pages/PortfolioPage.tsx:520–536` | Concept “gallery” hiện là gradient+emoji, aspect3:4/radius16, shadow/lift; không có ảnh hoặc lightbox. Đây là minh hoạ cố định, không phải placeholder đang chờ ảnh | Cao | Nếu concept gallery cần photography-led target, bổ sung ảnh/data thật rồi chốt experience ratio4:5 hoặc gallery variant; không ghi lazy cho div không có ảnh |
| `src/pages/RentalCatalogPage.tsx:390–418`; `src/types/index.ts:65–75` | “Photo” plate h144px cố định, ratio đổi theo card width; icon Shirt/Sparkles trên gradient là minh hoạ luôn hiện. Model không có photo/image URL; không có image request, lazy hay image placeholder | Cao | Cần dữ liệu ảnh trước để có property photo1:1/radius14; giữ missing-image fallback riêng và không nhầm minh hoạ hiện tại với loading skeleton |
| `src/components/atoms/Logo.tsx:8–17`; consumers `LoginPage:56–57`, `FeedbackFormPage:181–182,214–215`, `PublicSiteLayout:47,122`, `PortfolioPage:447` | Logo WebP explicit width=height=size, ratio1:1, objectFit contain; wrapper radius10/overflow-hidden. Eager mặc định, không decoding/fallback. Public header/footer dùng36/28px, About dùng120px. Parent login thêm radius16/glow; feedback success parent tròn nhưng không overflow-hidden, bên trong vẫn radius10 | Thấp | Giữ eager/dimensions/contain cho logo trên fold; một lớp clip theo shape brand rõ, optional asset-error fallback. Không crop logo theo object-cover của listing |
| `src/pages/PortfolioPage.tsx:766–767,450–464` | Review avatar là div gradient; about avatar bubbles là div màu. Không phải ảnh chân dung tải chậm | Thấp | Chốt chúng là decorative mark hoặc thêm avatar thật khi có dữ liệu; không báo thiếu lazy trên div |
| `src/pages/BookingWorkflowDetailPage.tsx:1955–1966,2028` | Delivery hiển thị link thư mục/lịch sử link, không render thumbnails hay gallery album | Thấp | Giữ mô tả đúng chức năng hiện tại; chỉ xây gallery delivery khi có requirement và nguồn ảnh |
| `src/pages/PortfolioPage.tsx:626–637`; `src/pages/RentalCatalogPage.tsx:321–340`; `StudentFormPage/FeedbackFormPage` dùng PageLoader | Có skeleton **dữ liệu** gói/catalog và spinner form; không phải skeleton trạng thái tải từng ảnh. Không có chung image loading/error placeholder | Vừa | Bổ sung image-state contract giữ nguyên khung, placeholder neutral và error fallback. Đây là khoảng cần định nghĩa thêm vì DESIGN chưa quy định loading |

Các trang Bookings/Wizard/BookingWorkflow/NewRental/RentalList/RentalDetail/Register/Intake/Student/Profile không có ảnh nội dung render trong scope khách; logo chỉ xuất hiện ở các consumers kể trên. Không coi trang text-only là “thiếu lazy load”.

### 5.2. Tài nguyên và giới hạn phép đo

13 ảnh photography WebP được import trong Portfolio (`:5–17`); About dùng12, hero dùng3 và2 file trùng giữa hai vùng. Tổng13 file unique là **15.458.618 bytes (~14,74 MiB)**; nhóm About **14.356.068 bytes (~13,69 MiB)**; nhóm hero **6.624.238 bytes (~6,32 MiB)**. Riêng `TNV07899.webp` **4.066.744 bytes**. Logo **61.980 bytes**.

Đây là **dung lượng file nguồn**, không phải số byte trình duyệt thực tế tải, không phải LCP hay tốc độ tải đo được; không cộng hai nhóm ảnh có file trùng để kết luận payload. Chưa kiểm chứng cache, compression, browser scheduling hoặc behavior CSS-hidden. Chỉ dùng số này để ưu tiên resized variants và responsive delivery; WebP tự nó chưa bảo đảm ảnh nhẹ.

## 6. Thứ tự refactor từ ít rủi ro đến nhiều rủi ro

Đây là đề xuất cho bước tiếp theo; audit hiện tại chưa thực hiện bất kỳ refactor nào.

| Thứ tự | Phạm vi | Rủi ro | Kết quả mong muốn và kiểm chứng khi triển khai |
|---|---|---|---|
| 1 | Chốt mapping tokens/role và ngoại lệ của DESIGN | Rất thấp | Quy ước card14/button8/spacing4, form/container variants, status/loading bổ sung; map từng finding vào consumer khách. Chưa đổi code |
| 2 | Thêm customer scope/tokens ở các shell và trang chỉ khách, chưa chuyển toàn bộ consumers | Thấp | Không thay root/dark/default screens staff. Xác nhận scope không rò sang admin, state empty/loading vẫn đọc được |
| 3 | Thay màu, type, spacing, radius và shadow của markup chỉ khách | Thấp → vừa | Portfolio/catalog/register/intake/student/feedback đúng palette/scale; trước hết không đổi cấu trúc, handlers hoặc validation. So sánh normal/error/success/loading |
| 4 | Customer Button/Input/Textarea/FormField/Card/Badge/Rating variants, migrate consumers chỉ khách | Vừa | CTA48/input56/radius8/card14, focus/active/disabled thống nhất; verify keyboard/tab, required/error, pending submit. Không đổi primitives mặc định |
| 5 | Gom card gói/order/feedback section/price và format tiền | Vừa | Presentation reuse, unit và amounts bảo toàn; kiểm tra tên dài, nhiều size, selected/featured, tiền0, quote/cọc/còn thu/hoàn. Không gộp logic tính tiền giữa booking/rental |
| 6 | Sửa mobile cục bộ: rating wrap, form grid, action wrap/safe-area, quote summary | Vừa | Không tràn ngang ngoài vùng bảng có chủ đích, CTA không che form; verify320/360/390/744 và zoom200%, keyboard mở |
| 7 | Header/footer/container/breakpoint của toàn bộ customer shell | Vừa → cao | Nav80 desktop, menu sheet mobile, full/minimal footer và widths theo role. Verify links, active state, auth/logout, focus menu; staff layout giữ nguyên |
| 8 | Customer presentation trong các file shared: Login/Profile/Bookings/Workflow/RentalList/RentalDetail | Cao | Tách presentation hoặc branch rõ theo route/context. Login cần xác định entry khách trước khi biết role. Verify đồng thời khách và staff, feature gates, redirect/returnTo; không đổi authorization/actions |
| 9 | Responsive ảnh: resized variants/srcset/lazy/missing-image states; ảnh thật cho concept/catalog | Cao khi cần data | Ảnh Portfolio có thể tối ưu riêng trước nếu không đổi composition. Photo-first catalog/concept cần tài nguyên/schema/API; verify crop, loading/error/no-image, network và LCP. Không tự thêm phòng/thiết bị |
| 10 | Thay native ngày giờ bằng calendar/range/overlay khách | Cao | Day40 tròn/selected ink/range soft, keyboard/focus/mobile overlay hoạt động. Verify ngày VN, ranh giới qua ngày, start/end, receive/return, disabled dates và draft persistence |
| 11 | Reservation rail sticky, mobile price/CTA bottom hoặc thay bố cục bước checkout | Cao nhất | Review luồng đặt/thuê/gửi/chấp nhận báo giá; kiểm tra summary đúng state, pending/disabled và không gửi trùng. Chỉ thay khi contract UX đã rõ |

Các kiểm chứng trên dành cho đợt triển khai sau, **không phải test đã chạy trong audit**. Trình tự ưu tiên thay đổi có phạm vi hẹp và presentation trước, sau đó mới thay navigation, dữ liệu ảnh và tương tác ngày giờ/checkout.

## 7. Giới hạn và điểm cần chốt trước implementation

- Audit bao phủ các trang/component khách có thể xác định từ router và imports hiện tại; UI sau feature gate và nhánh dữ liệu chưa được render thực tế.
- Các giá trị pixel được suy ra từ config/CSS, có xét override radius/date; chưa đo computed styles của tất cả overrides ở runtime.
- Chưa xác nhận overflow, safe-area, popup calendar native, contrast thực tế, screen reader hay full accessibility compliance.
- Cần chốt ngoại lệ cho service/package cards, form widths, semantic success/warning, loading và footer tối giản. Đây là các phần DESIGN chưa mô tả đủ cho nghiệp vụ studio.
- Không có trang thiết bị/phòng chụp đang triển khai; không mở rộng scope thành xây tính năng mới trong đợt chuẩn hoá design.
- Chỉ thêm tài liệu audit này; không sửa source, config, assets hoặc các thay đổi working tree có sẵn.
