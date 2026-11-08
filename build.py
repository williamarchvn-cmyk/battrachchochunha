"""Tạo index.html bản chạy web từ file nguồn của bản xem trước (src/app.html)."""
import pathlib
root = pathlib.Path(__file__).parent
src = (root / 'src' / 'app.html').read_text(encoding='utf8')
cut = src.index('</style>') + len('</style>')
head, body = src[:cut], src[cut:]
icon = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpolygon points='20,2 32.7,7.3 38,20 32.7,32.7 20,38 7.3,32.7 2,20 7.3,7.3' fill='none' stroke='%239c2a21' stroke-width='3'/%3E%3Cpolygon points='20,10 27.1,12.9 30,20 27.1,27.1 20,30 12.9,27.1 10,20 12.9,12.9' fill='%239c2a21'/%3E%3C/svg%3E")
out = f"""<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Đối chiếu mặt bằng nhà đất và căn hộ theo Bát Trạch trong sách Kim Oanh Ký: tính cung phi, chấm cửa, bếp, phòng ngủ, bàn thờ, WC và xuất báo cáo PDF.">
<meta property="og:title" content="Bát Trạch cho chủ nhà">
<meta property="og:description" content="Kiểm tra mặt bằng nhà theo Bát Trạch, gợi ý bố trí lại và xuất PDF.">
<link rel="icon" href="{icon}">
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}img{{max-width:100%}}</style>
{head}
</head>
<body>
{body}
</body>
</html>
"""
(root / 'index.html').write_text(out, encoding='utf8')
print('index.html', len(out))
