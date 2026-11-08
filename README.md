# Bát Trạch cho chủ nhà

Web app đối chiếu mặt bằng nhà đất và căn hộ chung cư theo phần Bát Trạch trong sách *Kim Oanh Ký* (Thái Kim Oanh). Người dùng nhập gia đình, tải mặt bằng (JPG, PNG, PDF), đánh dấu cửa, bếp, phòng ngủ, bàn thờ, WC… App chấm điểm, gợi ý bố trí lại và xuất báo cáo PDF.

by Nguyễn Mạnh Hùng

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `index.html` | Toàn bộ giao diện và bộ luật (chạy trên trình duyệt) |
| `api/nhan-dien.js` | Hàm server Vercel: nhận ảnh, gọi Gemini, trả JSON; giữ kín API key, giới hạn lượt |
| `chinh-sach.html` | Chính sách riêng tư |
| `demo/` | Ảnh mặt bằng cho 8 dự án mẫu |
| `vercel.json` | Cấu hình hàm server (tối đa 60 giây) và header bảo mật |
| `src/app.html`, `build.py` | File nguồn dùng chung với bản xem trước trên Claude; `python3 build.py` tạo lại `index.html` |

Giai đoạn này dữ liệu người dùng chỉ lưu trong trình duyệt (localStorage). Chưa có tài khoản, chưa có cơ sở dữ liệu.

## Triển khai lên Vercel (làm một lần)

1. Vào [vercel.com/new](https://vercel.com/new), chọn **Import** repo `battrachchochunha`.
2. **Framework Preset**: chọn `Other`. Để trống Build Command và Output Directory.
3. Mở **Environment Variables**, thêm:
   - `GEMINI_API_KEY` = key lấy ở Google AI Studio (bắt buộc).
   - `GEMINI_MODEL` = tên model, ví dụ `gemini-2.5-flash` (tuỳ chọn; để trống thì dùng `gemini-2.5-flash`, nếu Google đã ngừng thì tự thử `gemini-flash-latest`).
   - `AI_LIMIT_PER_10MIN` = số lượt AI mỗi người trong 10 phút (tuỳ chọn, mặc định 6).
   - `AI_DAILY_CAP` = trần lượt AI mỗi ngày (tuỳ chọn, mặc định 300).
4. Bấm **Deploy**. Từ lần sau, mỗi lần đẩy code lên nhánh `main` là web tự cập nhật.

Không dán API key vào code, vào chat hay vào file trong repo. Key chỉ nằm trong Environment Variables của Vercel.

## Kiểm tra sau khi triển khai

1. Mở web, chọn dự án mẫu **Mẫu H · Căn hộ 3PN (chưa đánh dấu)**, sang bước 2, bấm **Nhận diện tầng này**.
2. Nếu báo "Máy chủ chưa cấu hình GEMINI_API_KEY", kiểm tra lại biến môi trường rồi bấm **Redeploy**.
3. Sang bước 5, bấm **Tải PDF**.
4. Trên điện thoại, bước 2, thử **Đo bằng la bàn điện thoại**.

## Gói Gemini và quyền riêng tư

Gói miễn phí của Gemini API cho phép Google dùng nội dung gửi lên để cải thiện sản phẩm và có thể có người kiểm duyệt xem. Trang `chinh-sach.html` đã ghi rõ điều này. Khi mở công khai cho nhiều người, nên bật thanh toán (Billing) cho project Google Cloud chứa key để chuyển sang gói trả phí. Gói trả phí không dùng dữ liệu để cải thiện sản phẩm. Điều khoản: <https://ai.google.dev/gemini-api/terms>.

## Chạy thử trên máy

```bash
npm i -g vercel
vercel link        # nối thư mục với project trên Vercel
vercel env pull    # tải biến môi trường về .env.local (không commit file này)
vercel dev         # mở http://localhost:3000
```

## Các bước tiếp theo (chưa làm)

- Supabase: đăng nhập Google, lưu dự án và ảnh trên mây.
- Thanh toán VietQR (PayOS hoặc SePay) cho xuất PDF.
- Chọn ngày động thổ, nhập trạch.
- Tên miền riêng.
