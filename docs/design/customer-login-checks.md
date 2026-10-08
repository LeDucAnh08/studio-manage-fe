# Customer login: implementation và kiểm chứng

Ngày 2026-10-08 (Asia/Bangkok). Phạm vi: O01–O04 của [plan](../../tasks/plan.md), bổ sung sau khi user yêu cầu “refactor cả login luôn”. Evidence base 47 unit tests/4 E2E trong [QA-customer.md](QA-customer.md) là đợt trước; không cộng tests chọn lọc để gọi là full suite mới.

User sau đó chọn phương án 2 hiển thị cho login/register. Appearance hiện tại được ghi ở [customer-auth-layout-checks.md](customer-auth-layout-checks.md) dưới task AUTH01. Full73/73, E2E2/2 và browser35 trong tài liệu này là evidence lịch sử O01–O04 trước layout mới, không phải các lượt đã chạy lại cho AUTH01. Entry contract vẫn giữ nguyên.

## Entry contract

Implementation default đã thông báo trong commentary: `/login` dùng customer presentation; `/staff/login` giữ legacy. User đã cho phép refactor login nhưng chưa chọn URL cụ thể trong câu hỏi Q2 trước đó. Hai URL này là quyết định triển khai được ghi rõ.

| Surface hoặc tình huống | Entry / behavior |
|---|---|
| Direct `/login` | Route public trong CustomerScope; không phụ thuộc portal/rental flags |
| Direct `/staff/login` | Route public ngoài CustomerScope; same LoginPage, legacy JSX và theme |
| Customer header/register/wizard/rental | Tiếp tục dùng `/login`; không cần sửa source các link này |
| Staff Sidebar/logout và staff registration back link | `/staff/login` |
| Guest ở `/` | Vẫn đến `/portfolio` |
| Guest customer protected route | `/login`; guard chờ bootstrap và giữ validated path+search state như baseline, không lưu hash |
| Guest staff protected route | `/staff/login`; required/allowed roles giữ nguyên |
| API 401 ở `/auth/login` | Không redirect; lỗi hiển thị tại form như cũ |
| API 401 ở account/booking/rental resume paths | Tiếp tục `/login?returnTo=...`, giữ path/query/hash như trước |
| API 401 ở các path khác | `loginEntryForPath` chỉ chọn entry theo surface |

`loginEntryForPath` chọn presentation, không cấp quyền. AuthContext, auth credentials/payload, `safeBookingReturnTo` whitelist, role redirects, booking/rental draft, request keys và feature gates giữ nguyên. Cả hai entry gọi cùng handler. Role 6 đến safe return target hoặc `/account/bookings`; role 5 đơn lẻ đến `/manage/finance`; các staff role khác đến `/` theo logic hiện có. Tài khoản staff đăng nhập qua customer entry vẫn redirect theo roles.

## Presentation và preservation

Customer login hiện reuse `CustomerAuthLayout` chung với register, cùng CustomerInput/CustomerFormField/CustomerButton. Desktop có story nền #f7f7f7 và ảnh Yume bên trái, form trắng phẳng tối đa400px bên phải; mobile dưới744 có ảnh chính144px và ẩn ảnh phụ. Inter self-host, white/ink/Rausch, fields56px/r8/font16, CTA48px/r8, photo14, h1 22px giữ theo DESIGN. Card giữa trang của O01 là presentation lịch sử; metric token và form behavior được giữ khi đổi layout. Xem [evidence AUTH01](customer-auth-layout-checks.md). Không glow/gradient/shadow. Labels, native refs, username/current-password autocomplete và password type được giữ. Required validation vẫn chạy qua react-hook-form; customer branch bổ sung thông báo lỗi và ARIA mô tả lỗi/required. Khi pending, form có `aria-busy` và submit disabled; API error dùng `role="alert"`.

Required validation vẫn ở react-hook-form và input `aria-required`. Không thêm dấu sao vào accessible field name: E2E rental cũ dùng exact label và phải tiếp tục hoạt động; assertion không bị nới hoặc xoá.

So baseline 162 files: **137 giữ nguyên, 25 file có sẵn thay theo phạm vi**. Sáu file mới thay trong đợt login ngoài 19 file base: LoginPage, ProtectedRoute, api, Sidebar, RegisterRequestPage, usePageTitle. Trong snapshot 77 file trước đây bất biến, 74 giữ nguyên và 3 được thay có chủ đích cho entry contract: API interceptor, guard, Sidebar. Không ghi rằng toàn bộ services/guards/staff shell vẫn byte-identical sau đợt này.

AST đối chiếu xác nhận `onSubmit`, returnTo expression và legacy login JSX giống baseline. 14 assets gốc gồm 13 Portfolio images và logo giữ nguyên; DESIGN customer/admin và audit giữ SHA256. Manifest local: `login-runtime/preservation-results.json`; `unexpectedChanged` rỗng.

| Staff legacy screenshot lịch sử O01–O04, 1440×1000 | SHA256 trước/sau |
|---|---|
| Light | `cf7599e00257102e59127f7428cef56c43df0c09d7319d422e12ec6d27eb0732` |
| Dark | `5a9f0a676d10357e1c3af34c5028b6a0ba98f014fa003d195f3ed4e22638d099` |

Hai PNG trùng từng byte. Link đích staff mới được kiểm riêng; pixel parity không chứng minh navigation. Phạm vi này chỉ login, bổ sung hai theme profile đã kiểm ở đợt base; không phải toàn staff visual regression.

## Checks lịch sử đã chạy cho O01–O04

| Kiểm | Evidence / trạng thái |
|---|---|
| Focused frontend unit đợt đầu login | **31 PASS**: Login13, scope11, register3, returnTo3, loginEntry1 |
| Full frontend unit sau sửa label | **14 files, 73/73 PASS**, 144.44s |
| API interceptor unit | **7/7 PASS** trong full suite: login401 loại trừ redirect, staff entry, customer non-resume và customer resume query/hash |
| TypeScript / ESLint / Prettier cuối | PASS sau sửa label; ESLint 0 errors/8 warnings baseline; chỉ format LoginPage line wrap |
| Production build cuối | PASS, 4019 modules, 42.65s |
| Responsive/theme metrics | 10 cases PASS: 320/390/744/1128/1440 × light/dark; không overflow, customer light dưới html.dark, stored themeMode giữ |
| Staff legacy screenshots | 2/2 byte-identical với baseline |
| Entry/refresh/API expired-session runtime | 12/12 PASS, `entry-results.json` |
| Main responsive/pixel/form interaction runtime | **23/23 PASS**, `results.json`; 12 render checks trên source cuối + 11 interactions sau khi chờ focus transition ổn định |
| Booking/rental E2E cuối | **2/2 PASS**, 2.8 phút; giữ toàn bộ assertions và E2E source |
| Preservation | PASS, số liệu và AST ở phần trên |

Runtime main kiểm required validation không gửi API, focus/ref/ARIA, Tab username→password→submit→register, Enter submit, error giữ credentials, retry/pending/duplicate button và Enter, client/staff role redirects, safe state/query/hash return precedence, unsafe return fallback và register link giữ safe state. Entry runtime kiểm guest staff/customer destinations, root→Portfolio, staff registration link, public login sau refresh cho role 0/6, expired-session redirect ở staff và customer có query/hash.

Tổng browser **35 nhóm PASS**, gồm main23 và entry12; không phải một execution duy nhất. Source cuối được kiểm lại 10 responsive và 2 staff pixel checks, rồi hoàn tất 11 interactions sau khi harness chờ 180ms cho focus transition. Harness có hai false positives riêng: đọc outlineWidth3px khi outlineStyle là none dù focus border thực tế2px; sau đó lấy border RGB37 trong transition120ms thay vì ink RGB34 khi đã ổn định. Đã sửa cách đo và chờ 180ms, không sửa source để né assertion. JSON ghi rõ `sourceChronology` và `harnessChronology`.

Diagnostics main: 20 mocked API requests (8 login POST, 12 GET); entry: 8 mocked requests gồm 6 refresh POST. Không page errors, unexpected writes hoặc API mutation forward tới demo. `results.json` và `entry-results.json` đều `success: true`. O01–O04 hoàn tất trong phạm vi kiểm này.

Lượt E2E đầu booking pass/rental fail do dấu sao required làm lệch exact accessible label. Source fix giữ label cũ bằng cách bỏ hai prop required trên CustomerFormField; RHF required và input aria-required vẫn giữ. Sau đó full unit, cả booking/rental E2E và final check/build đều pass. Workflow-business/reports không chạy lại trong đợt login; full 4/4 của đợt cơ sở vẫn là evidence lịch sử.

Browser mutations bị intercept bằng fixtures; không tạo tài khoản, booking hoặc cập nhật dữ liệu demo. E2E dùng replica set localhost27031 và DB `studio_phase1_e2e` cô lập theo harness hiện có; setup/teardown chỉ reset DB test, Mongo test đã dừng sau nghiệm thu. Demo Mongo27029/backend5002/preview4013 được giữ. Runtime mocks kiểm frontend request/redirect handling, không chứng minh backend auth/security hay concurrency đầy đủ.

## Artifacts và giới hạn

Artifacts ignored tại `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/login-runtime/`: baseline/results, responsive/login-state PNGs, `verify.cjs`, `verify-entry.cjs`, `results.json`, `entry-results.json`, preservation manifest và nguồn trước sửa phục vụ đối chiếu. File `partial.json` của lượt chưa hoàn tất không phải báo cáo nghiệm thu; dùng hai JSON `success: true` kể trên.

Chrome Windows, viewports/touch emulation. Chưa kiểm login ở whole-browser zoom 200%, iOS/Android keyboard, Safari hoặc password manager thật. Case zoom 200% của feedback ở đợt base không được suy thành login đã kiểm zoom. Không sửa OS/browser prefs của profile người dùng.

Preview: [Customer login](http://127.0.0.1:4013/login) và [staff legacy login](http://127.0.0.1:4013/staff/login). Đây là bản local, chưa merge/deploy. Rollback theo các source/test batches của login, giữ business changes và assets có sẵn; không reset toàn working tree.
