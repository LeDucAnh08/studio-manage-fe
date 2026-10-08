# QA refactor UI customer

Cập nhật: 2026-10-08 (Asia/Bangkok). Phạm vi: phần cơ sở UI00–UI26 của [plan](../../tasks/plan.md), đợt login O01–O04 và appearance AUTH01 theo phương án2 user chọn; O05–O10 còn có điều kiện.

## Đợt mới nhất: AUTH01, login/register phương án 2

Đã nghiệm thu layout dùng chung cho customer login/register: story nền phụ nhẹ và hai ảnh Yume thật ở desktop, form trắng phẳng; mobile có ảnh ngắn phía trên form. Font/palette/controls giữ token DESIGN, auth và staff JSX giữ nguyên. [Visual QA](../../design-qa.md) có `final result: passed`; [evidence AUTH01](customer-auth-layout-checks.md) ghi rõ khác biệt scale của ảnh sinh và phạm vi kiểm.

Checks mới: targeted3files/19tests pass, full check/TypeScript/Prettier pass, ESLint0errors/8warnings baseline, build4020modules/39.28s pass, source preservation pass. Browser kiểm login/register320/390/744/1128/1440, lỗi bắt buộc, invalid-login alert, links và Tab/focus; staff light1440×1024 trùng từng pixel. Full unit73/E2E2/browser35 của O01–O04 và các số đợt cơ sở bên dưới là evidence lịch sử; không chạy lại toàn bộ trong AUTH01. Chưa kiểm keyboard/zoom trên thiết bị thật trong đợt này.

## Kết quả và phạm vi

Đợt cơ sở chuyển 13 trang có giao diện customer cùng public/account shells sang palette trắng/ink/Rausch, Inter self-host, controls 56px/r8, CTA tối thiểu 48px và surfaces r14. Portfolio/catalog, các form, profile khách, wizard, danh sách và chi tiết booking/rental dùng các presentation primitives chung. User yêu cầu “refactor cả login luôn” ngày 08/10: trang thứ 14 dùng customer presentation tại `/login`; `/staff/login` giữ legacy ngoài CustomerScope.

Giữ controllers, auth handler/credentials, quyền, feature gates, draft, lịch theo giờ Việt Nam, tính tiền, accepted quote/version, consent và request keys. Customer scope bao auth bootstrap; staff vẫn giữ themeMode và defaults. Đợt login thay có chủ đích các entry ở guard/API 401/Sidebar; không ghi rằng các file này vẫn byte-identical.

So 162 baseline hashes sau login: **137 file giữ nguyên, 25 file có sẵn thay theo phạm vi**. Trong snapshot 77 file trước đây bất biến, 74 giữ nguyên và 3 thay entry contract: API interceptor, ProtectedRoute, Sidebar. AuthContext, default UI, E2E/config, DESIGN customer/admin, audit và 14 assets gốc giữ nguyên. AST auth handler/returnTo expression/legacy login JSX giống baseline. Số liệu đợt cơ sở trước login là 143 unchanged/19 changed và 77 bất biến; đây là evidence lịch sử, không phải snapshot mới. Manifest mới: `login-runtime/preservation-results.json`.

## Checks đã thực sự chạy

| Kiểm | Kết quả |
|---|---|
| Full frontend unit đợt cơ sở 08/10 | **11 files, 47 tests PASS**, 327.20s; forms5/orders13/scope6/controls3/media3/wizard3/register3/returnTo3/staff navigation8 |
| Full E2E đợt cơ sở 08/10 | **4/4 PASS**, 4.7 phút: booking, rental, workflow-business, reports; admin/accountant/photographer/customer journeys |
| TypeScript đợt cơ sở | PASS |
| Full ESLint đợt cơ sở | **0 errors, 8 warnings có sẵn**, không tăng so baseline |
| Full Prettier check đợt cơ sở | PASS; không format toàn repo |
| Production build đợt cơ sở | PASS, 4017 modules, 37.90s; API /api, portal/rental bật |
| Catalog/menu | 12 nhóm assertion PASS; 320/360/390/743/744/1127/1128/1440, grid1/2/4, filters/reset/states, menu keyboard/resize và staff parity |
| Feature gates | 28 nhóm shell/routes/alias/logout/boundaries + 3 CTA catalog PASS; portal+rental on, portal on/rental off, portal off |
| Member/feedback/profile | 32 runtime checks và một case browser zoom 200% PASS; [forms evidence](customer-forms-checks.md) |
| Lists/details/new rental | customer82/82, states23/23, staff10/10 PASS; [orders evidence](customer-orders-checks.md) |
| Portfolio/wizard/ảnh | UI, inline feedback, loading/error, metadata và network: [image evidence](customer-images-checks.md) |
| Staff visual đợt cơ sở | Profile1440×1000 light/dark PNG trùng từng byte với baseline; login bổ sung ở đợt sau |

Full unit/E2E chạy sau đợt sửa QA shared orders/hero. Điều chỉnh cuối cùng chỉ đổi feedback Surface sang padding16 để 5 sao vừa320px; sau đó kiểm lại Portfolio/inline feedback trên browser và chạy TypeScript/ESLint/Prettier/build. Không lặp E2E cho một prop spacing không đổi handler.

Warnings build hiện hữu: Browserslist data cũ và circular vendor-charts/vendor-react. Lượt E2E07/10 đầu từng bị Vite full reload khi một test source đang được format, làm tab reports reset; giữ source ổn định rồi full4/4 pass. Harness trước đó có false positives do focus transition, request cũ, whitespace của Price, radio visually hidden và bắt nhầm WebP ?import; đã sửa harness và kiểm lại, không sửa nghiệp vụ để né assertions.

E2E dùng replica set local27031 và **studio_phase1_e2e**; setup/teardown chỉ reset DB test cô lập. Preview5002 dùng demo DB được giữ nguyên. Browser QA form/order/feedback intercept các mutation; không tạo booking/payment/account/profile update thật ở DB demo.

## Đợt bổ sung login ngày 08/10

Implementation default đã thông báo: `/login` customer, `/staff/login` legacy. User đã yêu cầu refactor login nhưng chưa chọn URL cụ thể trong câu hỏi Q2 trước đó; không ghi rằng user đã chọn hai URL. Cả hai entry dùng cùng LoginPage và auth handler. `/login` public trong scope, không phụ thuộc portal/rental flags. Customer links/register/wizard/rental vẫn `/login`; staff Sidebar/logout và staff registration back link dùng `/staff/login`.

Guest `/` vẫn đến Portfolio; customer guard đến `/login`, staff guard đến `/staff/login`. Role checks, bootstrap và `safeBookingReturnTo` giữ nguyên. Guard guest vẫn lưu path+search, không lưu hash như baseline; LoginPage nhận validated state/query có hash. API 401 loại trừ `/auth/login`; account/booking/rental resume targets giữ window query/hash, các path khác chỉ chọn entry đúng surface. Customer login có Inter, white/ink/Rausch, input56/r8/16, CTA48, card14/title22; không glow hoặc shadow. Staff legacy markup/handler giữ nguyên.

| Kiểm đợt login | Kết quả |
|---|---|
| Full frontend unit sau sửa label | **14 files, 73/73 PASS**, 144.44s; bao Login13, scope11, API7 và entry1 cùng các tests có sẵn |
| Booking/rental E2E sau sửa label | **2/2 PASS**, 2.8 phút; giữ toàn bộ assertions, không sửa E2E source |
| TypeScript / ESLint cuối | PASS; ESLint **0 errors/8 warnings baseline** |
| Prettier / production build cuối | PASS sau format LoginPage line wrap; **4019 modules, 42.65s** |
| Browser responsive/staff/form | **23/23 PASS**: 10 viewport/theme, 2 staff PNG byte-identical và 11 interaction/role/return checks |
| Browser entry/refresh/expired-session | **12/12 PASS** |
| Preservation | **137 unchanged/25 expected changed**, không có unexpected changes; AST và 14 assets giữ nguyên |

Lượt E2E đầu booking pass/rental fail vì dấu sao required làm lệch exact accessible label. Source fix bỏ hai prop required trên CustomerFormField, giữ RHF required và input aria-required; không nới hoặc bỏ test assertions. Sau đó full unit và cả booking/rental E2E pass. Workflow-business/reports của full 4/4 là evidence đợt cơ sở trước login, không gọi là lượt full E2E mới.

Chi tiết credentials/error/pending/retry, safe state/query/hash, role redirects, screenshots và hạn chế tại [customer-login-checks.md](customer-login-checks.md). Browser login mutations được mock, E2E dùng DB test cô lập.

Browser tổng **35 nhóm PASS** (main23 + entry12), với chronology ghi rõ: 12 render checks kiểm lại trên source cuối, 11 interactions hoàn tất sau khi harness chờ focus transition ổn định; không gọi là một execution duy nhất. Main20 API requests gồm 8 login POST + 12 GET, entry8 gồm 6 refresh POST; toàn bộ mocked, không page errors/unexpected writes/mutation forward. O01–O04 đã hoàn tất trong phạm vi Chrome local.

## Runtime và các sửa QA cuối

- Header80, editorial1280/detail1080/list1440; gutters16/24/32 theo width. Public/account menu dưới744 có customer tokens trên portal, focus trap, Escape/focus return, scroll lock, đóng khi chọn link và resize lên744.
- Customer vẫn nền trắng/light dưới html.dark; stored themeMode=dark không đổi. Native date/time/select56/r8/font16; focus2px ink không glow. Customer→staff/toast lifetime được kiểm bằng scope tests và foundation runtime.
- Portfolio hero28/700, band64; concept grid1/2/4, service/package grid1/2/3 là variant nghiệp vụ. Alias/anchors, package compare≤3, draft refresh, native VN date/time và review giữ nguyên.
- Catalog cards dùng khung1:1/r14 và ghi “Minh hoạ nhóm hàng” khi chưa có ảnh thật; không gán ảnh kỷ yếu làm ảnh sản phẩm. Query loại/danh mục/size/giá và CTA fallback giữ item/source/itemName.
- Form height/weight một cột dưới744 rồi hai cột; rating radio native, icon ink, vùng48px. Feedback bar trắng opaque, ResizeObserver đo clearance; giả lập inset+24px và tăng status text200% không che field cuối.
- New rental có gutter16/top32; booking empty r14, caption thông báo13, resource badge neutral. Mobile≤390 xếp label/value tài chính đầy chiều rộng: tổng9.876.543.210 ₫ không vỡ nhóm số.
- Quote/payment giữ quantity/unit/server total/cọc/còn thu/hoàn; rental giữ đơn giá theo cả kỳ thuê và phí gia hạn. Tests kiểm total do server cung cấp độc lập tổng dòng, tiền0/số lớn, stale quote, pending duplicate và retry key.
- Drive links customer có underline/focus; timeline dùng hairline. Các lớp staff của những nhánh này giữ nguyên.

## Ảnh và measured delivery

CustomerImage khai báo dimensions, srcset/sizes, frame trung tính/r14, alt có nghĩa hoặc rỗng cho ảnh trang trí. Ảnh hero đầu eager/high, các ảnh còn lại native lazy/async; collage hiện trên mobile, crop cover, logo contain. Delayed/error/blocked-image giữ geometry; reduced-motion dùng scroll instant.

13 nguồn gốc: **15.458.618 bytes**, giữ nguyên SHA256. Thêm13 WebP640w quality82, tổng **453.330 bytes**. Resize giữ toàn ảnh theo tỉ lệ; crop chỉ ở frame hiển thị. Đã xem contact sheet và đo mọi derivative. File sizes không phải network payload trong mọi viewport.

| Viewport/DPR | CDP photo response bytes sau tải bộ ảnh | Original candidates |
|---|---:|---|
| 390px, DPR1/2/3 | 456.816 mỗi case | 0 |
| 1440px, DPR1 | 456.816 | 0 |
| 1440px, DPR2 | 1.912.032 | 1 |
| 1440px, DPR3 | 7.051.584 | 3 |

Số CDP chỉ gồm ảnh Portfolio, không gồm logo/CSS/font/JS/API. ResourceTiming ở case DPR3 thiếu entries nên ghi partial trong evidence, không dùng làm tổng đầy đủ. Browser native lazy vẫn có thể tải ảnh gần viewport sớm. Chưa đo LCP production hoặc tốc độ thiết bị thật; desktop DPR2/3 vẫn chọn ảnh gốc lớn. Candidate trung gian tiếp theo cần một asset task riêng dựa vào measurements này.

UI25 có điều chỉnh thực thi: generation groups thực tế2/2/3/3/3, mỗi lệnh không quá5 file; hậu kiểm đủ13 nguồn theo review groupsA–E3/3/3/3/1. Không khẳng định đã theo đúng chronology A–E ban đầu hoặc có network log ngay sau từng bước tạo. Bốn thử nghiệm1280 tạm đã bỏ trước tích hợp; chỉ13 variants640 tồn tại.

## Disposition 48 findings

Closed chỉ áp phạm vi implementation đã kiểm. Sau nghiệm thu login, 9 findings trước đây partial chỉ vì login được đóng: **40 Closed, 4 Partial, 3 Exception, 1 Deferred**. Partial/Deferred/Exception giữ rõ phần chưa đạt DESIGN; không gọi toàn giao diện 100% tuân thủ.

| Finding | Trạng thái | Evidence / phần còn mở |
|---|---|---|
| C01 | Closed | Scoped customer palette và consumers; root/staff tokens giữ nguyên |
| C02 | Closed | Public/account/login customer light; staff login ngoài scope giữ theme và legacy |
| C03 | Closed | Portfolio/catalog/CTA chuyển sang white/soft/ink/Rausch |
| C04 | Closed | Student/feedback/login customer CTA Rausch; staff gradient giữ riêng |
| C05 | Closed | Form/content/catalog accents dùng neutral roles |
| C06 | Closed | Lifecycle labels giữ nguyên, customer status neutral/error là extension |
| C07 | Closed | Fields/helper/required/error dùng customer error; validation/payload giữ |
| C08 | Closed | Profile customer dùng tokens; staff/default/Telegram được đối chiếu |
| C09 | Closed | Portfolio/feedback rating dùng chung ink |
| C10 | Closed | Scope bao auth loading trước ClientLayout; role/bootstrap logic giữ, login entry theo surface |
| T01 | Closed | Inter self-host có102 codepoints tiếng Việt đã kiểm, semantic type roles |
| T02 | Closed | Hero28, headings22/20, catalog/card/price roles |
| T03 | Closed | Titles customer22 và sections20 trên booking/rental flows |
| T04 | Closed | Forms/register/profile/login customer dùng Inter và semantic type roles |
| T05 | Closed | Shared title16, amount16/total21 và unit/meta theo domain |
| T06 | Closed | Controls16, labels14, helper13; refs/native attributes giữ |
| T07 | Exception | Caption13/14; lifecycle status13 để đọc nhãn dài, badge11 dành nhãn ngắn |
| K01 | Closed | Customer CTA48/r8, active/disabled/focus; login pending/error/retry đã kiểm |
| K02 | Closed | CTA Link/button chung; customer login /login, staff entry /staff/login |
| K03 | Closed | Customer fields56/r8/white; login refs/required/autocomplete/ARIA đã kiểm |
| K04 | Closed | Native select/date/time/text cùng shell56/r8, verified dưới dark |
| K05 | Closed | Shared field presentation, labels/helpers/errors và native semantics |
| K06 | Partial | Field shell đã chuẩn; native popup khác DS day40/range, O05–O07 deferred |
| K07 | Partial | Catalog geometry/type/price/grid đúng base; ảnh thật/schema/mapping chờ O10/Q3 |
| K08 | Closed | Package marketing/select/compare dùng shared presentation, compare≤3 |
| K09 | Closed | Order cards/status/pagination booking/rental đồng bộ |
| K10 | Closed | Price/breakdown roles chung, giữ nguồn số và semantics tài chính |
| K11 | Closed | CustomerPrice dùng vi-VN/₫; staff formatter cũ được giữ |
| K12 | Partial | Filter/status/pagination hiện có chuẩn; keyword/pill search chờ O10/Q1 |
| K13 | Closed | Header80/nav/active/menu; customer links giữ /login và staff links chuyển entry legacy |
| K14 | Exception | Full footer3 nhóm và minimal account; standalone auth/forms giữ layout tập trung |
| K15 | Closed | Shared native rating48/focus/keyboard, customer feedback actions giữ |
| K16 | Closed | Shared surfaces/feedback sections/native choices, profile appearance riêng |
| L01 | Closed | Portfolio major bands64; catalog/form density theo role |
| L02 | Exception | Base spacing tokens; narrow form/image composition có variants được ghi |
| L03 | Closed | Container variants1280/1080/1440 và form448/576/672/768 theo role |
| L04 | Closed | Customer surfaces phẳng/one shadow; login customer không glow/shadow |
| L05 | Closed | Customer cards/photos14, controls8; login metrics đã kiểm |
| L06 | Partial | Feedback bar opaque/clearance đúng; reservation rail/actions O08–O09 còn mở |
| R01 | Closed | Scoped744/1128/1440, giữ default staff screens; boundaries được kiểm |
| R02 | Closed | Customer mobile menu thay nav chip scroll; header80 và focus behavior |
| R03 | Closed | Catalog/concept1/2/4; service/package1/2/3 là domain variant |
| R04 | Closed | Hero/mobile/about composition responsive, crop và bounds được kiểm |
| R05 | Deferred | Sticky rail/bottom price/CTA theo state chờ O08–O09 |
| R06 | Closed | Mobile financial labels/list giữ qty/unit/total/payment/due/refund |
| R07 | Closed | Rating và form grids vừa320, labels dài wrap/stack |
| R08 | Closed | Base actions/pagination wrap, feedback safe-area/clearance giả lập; OS limits bên dưới |
| R09 | Closed | CTA/menu/rating có touch/focus contract; nhãn CTA dài có thể cao68 để không clip |

Ảnh thật concept/catalog, phòng/thiết bị/detail/wishlist/search mới không được invent. Những bề mặt chưa có implementation vẫn ngoài base; các gaps data/interaction không được đóng bằng mock hoặc documentation.

Review bổ sung còn một mục polish typography ở nhánh có dữ liệu lịch sử: hai summary báo giá/bàn giao trong BookingWorkflowDetailPage vẫn14/600, trong khi các h3 phiên bản RentalDetailPage kế thừa16/400. Chưa đồng bộ chúng với role title16/600; đây là gap nhỏ được ghi riêng, không thay disposition của finding T05 vốn nói về card/price/profile trong audit ban đầu.

## Điều kiện và giới hạn

Q1 chưa chọn calendar/search/data mở rộng; Q3 chưa có nguồn/mapping ảnh mới. O08/O09 cần chốt composition consent/sticky sau base. Login đã được yêu cầu ngày 08/10 và triển khai theo mặc định Q2 được ghi ở trên; user chưa chọn URL cụ thể trong câu hỏi trước đó, không coi hết thời gian là approval.

QA dùng Chrome Windows headless/viewport/touch emulation. Feedback đã kiểm browser zoom toàn trang 200% bằng Chrome Settings trên profile cô lập: cùng cửa sổ 656×1000, innerWidth640→320 và DPR1→2; không dùng CSS zoom hoặc giả lập DPR. Không overflow, field cuối khi focus nằm trên bar và clearance khớp chiều cao bar. Case này chỉ kiểm feedback, không phải mọi trang ở 200% hoặc login. Chưa thử Safari, keyboard iOS/Android, native OS picker popup hoặc safe-area trên thiết bị thật. Status text200% và inset+24px là stress fixtures, không thay các kiểm tra OS đó. Staff pixel parity gồm profile và login ở hai theme; các staff branches khác kiểm source/default controls/gates và E2E, không phải toàn bộ visual regression.

Flag matrix browser kiểm guest ở portal-off, guest/client ở portal-on/rental-off và cả hai bật. Không chứng minh mọi role trong mọi tổ hợp flag hoặc behavior khi triển khai cấu hình production. Feature gates và guard role logic giữ nguyên; chỉ login destinations thay ở đợt bổ sung. Mocks chứng minh frontend presentation/request handling, không tự chứng minh backend privacy/concurrency hoặc external Drive access; E2E local bổ sung các journeys có sẵn.

## Evidence và rollback

- [Foundation lịch sử](QA-foundation.md), [baseline](customer-baseline.md), [foundation commands](customer-foundation-checks.md).
- [Forms](customer-forms-checks.md), [orders](customer-orders-checks.md), [images](customer-images-checks.md), [login](customer-login-checks.md).
- Artifact local: C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/{baseline,foundation,continuation,gates-runtime,forms-runtime,orders-runtime,portfolio-runtime,zoom-runtime,login-runtime}/; các JSON/PNG/script là ignored và không phải CI visual suite.
- Preservation: manifest base tại C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/preservation-results.json; manifest sau login tại login-runtime/preservation-results.json.
- Preview: [Portfolio](http://127.0.0.1:4013/portfolio), [catalog](http://127.0.0.1:4013/costumes), [customer login](http://127.0.0.1:4013/login), [staff legacy login](http://127.0.0.1:4013/staff/login).
- UI25 implementation path thực: src/assets/images/customer-portfolio/ và src/assets/images/portfolio-images.ts. Styles chia theo customer consumer thay vì dồn mọi thay đổi vào customer.css; controllers giữ trong pages.

Rollback từng presentation task/batch bằng diff của 19 file base và 6 file có sẵn bổ sung cho login cùng các customer components/styles/font/variants/tests mới; đảo manifest về nguồn gốc khi cần. Giữ các business/untracked changes đã có trong baseline; không reset/revert toàn working tree. Các sửa QA base cuối chia một batch4 source files và một batch1 prop Portfolio; login có các batches riêng theo O01–O04. Đây là bản local; chưa merge/deploy.
