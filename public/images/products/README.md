# Thư mục Hình ảnh Món ăn (`miniapp/public/images/products/`)

Đặt các file hình ảnh món ăn tải về vào thư mục này với đúng tên file `<slug>.jpg` tương ứng với 30 món trong `MenuSeeder.php`.

## Quy chuẩn kỹ thuật để ảnh đồng nhất kích thước và sắc nét
- **Tỷ lệ khuyến nghị:** Vuông `1:1` (`800×800 px`) hoặc ngang `4:3` (`800×600 px`). Component `<ProductImage />` của Mini App tự động căn giữa và cắt khung đồng nhất (`object-cover object-center`) ở cả 3 màn hình:
  - Danh sách Thực đơn (`card`): `80×80 px` (`w-20 h-20`, bo góc `rounded-lg`)
  - Giỏ hàng (`cart`): `56×56 px` (`w-14 h-14`, bo góc `rounded-lg`)
  - Chi tiết món (`detail`): Khung `aspect-[4/3] max-h-64` sắc nét
- **Định dạng:** `.jpg` (hoặc `.webp`/`.png` nếu cập nhật đường dẫn trong trang Admin `/admin/products`).
- **Cơ chế Fallback tự động:** Khi một file ảnh chưa được tải về thư mục này, giao diện tự động hiển thị logo `Smart Canteen` (`canteen-logo.jpg`) mà không bao giờ bị vỡ khung hay lỗi icon ảnh gãy.

## Danh sách 30 tên file chuẩn (`<slug>.jpg`)

| STT | Danh mục | Tên món ăn | Tên file ảnh cần đặt trong thư mục này |
|---|---|---|---|
| 1 | Cơm | Cơm sườn nướng mật ong | `com-suon-nuong-mat-ong.jpg` |
| 2 | Cơm | Cơm gà xối mỡ giòn da | `com-ga-xoi-mo-gion-da.jpg` |
| 3 | Cơm | Cơm bò lúc lắc khoai tây | `com-bo-luc-lac-khoai-tay.jpg` |
| 4 | Cơm | Cơm cá kho tộ miền Tây | `com-ca-kho-to-mien-tay.jpg` |
| 5 | Cơm | Cơm thịt kho tàu trứng vịt | `com-thit-kho-tau-trung-vit.jpg` |
| 6 | Cơm | Cơm gà kho sả ớt | `com-ga-kho-sa-ot.jpg` |
| 7 | Cơm | Cơm sườn non rim mặn ngọt | `com-suon-non-rim-man-ngot.jpg` |
| 8 | Cơm | Cơm chiên dương châu đặc biệt | `com-chien-duong-chau-dac-biet.jpg` |
| 9 | Bún & Phở | Phở bò tái nạm truyền thống | `pho-bo-tai-nam-truyen-thong.jpg` |
| 10 | Bún & Phở | Bún chả Hà Nội | `bun-cha-ha-noi.jpg` |
| 11 | Bún & Phở | Bún bò Huế đặc biệt | `bun-bo-hue-dac-biet.jpg` |
| 12 | Bún & Phở | Hủ tiếu Nam Vang thập cẩm | `hu-tieu-nam-vang-thap-cam.jpg` |
| 13 | Bún & Phở | Miến gà ta xé phay | `mien-ga-ta-xe-phay.jpg` |
| 14 | Bún & Phở | Bún thịt nướng chả giò | `bun-thit-nuong-cha-gio.jpg` |
| 15 | Bún & Phở | Bánh canh cua giò heo | `banh-canh-cua-gio-heo.jpg` |
| 16 | Mì & Món Á | Mì xào bò rau cải | `mi-xao-bo-rau-cai.jpg` |
| 17 | Mì & Món Á | Nui xào bò lúc lắc | `nui-xao-bo-luc-lac.jpg` |
| 18 | Mì & Món Á | Mì trộn muối ớt gà quay | `mi-tron-muoi-ot-ga-quay.jpg` |
| 19 | Mì & Món Á | Cơm trộn Hàn Quốc Bibimbap | `com-tron-han-quoc-bibimbap.jpg` |
| 20 | Bánh mì & Ăn nhẹ | Bánh mì thịt nguội đặc biệt | `banh-mi-thit-nguoi-dac-biet.jpg` |
| 21 | Bánh mì & Ăn nhẹ | Bánh mì chảo bò ốp la | `banh-mi-chao-bo-op-la.jpg` |
| 22 | Bánh mì & Ăn nhẹ | Xôi mặn thập cẩm lá sen | `xoi-man-thap-cam-la-sen.jpg` |
| 23 | Bánh mì & Ăn nhẹ | Gỏi cuốn tôm thịt (3 cuốn) | `goi-cuon-tom-thit.jpg` |
| 24 | Đồ uống | Trà đào cam sả | `tra-dao-cam-sa.jpg` |
| 25 | Đồ uống | Cà phê sữa đá Sài Gòn | `ca-phe-sua-da-sai-gon.jpg` |
| 26 | Đồ uống | Nước ép cam tươi nguyên chất | `nuoc-ep-cam-tuoi-nguyen-chat.jpg` |
| 27 | Đồ uống | Trà tắc mật ong giải nhiệt | `tra-tac-mat-ong-giai-nhiet.jpg` |
| 28 | Tráng miệng | Chè khúc bạch hạnh nhân | `che-khuc-bach-hanh-nhan.jpg` |
| 29 | Tráng miệng | Sữa chua nếp cẩm | `sua-chua-nep-cam.jpg` |
| 30 | Tráng miệng | Bánh flan trứng sữa caramel | `banh-flan-trung-sua-caramel.jpg` |
