# Customer forms — evidence UI13/UI14/UI16

Ngày kiểm tra: 2026-10-07; bổ sung browser zoom ngày 2026-10-08. Phạm vi: `PublicMemberIntakePage`, `StudentFormPage`, `FeedbackFormPage` và appearance customer của `ProfilePage`. Trang shared giữ default staff và gate Telegram theo roles.

Đã hoàn tất **32 kiểm tra runtime** trên Chrome qua Playwright: responsive 15, states 10, profile 7; thêm một case browser zoom 200% cho feedback. Các lần chạy cuối đều exit 0. Không cần sửa source sau khi xem ảnh và kiểm tra runtime.

## Cách chạy và dữ liệu

Preview local: `http://127.0.0.1:4013`; API local: port 5002 với demo DB được giữ nguyên. Script và ảnh là artifact local trong thư mục ignored `.workflow-tools/customer-ui/forms-runtime` ở workspace gốc.

```powershell
node .workflow-tools/customer-ui/forms-runtime/verify.cjs --part=responsive
node .workflow-tools/customer-ui/forms-runtime/verify.cjs --part=states
node .workflow-tools/customer-ui/forms-runtime/verify.cjs --part=profile
```

Public intake/student/feedback dùng DTO giả lập, IDs 24 ký tự hex. Profile dùng đăng nhập demo để đọc dữ liệu; mọi PATCH profile/password đều bị intercept và trả response giả lập. Firewall chặn mutation nghiệp vụ chưa được mock và GET public chưa được mock. Ba kết quả cuối có cả `blockedBusinessWrites: []` và `blockedPublicReads: []`; không gửi mutation nghiệp vụ đến demo DB.

Nguồn kết quả: [responsive](../../../.workflow-tools/customer-ui/forms-runtime/results-responsive.json), [states](../../../.workflow-tools/customer-ui/forms-runtime/results-states.json), [profile](../../../.workflow-tools/customer-ui/forms-runtime/results-profile.json), [script](../../../.workflow-tools/customer-ui/forms-runtime/verify.cjs).

## Kết quả runtime

| Phạm vi | Kết quả thực kiểm |
| --- | --- |
| Bốn trang ở 320/390/744/1128 × 1000 | Không overflow ngang. `html.dark` và `themeMode=dark` giữ nguyên; scope customer trắng, `color-scheme: light`, Inter Customer đã tải khi có nội dung. |
| Form controls và type | Input/select 56px, radius 8px, font 16px. Textarea ≥120px, radius 8px/font 16px. Title 22px, section 20px, label 14px, helper/caption 13px; card radius 14px, không shadow; CTA 48px/radius 8px/font 16px. |
| Intake/student layout | Height/weight một cột dưới 744px, hai cột từ 744px. Radio/checkbox vẫn native; vùng lựa chọn ≥48px. Tên lớp dài và metadata xuống dòng. Ngày chụp vẫn text. |
| Intake states | Loading → valid, invalid token, expired token, validation không POST, submit error → retry pending → success → add another. Reload không lưu giá trị thành viên; nhập lại cùng dữ liệu dùng lại request ID. Thành công xoá state idempotency; add another xoá name/costume selection. Hai POST đều mocked. |
| Student states | Loading/invalid, required validation không POST, gender đổi danh sách trang phục và giữ selection logic; bỏ unisex → payload chỉ còn costume female. Error → pending → success → reset về name trống/gender mặc định. Hai POST đều mocked. |
| Feedback rating | Mỗi star có vùng 48×48px, icon ink; năm sao nằm cùng một hàng ở 320px. Space và ArrowRight chọn 3 sao, nhãn “Bình thường”, outline focus ink; Tab tới textarea. Chrome touch emulation tap label chọn 4 sao và nhãn “Hài lòng”. |
| Feedback submit | Disabled khi thiếu bốn mục bắt buộc; error → retry pending → success → reset. Hai lần gọi click native vào nút disabled lúc pending không tạo POST thêm. Payload giữ customer/access và trim nhận xét. Hai POST đều mocked. |
| Feedback bar | Nền trắng opaque. Clearance của page khớp chiều cao bar với sai số dưới 1px ở cả bốn width; field cuối không bị bar che khi cuộn hết. Ở 320px, thêm 24px padding làm chiều cao/clearance tăng từ ~113px lên ~137px; tăng riêng status text từ 14px lên 28px làm bar/clearance tăng lên ~197px, không overflow ngang. |
| Customer profile | Một cột dưới 1128px, hai cột từ 1128px; username disabled và không có Telegram. Profile error/pending/success, password mismatch không PATCH, password error/pending/success và reset đã kiểm. Hai PATCH profile và hai PATCH password đều mocked. |
| Staff profile | Route `/profile`, 1440×1000, light và dark giữ theme/localStorage, không có scope customer, input giữ 36px. PNG cuối trùng từng byte với baseline ở cả hai theme; Telegram vẫn hiển thị. |

Staff baseline SHA256:

- Light: `eb8c2e6a692af31ab9a0132b07055444c8ebf5fd10715d4bed7720fdb98ec99d`.
- Dark: `2b87bf7f930e3f69cf509a6126208465e853e289d1d09aae30bf502072813d0b`.

Ảnh đã xem trực tiếp: [intake 320](../../../.workflow-tools/customer-ui/forms-runtime/intake-normal-dark-320.png), [student 320](../../../.workflow-tools/customer-ui/forms-runtime/student-normal-dark-320.png), [feedback viewport 320](../../../.workflow-tools/customer-ui/forms-runtime/feedback-viewport-dark-320.png), [customer profile 320](../../../.workflow-tools/customer-ui/forms-runtime/client-profile-normal-dark-320.png), [customer profile 1128](../../../.workflow-tools/customer-ui/forms-runtime/client-profile-normal-dark-1128.png), loading/error và submit bar với status text lớn. Ảnh full-page có thể đặt phần tử fixed ở vị trí viewport đầu; dùng ảnh viewport riêng để xem bar trên màn hình 320px.

## Source và targeted tests

Các file triển khai: bốn page nói trên, `CustomerChoice`, `CustomerFeedbackSection`, stylesheet riêng `customer-forms.css`; tái sử dụng CustomerButton/Fields/Surface/StatusBadge và CustomerRatingInput chung. `useCustomerAppearance()` chỉ chọn presentation; checks quyền và Telegram không dựa vào appearance.

`src/pages/CustomerForms.test.tsx` đã chạy **5/5 PASS**: intake validation/retry/request ID/reset; student costume/gender/payload/reset; feedback native form/pending duplicate; customer profile/password validation/submit/Telegram; staff Telegram role gate. Targeted ESLint và Prettier của các file owned đã pass ở batch triển khai. Root cũng chạy bộ unit trung tâm với file test này trong lượt cuối.

AST đối chiếu với bản trước batch giữ nguyên student `onSubmit`/register; feedback `onSubmit`/canSubmit/completion/progress/register; profile/password `onSubmit`/register và toàn bộ TelegramSection; intake helper/request ID/privacy state/submit/add another. Chỉ cách render và CSS được đổi.

## Giới hạn còn lại

Browser zoom toàn trang 200% đã kiểm qua Chrome Settings → Appearance → Page zoom trên persistent profile riêng trong `zoom-runtime/profile`, với `viewport: null`. Cửa sổ ngoài giữ 656×1000; inner viewport đổi 640×905/DPR1 thành 320×452/DPR2, visualViewport320×452.5; CSS zoom của html/body vẫn1. Feedback không overflow ngang, bar trắng cao113.016px và clearance113.016px. Field cuối khi focus giữ56px/font16, bottom245.523px ở trên barTop339.484px; Space/ArrowRight chọn3 sao và nhãn “Bình thường”. Theme dark/localStorage vẫn giữ. DTO public đều mocked và firewall không có request bị chặn; không gửi mutation nghiệp vụ. Kết quả: [native zoom JSON](../../../.workflow-tools/customer-ui/zoom-runtime/results.json), [ảnh focus cuối](../../../.workflow-tools/customer-ui/zoom-runtime/feedback-native-zoom-200-last-field-focus.png). Ảnh cuối dùng CDP capture không clip, khung640×905; đã bỏ capture mặc định bị crop khi zoom. Đây là một case feedback trên Chrome desktop, không xác nhận mọi trang hoặc thiết bị ở200%.

- Đây là Chrome desktop với viewport/touch emulation. Chưa thử bàn phím hệ điều hành trên iOS/Android, Safari hoặc thiết bị thật.
- `env(safe-area-inset-bottom)` của Chrome desktop bằng 0. Kiểm tra +24px là CSS giả lập để chứng minh ResizeObserver/clearance; không xác nhận safe-area native trên iOS.
- Stress status text200% trong bộ32 khác case browser zoom toàn trang ở trên. Chưa kiểm text scaling của hệ điều hành.
- Token/status/submission public và update profile/password dùng mock; không kiểm việc ghi thật hoặc backend acceptance bằng những request đó. Staff chỉ đối chiếu default light/dark/Telegram và source/unit preservation, không gửi cập nhật profile/password thật.
