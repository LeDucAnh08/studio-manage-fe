# Design QA: navbar customer, phương án 1

Ngày 16/10/2026, Asia/Bangkok. Phạm vi: CustomerHeader chung trong PublicSiteLayout/ClientLayout, avatar/mobile menu, tab danh sách Chụp ảnh/Đơn thuê. Không dựng lại nội dung trang, hero, danh sách, nghiệp vụ hoặc header riêng của wizard.

## Visual truth và capture

Source được chọn theo thứ tự ảnh thực sự hiển thị (ảnh đầu tiên, nhóm tab nền xám): C:/Users/Admin/.codex/generated_images/01a10f5c-9fa0-7e63-9b54-9b7028d55721/exec-99c0e315-6867-4ea4-8bc7-2962f842e376.png.

Artifacts: C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/navigation-review/navbar-ideation/qa/.

- Source board1586×992, gồm hai trạng thái của cùng navbar. selected-navbar.png là bản copy nguyên vẹn.
- Implementation viewport1440×1024, DPR1. final-account-desktop.png và final-account-menu-desktop.png:1440×1024. final-explore-desktop.png:1434×1020, do mép native/scrollbar của in-app browser. Không kéo giãn bù mép.
- comparison.html đặt source và hai trạng thái render cùng một canvas, có full-view và focused region đọc rõ nhóm tab/avatar/local tabs. final-comparison.png1600×1000 đã được mở trực tiếp để so sánh.
- Cùng state active Khám phá/Dịch vụ của tôi và account avatar mở. Nội dung hero/notifications/filter/list hiện có khác bối cảnh mockup và ngoài phạm vi navbar; không gọi đây là pixel match toàn trang.
- account-{320,390,744,1128,1440}.png và mobile-menu-390.png/mobile-explore-menu-390.png lưu responsive. metrics.json lưu số đo DOM.

## Findings và lịch sử sửa

Không còn P0/P1/P2 cần xử lý trong phạm vi đã kiểm.

| Finding | Sửa | Evidence sau sửa |
|---|---|---|
| P2: main links dịch ngang3px giữa trang ngắn và trang có scrollbar | scrollbar-gutter:stable chỉ khi html chứa customer-ui | Sau sửa ba link có cùng x=446.578/635.781/774.875 và cùng width giữa account/explore tại1440; metrics.json |
| P2: mobile logout ở /portfolio không đóng drawer vì pathname không đổi | Content đóng menu khi chọn link hoặc button | Regression same-path logout trong CustomerHeader.test.tsx đạt |
| P2: role6/portal-off có thể đi vào staff /profile rồi chuyển về account route không tồn tại | Khách portal-off đi tới liên hệ, ẩn Hồ sơ nhưng giữ Đăng xuất; staff vẫn /profile | Test role6/portal-off không có href /profile hay /account, CTA tư vấn và liên hệ đúng |

## Năm bề mặt fidelity

- Fonts/typography: Inter Customer tự host; nav16/600, body14–16 và control48 theo DESIGN-customer.md. Mock raster chữ lớn hơn; giữ tokens là điều chỉnh có chủ đích. Không thay font sản phẩm.
- Spacing/layout: header88 desktop, rail56 và link48, white active segment với gạch hồng; dưới1128 dùng header72 và menu drawer. Ba mục giữ nguyên thứ tự/kích thước/vị trí giữa public/account, kể cả detail. Chụp ảnh/Đơn thuê ở dưới tiêu đề danh sách.
- Colors/tokens: trắng, rail #f7f7f7, ink #222222, primary #ff385c; avatar dùng color-mix từ primary. Menu portal có customer-tokens. Shadow chỉ dùng trên menu.
- Image quality/assets: giữ logo Yume thật và ảnh hiện có, không có raster mới trong phạm vi navbar. Avatar là tên viết tắt từ tài khoản (Nguyễn An → NA), không phải ảnh placeholder. Chevron/User/LogOut dùng Lucide đã có, đúng kiểu nét mockup.
- Copy/content: Khám phá dịch vụ / Trang phục / Dịch vụ của tôi / Đặt lịch; menu Hồ sơ / Đăng xuất và local tabs Chụp ảnh / Đơn thuê đúng lựa chọn. H1/browser title customer list dùng Dịch vụ của tôi; staff giữ title hiện có.

## Runtime, checks và giới hạn

- 320/390/744/1128/1440: không tràn ngang, một main, CTA48, mobile links49. Đã mở captures390/menu/1128 và desktop comparison; không có nhãn dev mới trong giao diện.
- Browser kiểm account → explore → costumes → account; avatar mở, Escape trả focus; mobile giữ thứ tự, chuyển route đóng menu, resize lên1128 đóng drawer. Selected dùng shape/underline và aria-current.
- 49/49 targeted ban đầu (navbar17, scope11, orders17, wizard4). Sau bổ sung mobile regression: navbar18 + Breadcrumbs2 đạt20/20. Sau sửa tổ hợp flag-off, navbar18 chạy lại đạt18/18. Tổng52 kiểm thử riêng biệt đã đạt qua các lượt, không phải52 trong một lượt.
- TypeScript noEmit, lint và Prettier đạt; full lint0errors/8warnings baseline. Vite build4025 modules đạt; Browserslist và circular chunk warning từ cấu hình hiện có. Không thêm dependency.
- Browser console khi chốt final capture không có runtime error. Account QA dùng fixture bộ nhớ4016/5016. Public/catalog fixture thiếu một số GET; không dùng để kết luận nghiệp vụ catalog. Không submit booking, ghi DB, seed/reset, đổi API/auth/permission hoặc deploy.
- Safari, screen reader và bàn phím mobile thật chưa kiểm. Không tuyên bố tuân thủ WCAG đầy đủ.

## Checklist và evidence trước

- [x] Một header chung, rail/active/menu/avatar đúng phương án hiển thị đầu tiên.
- [x] Main nav không bị thay bằng menu account; local tabs đúng tầng; không thêm back link trùng.
- [x] Admin/staff và header wizard giữ phạm vi hiện có.
- [x] Source/render cùng canvas, responsive, focus và interactions đã kiểm; P2 đã sửa.

BOOK02 trước được giữ tại [customer-booking-intake-qa.md](customer-booking-intake-qa.md); BOOK01 tại [customer-booking-wizard-qa.md](customer-booking-wizard-qa.md); AUTH01 tại [customer-auth-layout-qa.md](customer-auth-layout-qa.md).

final result: passed
