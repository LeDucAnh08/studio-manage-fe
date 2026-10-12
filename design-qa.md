# Design QA: customer booking, mockup 2

Ngày 09/10/2026 (Asia/Bangkok). BOOK01 gồm ba bước wizard customer. User chọn mockup 2, duyệt hai màn tiếp theo, yêu cầu bỏ chi tiết dev và chọn đổi tên/mô tả hai gói Demo. QA auth trước đây được giữ tại [customer-auth-layout-qa.md](docs/design/customer-auth-layout-qa.md).

## Nguồn và evidence

Visual truth nằm tại `C:/Users/Admin/.codex/generated_images/01a10f5c-9fa0-7e63-9b54-9b7028d55721/`:

- Bước1: `exec-12fbe032-9456-41a3-96af-643d27bac347.png`.
- Bước2: `exec-d18e0bbb-efe8-4ac8-96cd-9b76783ff104.png`.
- Bước3 guest: `exec-6267fe02-8edf-47d7-beca-973fafcfc707.png`.

Artifacts: `C:/Users/Admin/studio-manage/.workflow-tools/customer-ui/booking-ideation/qa/`. Đã mở `step{1,2,3}-comparison.png`, mỗi ảnh đặt source trái/render phải trong cùng canvas2880×1024; đã mở `step2-focused.png` và `step3-focused.png` để kiểm fields, labels và review. Source1487×1058 được fit giữ tỷ lệ/pad tới1440×1024; không sửa ảnh nguồn hoặc kéo giãn render. Desktop CSS viewport1440×1024/DPR1, native raster1434×1020 được đặt nguyên kích thước vào canvas. Không gọi sai khác capture ở rìa là pixel match toàn bộ.

`step{1,2,3}-{320,390,744,1128,1440}.png` và `final-responsive.json` ghi15 renders cuối, fresh AX trước capture. Mobile/tablet height844, desktop1024. `step3-320-actions.png` và `step3-keyboard-focus.png` kiểm thao tác cuối trang.

## Findings và disposition

Không còn finding P0/P1/P2 cần sửa trong phạm vi đã kiểm. Qua đối chiếu đã sửa copy/brand theo source, check trùng, border thông báo, gói đã chọn, nút mobile thiếu chiều rộng và crop ảnh cắt mặt. Thanh chọn gói mobile còn81px tại320; link tài khoản ở cạnh logo để giảm khoảng trống.

Kiểm Tab desktop tái hiện4 nút bị sticky bar che. CSS cho thanh về cuối danh sách khi package/comparison có `:focus-visible`; kiểm lại14 vị trí focus cho kết quả0 bị che, thao tác chuột khôi phục sticky. `focus-clearance-desktop.json`, `focus-clearance-after.json` và `step1-keyboard-clearance.png` lưu evidence. Mobile trước sửa đã không che12 vị trí kiểm; chiều rộng các nút review sau sửa đều282px/height48 tại320.

| Surface           | Kết quả                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color             | Story#f7f7f7, canvas trắng, ink/muted/hairline từ tokens, Rausch cho CTA chính; không thêm palette/gradient.                                                                                                                                             |
| Typography        | Inter Customer self-host đã loaded; story28/700 desktop,20/600 mobile; heading22/500, body14–16. Font phóng lớn trong ảnh sinh không thay thế DESIGN.                                                                                                    |
| Component         | Package variant row, chọn/so sánh neutral; Portfolio giữ card mặc định. Fields56/r8, CTA48/r8, ảnh14. Form hai cột desktop; package full width rồi details/estimate; mobile xếp dọc.                                                                     |
| Layout/Responsive | Cả15 renders không overflow ngang; nhãn ba bước còn đầy đủ tại320. Catalog giữ đủ7 gói API thay vì3 mẫu của mockup, cuộn tự nhiên; mobile bar giữ đơn giá/đơn vị tham khảo.                                                                              |
| Image             | Ảnh Portfolio thật may01381/WebP640; crop8:7 desktop,144px mobile với object-position10% giữ mặt. Eager/high priority, reserved frame/placeholder/error qua CustomerImage; ảnh gốc giữ nguyên.                                                           |
| Copy/Data         | Không có “Dữ liệu minh họa”, tên Demo, “Gói mẫu đồ án” trong renders cuối. Không hardcode lớp/người liên hệ/ngày giờ từ mockup. Dữ liệu QA được nhập bằng UI; form mới để trống. Context customer bỏ mã nội bộ/nguồn điều hướng; payload giữ context cũ. |

## Interaction và preservation

- Browser: chọn gói thật, đủ7 gói; so sánh3/chặn gói thứ4; sửa/quay lại giữ lớp, thành viên, lịch và note. Form trống hiện lỗi/focus `className`. Xóa lựa chọn so sánh cũng xóa cảnh báo cũ.
- Review tính380.000×42=15.960.000 từ API và nhập liệu, có nhãn tham khảo/UTC+7. Guest chuyển login khi gửi; Back phục hồi bước3. Không tạo booking thật trong preview.
- Tab từ Sửa thông tin sang Tạo tài khoản có outline solid2px/ink. Console không có error; chỉ warnings React Router cũ.
- AST17/17 declarations của validation, draft, timezone, loadPackages, handlers, submit, payload context và returnTo giống bản trước (`behavior-preservation.json`). Chỉ handler JSX clear comparison bổ sung xóa cảnh báo UI.
- `/booking/start` có shell wizard riêng, giữ feature flag/redirect. Account wizard dùng section trong main của ClientLayout. Không sửa UI staff/admin; CSS scoped customer-ui. Account được review source/test client; không coi đó là authenticated browser journey đầy đủ.
- Theo lựa chọn user, preview chỉ đổi name/description của2 packages và name của2 CostumeType đi kèm. API vẫn7 gói, toàn bộ ID/giá/thông số khác giữ. Seed đổi tên hiển thị, giữ deterministic ID; không chạy seed/reset. `catalog-copy.json` có bản trước/sau để phục hồi.

## Verification

- NewBooking4 + Login13 + returnTo3:3files/20tests PASS,20.42s. Sau markup cuối, NewBooking4/4 PASS,21.97s; kiểm guest→login target→remount client→submit đúng payload/key, retry idempotency và giới hạn7 ngày.
- `npm run check`: PASS, ESLint0errors/8warnings baseline; TypeScript/Prettier pass. CSS keyboard bổ sung được Prettier kiểm lại và build lại.
- `npm run build`: PASS,4021modules,32.89s ở lượt cuối sau CSS keyboard. Warnings Browserslist/circular vendor cũ.
- Seed: syntax/Prettier pass. Root/frontend diff check sạch trước tài liệu cuối.
- Unit cần retry local do esbuild không đọc config trong sandbox; auto-review chấp thuận, không có rejection.

## Checklist và giới hạn

- [x] Ba bước được duyệt dùng tokens/API, bỏ copy dev và giữ đủ catalog.
- [x] Full-view/focused comparison,15 responsive renders, keyboard/focus/validation/draft đã kiểm.
- [x] Relevant unit/check, preservation và production build cuối pass.
- [x] Tab QA có dữ liệu kiểm đã đóng, viewport reset; preview bàn giao có form mới rỗng, giữ default1 thành viên và gói API đã chọn. `step2-desktop-clean.png` xác nhận form sạch; preview service hiện có vẫn chạy.

Không chạy full E2E tạo booking/admin review trên preview. Guest/client submit được kiểm bằng unit mocked API; chưa kiểm toàn hành trình authenticated browser. Chưa kiểm Safari, bàn phím điện thoại thật, zoom200%, DPR2/3, pending mạng chậm hoặc staff light/dark matrix. O05–O07 calendar và O08 sticky estimate bước cuối vẫn là phạm vi riêng; thanh chọn gói bước1 không đóng toàn bộ O08.

final result: passed
