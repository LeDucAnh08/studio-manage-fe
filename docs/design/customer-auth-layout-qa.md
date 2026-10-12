# Design QA: customer auth, phương án 2

Ngày 2026-10-08 (Asia/Bangkok). Phạm vi AUTH01: customer `/login` và `/register`.

## Nguồn và evidence

- Visual truth: mockup thứ hai đã hiển thị, được user chọn; `C:/Users/Admin/.codex/generated_images/01a10f5c-9fa0-7e63-9b54-9b7028d55721/exec-34dd286b-51ea-4eae-86d7-23d5d9bd048d.png`.
- Artifact directory: `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/auth-ideation/`.
- Implementation chính: `login-1440-verified.png`, viewport/CSS size 1440×1024, devicePixelRatio 1, raster 1440×1024; trạng thái ban đầu, fields rỗng, không lỗi/pending.
- Source raster 1487×1058, mockup desktop dự kiến 1440×1024. Fit tỷ lệ và pad trắng tới canvas1440×1024 để so sánh; không thay đổi ảnh nguồn hoặc kéo giãn.
- Full-view comparison: `desktop-comparison.png`; source bên trái, implementation bên phải, tổng canvas2880×1024. Đã mở và đối chiếu cùng một ảnh.
- Focused comparison: `form-comparison.png`, hai crop600×640 từ vùng form của source/implementation; đã kiểm chữ, labels, control, CTA và footer link.
- Register: `register-desktop.png` và `register-{320,744,1128,1440}-verified.png`. Mobile login: `login-mobile.png` (390×844), `login-320-verified.png` (320×844). Cả login/register có native captures744/1128/1440×1024.

## Findings và các khác biệt có chủ đích

Không còn finding P0/P1/P2 cần sửa trong phạm vi đã kiểm. Không cần vòng sửa visual source sau lần so sánh đầu; final captures xác nhận layout hiện tại.

Mockup sinh phóng lớn chữ/control so với brief DESIGN. Implementation giữ yêu cầu DESIGN gốc: Inter, h1 22/500, headline story28/700 desktop và20/600 mobile, text14–16, input56/r8, CTA48/r8. Logo dùng asset và component48 có sẵn. Form max400 theo brief, không phóng lên chiều rộng mà ảnh sinh thể hiện. Đây là constraint được thông báo trước implementation, không phải pixel match toàn bộ ảnh sinh.

Ảnh bạn bè giữ source vuông1:1 thay vì crop/kéo dài của ảnh sinh. Desktop giữ story/form53/47, nền phụ nhẹ, ảnh chính đứng và ảnh phụ cùng cạnh dưới; mobile xếp dọc với ảnh chính144px. Các điều chỉnh typography và tỉ lệ ảnh giữ đúng design system và source thật.

| Fidelity surface | Kết quả đối chiếu                                                                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts/typography | Inter Customer self-host đã loaded; h1 duy nhất22/500, story28 theo token, labels14/input16; copy không cắt hoặc chồng. Scale khác mockup được ghi rõ ở trên.                                                                                                                                |
| Spacing/layout   | Hai vùng53/47; form phẳng max400, không border/shadow quanh panel; ảnh14, fields/CTA8; spacing16/24/32/48/64. Mobile một cột, gutters16, form cuộn tự nhiên. Không overflow ngang tại320/390/744/1128/1440.                                                                                  |
| Colors/tokens    | Computed story rgb(247,247,247), form white, ink/muted theo tokens, CTA rgb(255,56,92). Không thêm palette, glow hoặc gradient.                                                                                                                                                              |
| Images/assets    | Logo gốc và hai ảnh Portfolio thật đúng người/scene; dùng preview640 WebP có sẵn, ảnh đứng2:3 và ảnh phụ1:1. Desktop rõ nét ở DPR1, mobile crop giữ mặt. Main eager/high priority; ảnh phụ lazy/ẩn mobile. CustomerImage giữ reserved frame và placeholder/error contract được test hiện có. |
| Copy/content     | Heading/intro/labels/CTA/link đúng nội dung hiện có và copy story của phương án2; không thêm social login, reset password, checkbox, testimonial hoặc claims chưa có nguồn.                                                                                                                  |

## Tương tác và preservation

- Login/register liên kết qua lại; một h1/form mỗi trang, exact native labels và autocomplete vẫn đúng.
- Submit rỗng: login hiện hai lỗi bắt buộc; register hiện ba lỗi bắt buộc, focus field đầu. Không tạo tài khoản thật trong browser QA.
- Tab login: brand → username → password → submit → register; link/button có outline solid2px, input có border2px khi focus. `keyboard.json` và `login-keyboard-focus.png`.
- Một invalid-login fixture qua preview hiện thông báo `role=alert`; form trở về `aria-busy=false`, submit enabled. `login-mobile-api-error.png`.
- Browser console: không ghi nhận error/uncaught exception trong `console.json`; warnings React Router có sẵn. Pending và redirect/return contracts được kiểm bằng tests hiện có, không giả định đã stress mọi nhánh API trong browser.
- Source review: ba form subtrees, requestedReturnTo/returnTo/returnState/onSubmit giống bản trước; auth, routing, API và staff JSX không sửa trong AUTH01.
- Staff light1440×1024 trước/sau trùng từng pixel (`staff-before.png`, `staff-after.png`, `visual-comparison.json`). Không gọi đây là kiểm toàn bộ staff/dark matrix.

## Checks và lịch sử capture

- Targeted unit: 3files/19tests PASS (Login13/Register3/Media3), 91.45s.
- `npm run check`: PASS, TypeScript/Prettier pass, ESLint0errors/8warnings baseline.
- `npm run build`: PASS, 4020modules,39.28s; warnings Browserslist/circular vendor có sẵn.
- Preservation: 137/162baseline files unchanged,25expected changes của các đợt trước;14original images và DESIGN/audit giữ hash, không có unexpected change. Shared layout mới nằm ngoài baseline162.
- Capture correction: `login-320.png` từ fullPage ngay sau resize có ảnh compositor không khớp DOM. Không dùng file đó làm evidence. Fresh AX + native screenshot đã chụp lại toàn bộ widths thành `*-verified.png`; đã mở320/744/desktop để xác nhận thực tế. Không có UI source fix tương ứng, vì runtime geometry và native capture đều đúng.
- Unit ban đầu bị sandbox chặn esbuild đọc config; chạy lại ngoài sandbox đã pass. Build chạy ngoài sandbox cùng lý do. Không có auto-review rejection.

## Implementation checklist và giới hạn

- [x] Layout được chọn đã áp cho login/register customer.
- [x] Assets thật, tokens, responsive, validation/link/focus đã đối chiếu.
- [x] Relevant unit/check/build và staff/source preservation pass.
- [x] Mở source cùng final capture; xem full-view và focused comparison.
- [x] Viewport override đã reset; tab QA riêng đã đóng, preview hiện có vẫn chạy.

Full suite73/E2E2 của O01–O04 là lịch sử, không chạy lại trong AUTH01. QA mới dùng IAB Chrome Windows, DPR1 và viewport emulation; chưa kiểm Safari, mobile keyboard thật, whole-browser zoom200%, password manager hoặc DPR2/3. Không có P3 bắt buộc còn lại; các giới hạn này không được suy thành đã kiểm trên thiết bị thật.

final result: passed
