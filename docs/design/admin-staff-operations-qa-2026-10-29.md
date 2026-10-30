# QA refactor admin/staff — R08–R11

Ngày kiểm: **29/10/2026**, Asia/Bangkok. Phạm vi: lịch chụp, kho, loại trang phục, gói, danh mục thu/chi, dashboard, tài chính và báo cáo. Tiếp nối R01–R07; R12–R18 vẫn mở.

## Thay đổi

- Đồng bộ header h1, field/label/error, bảng có tên, nhóm action, modal và màu semantic theo theme staff hiện có. Action icon 32px desktop, 44px mobile; các nút có tên gắn với bản ghi.
- Lịch: tên ekip đầy đủ, ghi chú xuống dòng, calendar chọn ngày bằng nút native, chi tiết ngày và modal trung tính; giữ chặn sửa/xóa lịch liên kết workflow.
- Kho: ghi rõ **tồn tốt chưa trừ phần giữ theo ngày**, không gọi đây là khả dụng theo kỳ. Giữ giá/ngày, inventory, loại và payload gói. Bổ sung lỗi tải/thử lại; action danh mục luôn hiện.
- Dashboard: dùng StatCard có sẵn, giữ KPI/role/query và các series/legend; màu biểu đồ có token sáng/tối, tôn trọng reduced motion.
- Tài chính/báo cáo: tiền căn phải/tabular; ngày và loại giao dịch không bẻ chữ; tổng hợp dùng tfoot hợp lệ. Native date icon đọc được trong dark mode.
- Sửa lỗi hiển thị cũ phát hiện khi QA: calendar từng lấy `shootDate.slice(0, 10)`, xếp lịch UTC 17:00 vào ngày trước ngày Việt Nam. Dùng `vietnamCalendarDate` hiện có cho lịch và hôm nay; không sửa ngày lưu/API hay phân bổ kho. Regression dùng `2026-10-14T17:00:00Z` và kỳ vọng ngày 15/10.

## Kết quả tự động

| Kiểm tra                        | Kết quả                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Vitest, 14 file liên quan       | **129/129 pass**                                                                                       |
| TypeScript `tsc --noEmit`       | Pass                                                                                                   |
| ESLint các file TS/TSX thay đổi | 0 lỗi; 2 cảnh báo hook có sẵn ở SchedulesPage (`buildFilterParams`) và FinancePage (`buildListParams`) |
| Prettier các file thay đổi      | Pass                                                                                                   |
| Vite production build           | Pass                                                                                                   |
| `git diff --check`              | Pass                                                                                                   |

Test mới: ScheduleCalendar (2), StaffScheduleInventory (6), StaffFinanceDashboard (8). Kiểm tra filter/page/reset, chặn lịch workflow, ID/payload gói, required field/error retry, role KPI/refund, số liệu báo cáo và reduced motion. Giá thuê/control/customer được hồi quy cùng lượt. Service được mock; không ghi DB từ Vitest.

Các file hồi quy: staff-patterns, CustomersPage, CustomerControls, DailyRentalPricing, StaffScope, CustomerScope, Sidebar, Breadcrumbs, CustomerHeader, App, CustomerForms. Kết quả máy đọc tại `.workflow-tools/staff-operations-tests.json` và log build tại `.workflow-tools/staff-operations-build.log` ở workspace cha (không commit các log).

## Browser thực tế

IAB dùng frontend local cổng 4001/backend 5002. Chỉ đọc dữ liệu, lọc, chuyển tab/theme, mở/đóng form và submit form bắt buộc còn trống. Không lưu form hợp lệ, tạo hợp đồng, xóa bản ghi hoặc đổi checkbox hoàn tiền.

| Trường hợp                        | Bằng chứng / kết quả                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Admin dark, lịch bảng và chi tiết | 01–02: đầy đủ tên/ghi chú, action 32×32 và có ngữ cảnh                                                  |
| Calendar keyboard + mobile        | Enter chọn 15/10, mở đúng K65 Công nghệ 01; 10 mobile, 11 light 1280px                                  |
| Kho và form dài                   | 07/17 dark/light; 08 mobile 390px, footer Lưu cao 44px và nằm trong viewport khi focus                  |
| Danh mục mobile                   | 09: action luôn hiện, 44×44; trang không tràn ngang                                                     |
| Gói / loại                        | Gói Ngoại cảnh giữ giá 380.000 và ba loại; 16 required error focus về Tên loại, Escape trả về Thêm loại |
| Dashboard                         | 03 dark; 12 light 768px, cùng KPI, biểu đồ hoàn chỉnh                                                   |
| Photographer                      | 13: chỉ KPI lịch chụp 6, không có finance/chart hoặc bộ lọc admin                                       |
| Accountant                        | 14: finance có control hoàn tiền enabled theo quyền, chưa thao tác ghi; report truy cập được            |
| Reports                           | 05–06 dark, 15 light mobile; vùng bảng 640px cuộn nội bộ trong vùng 350px, tabindex 0                   |
| Customer guard                    | 18: `/costumes` không có staff root marker, giữ giao diện khách; trở lại admin marker được phục hồi     |

Reflow đo trực tiếp: document/viewport 384/390 (danh mục, reports), 762/768 (dashboard), 1274/1280 (calendar), 1434/1440 (finance/dashboard). Các số document thấp hơn viewport do scrollbar. Không suy native kích thước ảnh bằng kích thước CSS.

Cuối phiên: khôi phục **superadmin**, theme **Hệ thống**, bỏ viewport override và để bản xem trước dashboard.

## Đối chiếu số liệu

Giữ nguyên các phạm vi query khác nhau giữa các trang; không so tổng khác kỳ như cùng một đại lượng.

| Trang / phạm vi                             | Số đối chiếu (đồng, trừ dòng tồn)                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Dashboard, mùa thu, tất cả người            | Lớp 9; lịch 9; thu 142.556.000; chi 32.940.000; chênh lệch 109.616.000                     |
| Finance, tổng hợp mặc định tất cả thời gian | Thu 259.288.000; chi 71.490.000; lợi nhuận theo nhãn cũ 187.798.000; một tfoot trong table |
| Report 01–29/10, chụp                       | Thu 66.518.000; chi 0; giá trị đã chốt 64.850.000                                          |
| Report cùng kỳ, thuê                        | Thu 14.420.000; chi 3.100.000; giá trị đã chốt 1.800.000                                   |
| Report tổng                                 | Thu 80.938.000; chi 10.930.000; chênh lệch 70.008.000; giá trị 66.650.000; phí hủy 0       |
| Công nợ hiện tại                            | Còn thu 104.442.000; cần hoàn 1.200.000; cọc 4.900.000; dư chờ đối soát 600.000            |
| Kho cùng kỳ                                 | Tồn tốt 2014; ngày-sản phẩm chụp 473; thuê 150; xung đột 0; đơn quá hạn 2                  |

Các assertion fixture kiểm độc lập tổng, tham số lọc và ID; số native dùng đối chiếu với dữ liệu hiện tại. Không thay reducer tính tiền, service hay backend trong đợt này.

## Evidence và giới hạn

Ảnh JPEG gốc: [thư mục bằng chứng](admin-staff-operations-2026-10-29/), [metadata ảnh](admin-staff-operations-2026-10-29/evidence.json). Đã mở lại file 03 và 05 sau lưu để kiểm tra chart, chữ và căn tiền. Các ảnh khác đã xem ngay lúc native capture. Baseline audit 28/10 và QA đợt trước giữ riêng.

Đây là component/integration tests với browser smoke thủ công, **chưa phải full E2E ghi DB**. Chưa kiểm mọi role/state trên mọi viewport, zoom 200% hoặc chu trình giữ kho/thanh toán thực; phần đó còn trong R18. Error/empty/validation/disabled và payload dùng fixture nơi thích hợp. Không seed/reset `studio_db`, không thêm dependency, không thay backend hoặc UI khách.
