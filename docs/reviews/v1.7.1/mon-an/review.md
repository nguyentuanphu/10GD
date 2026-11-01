# v1.7.1 · “Món” → “Món ăn” (Vietnamese UI wording)

Owner request (Henry): *“một số nơi Món nên chuyển thành Món Ăn, ví dụ hiện tại là thêm món, đúng tiếng Việt là Thêm Món Ăn, Hoặc Kho Món Ăn của Gia Đình etc”.*

Branch `agent-hh/mon-an` (local only, not pushed). Vietnamese copy only; English text unchanged. No user data, recipe names,
family text, catalogue recipe content or fixtures representing user data were changed.

## Rule used (case by case)

* **Changed** — “món” standing alone as *the dish / recipe noun* in headings, buttons, labels, tabs, menu items, empty
  states, toasts/errors, onboarding, Studio labels, notification text and privacy-page headings. Existing capitalisation
  kept (sentence case → “Thêm món ăn”, “Kho món ăn của gia đình”, “Món ăn cộng đồng”). No string here was Title Cased.
* **Kept** — “món” that is already specific, a count/category, an established compound, a shopping *item*, long prose
  where “món ăn” reads heavier, and space-critical controls (see “Kept, with reasons”).

## Changed strings (before → after)

Strings passed through `tr()/rcT()/otr()/T()/mrT()/vrT()` keep their English argument untouched. Raw Vietnamese strings in
`app.ts` / `family-features.ts` are translated by the `EN_UI` dictionary in `language.ts`; for every one that already had an
English translation a matching `EN_UI` key was added so English output is identical (checked by calling the real
`englishUI()` on old vs new text in the built app: 0 differences for the 7 that were translated before). Two half-translated
picker strings (“Find recipes trong nhóm…”, “Find recipes thêm / thay”) now get clean English (“Find recipes in this group…”,
“Find a recipe to add / swap”). Strings that were Vietnamese-only in English mode before remain so (pre-existing gap, out of scope).

| # | File | Before | After |
|---|---|---|---|
| 1 | `app.ts` | Chưa có món. Thêm món hoặc ghi nhận ăn ngoài. | Chưa có món ăn. Thêm món ăn hoặc ghi nhận ăn ngoài. |
| 2 | `app.ts` | + Thêm / đổi từng món ↗ | + Thêm / đổi từng món ăn ↗ |
| 3 | `app.ts` | Ăn ngoài / chưa có món | Ăn ngoài / chưa có món ăn |
| 4 | `app.ts` | + Thêm / đổi món | + Thêm / đổi món ăn |
| 5 | `app.ts` | Chưa tìm thấy món phù hợp Thử tên món hoặc nguyên liệu khác. | Chưa tìm thấy món ăn phù hợp Thử tên món ăn hoặc nguyên liệu khác. |
| 6 | `app.ts` | Những món thân quen | Những món ăn thân quen |
| 7 | `app.ts` | Tìm món ↗ | Tìm món ăn ↗ |
| 8 | `app.ts` | Đổi món này | Đổi món ăn này |
| 9 | `app.ts` | Thêm món vào bữa | Thêm món ăn vào bữa |
| 10 | `app.ts` | + Chuyển sang thêm món | + Chuyển sang thêm món ăn |
| 11 | `app.ts` | placeholder="Tìm món trong nhóm…" aria-label="Tìm món thêm / thay | placeholder="Tìm món ăn trong nhóm…" aria-label="Tìm món ăn để thêm / thay |
| 12 | `app.ts` | + Món tự nhập | + Món ăn tự nhập |
| 13 | `app.ts` | Không tìm thấy món. Thử từ khác hoặc thêm món mới. | Không tìm thấy món ăn. Thử từ khác hoặc thêm món ăn mới. |
| 14 | `app.ts` | Tên món | Tên món ăn |
| 15 | `app.ts` | oast('Món đã có. Bạn có thể tăng cỡ món nếu cần. | oast('Món ăn đã có. Bạn có thể tăng cỡ món nếu cần. |
| 16 | `app.ts` | oast('Món này đã có trong bữa. | oast('Món ăn này đã có trong bữa. |
| 17 | `app.ts` | Đã cập nhật món và tính lại danh sách mua. | Đã cập nhật món ăn và tính lại danh sách mua. |
| 18 | `app.ts` | Món tự nhập | Món ăn tự nhập |
| 19 | `app.ts` | Tên món | Tên món ăn |
| 20 | `app.ts` | Món tự nhập chưa có công thức | Món ăn tự nhập chưa có công thức |
| 21 | `app.ts` | data-id="custom-meal-form">Thêm món | data-id="custom-meal-form">Thêm món ăn |
| 22 | `app.ts` | oast('Cần có món và người ăn trước khi ghi nhận nấu. | oast('Cần có món ăn và người ăn trước khi ghi nhận nấu. |
| 23 | `app.ts` | Đã xóa món khỏi kho. | Đã xóa món ăn khỏi kho. |
| 24 | `app.ts` | oast('Món này chưa có hướng dẫn nấu. | oast('Món ăn này chưa có hướng dẫn nấu. |
| 25 | `app.ts` | Đã thêm tên món. Chưa tính nguyên liệu món này. | Đã thêm tên món ăn. Chưa tính nguyên liệu món này. |
| 26 | `app.ts` | oast('Món có tên hoặc nguyên liệu trong danh sách cần tránh | oast('Món ăn có tên hoặc nguyên liệu trong danh sách cần tránh |
| 27 | `app.ts` | Đã thêm món và tính lại danh sách mua. | Đã thêm món ăn và tính lại danh sách mua. |
| 28 | `app.ts` | Chọn món | Chọn món ăn |
| 29 | `app.ts` | Chưa có món phù hợp. Thử đổi từ khóa hoặc thời gian. | Chưa có món ăn phù hợp. Thử đổi từ khóa hoặc thời gian. |
| 30 | `family-menu-ui.ts` | Sửa món gia đình | Sửa món ăn gia đình |
| 31 | `family-menu-ui.ts` | Viết món của gia đình | Viết món ăn của gia đình |
| 32 | `family-menu-ui.ts` | Tên món | Tên món ăn |
| 33 | `family-menu-ui.ts` | Lưu món gia đình | Lưu món ăn gia đình |
| 34 | `family-menu-ui.ts` | Món gia đình | Món ăn gia đình |
| 35 | `family-menu-ui.ts` | Món gia đình | Món ăn gia đình |
| 36 | `family-menu-ui.ts` | Không tìm thấy món phù hợp | Không tìm thấy món ăn phù hợp |
| 37 | `family-menu-ui.ts` | Viết món đầu tiên | Viết món ăn đầu tiên |
| 38 | `family-menu-ui.ts` | Kho món của gia đình | Kho món ăn của gia đình |
| 39 | `family-menu-ui.ts` | Viết món | Viết món ăn |
| 40 | `family-menu-ui.ts` | Phạm vi tìm món | Phạm vi tìm món ăn |
| 41 | `family-menu-ui.ts` | Tìm món theo tên hoặc nguyên liệu | Tìm món ăn theo tên hoặc nguyên liệu |
| 42 | `family-menu-ui.ts` | Tìm tên món hoặc nguyên liệu (vd: cá kho, canh chua)… | Tìm tên món ăn hoặc nguyên liệu (vd: cá kho, canh chua)… |
| 43 | `family-menu-ui.ts` | Lọc món | Lọc món ăn |
| 44 | `family-menu-ui.ts` | Xóa món này khỏi bữa | Xóa món ăn này khỏi bữa |
| 45 | `family-menu-ui.ts` | Chưa có món. Bấm + Thêm món hoặc Lên thực đơn cả tuần. | Chưa có món ăn. Bấm + Thêm / bớt món ăn hoặc Lên thực đơn cả tuần. |
| 46 | `family-menu-ui.ts` | Thêm / bớt món | Thêm / bớt món ăn |
| 47 | `family-menu-ui.ts` | Viết / phân loại món | Viết / phân loại món ăn |
| 48 | `family-menu-ui.ts` | Gợi ý món từ đồ trong tủ | Gợi ý món ăn từ đồ trong tủ |
| 49 | `family-menu-ui.ts` | Nguồn chọn món | Nguồn chọn món ăn |
| 50 | `family-menu-ui.ts` | Tên món tự nấu | Tên món ăn tự nấu |
| 51 | `family-menu-ui.ts` | Lưu luôn vào Kho món gia đình cho lần sau | Lưu luôn vào Kho món ăn gia đình cho lần sau |
| 52 | `family-menu-ui.ts` | Tìm món trong kho gia đình hoặc N món tham khảo | Tìm món ăn trong kho gia đình hoặc N món tham khảo |
| 53 | `family-menu-ui.ts` | Gõ tên món hoặc nguyên liệu (vd: kho, canh chua, phở, gà… | Gõ tên món ăn hoặc nguyên liệu (vd: kho, canh chua, phở, gà… |
| 54 | `family-menu-ui.ts` | Gợi ý món từ nguyên liệu sẵn trong tủ | Gợi ý món ăn từ nguyên liệu sẵn trong tủ |
| 55 | `family-menu-ui.ts` | Chưa tìm thấy món khớp tủ. | Chưa tìm thấy món ăn khớp tủ. |
| 56 | `family-menu-ui.ts` | Hoàn tác bữa đã nấu trước khi xóa món. | Hoàn tác bữa đã nấu trước khi xóa món ăn. |
| 57 | `family-menu-ui.ts` | Đã bỏ món. | Đã bỏ món ăn. |
| 58 | `family-menu-ui.ts` | Đã bỏ hết món trong {bữa}. | Đã bỏ hết món ăn trong {bữa}. |
| 59 | `family-menu-ui.ts` | Nhập tên món cần thêm. | Nhập tên món ăn cần thêm. |
| 60 | `family-menu-ui.ts` | Cần có món và khẩu phần. | Cần có món ăn và khẩu phần. |
| 61 | `family-menu-ui.ts` | Đã lưu món của gia đình. | Đã lưu món ăn của gia đình. |
| 62 | `family-menu-ui.ts` | Không tìm thấy món trong Kho tham khảo. | Không tìm thấy món ăn trong Kho tham khảo. |
| 63 | `family-menu-ui.ts` | Không tìm thấy món khớp “{q}” (0 món). | Không tìm thấy món ăn khớp “{q}” (0 món). |
| 64 | `recipe-community.ts` | Món đã lưu; ảnh món còn trên máy | Món ăn đã lưu; ảnh món còn trên máy |
| 65 | `recipe-community.ts` | Đã lưu món kèm ảnh. | Đã lưu món ăn kèm ảnh. |
| 66 | `recipe-community.ts` | Đã lưu món nhưng chưa lưu được ảnh trên máy. | Đã lưu món ăn nhưng chưa lưu được ảnh trên máy. |
| 67 | `recipe-community.ts` | Món vẫn dùng bình thường trên máy này. | Món ăn vẫn dùng bình thường trên máy này. |
| 68 | `recipe-community.ts` | ham khảo. Món chỉ hiện sau khi được duyệt; | ham khảo. Món ăn chỉ hiện sau khi được duyệt; |
| 69 | `recipe-community.ts` | Đã gửi. Món sẽ hiện trong Cộng đồng | Đã gửi. Món ăn sẽ hiện trong Cộng đồng |
| 70 | `recipe-community.ts` | Gỡ món khỏi cộng đồng | Gỡ món ăn khỏi cộng đồng |
| 71 | `recipe-community.ts` | Cần kết nối mạng để xem món cộng đồng. | Cần kết nối mạng để xem món ăn cộng đồng. |
| 72 | `recipe-community.ts` | Món cộng đồng đang tắt. | Món ăn cộng đồng đang tắt. |
| 73 | `recipe-community.ts` | Đang tải món cộng đồng… | Đang tải món ăn cộng đồng… |
| 74 | `recipe-community.ts` | Chưa có món cộng đồng | Chưa có món ăn cộng đồng |
| 75 | `recipe-community.ts` | Không tìm thấy món phù hợp | Không tìm thấy món ăn phù hợp |
| 76 | `recipe-community.ts` | Tìm món cộng đồng | Tìm món ăn cộng đồng |
| 77 | `recipe-community.ts` | Tìm món cộng đồng… | Tìm món ăn cộng đồng… |
| 78 | `recipe-community.ts` | Lọc món | Lọc món ăn |
| 79 | `recipe-community.ts` | Món do các gia đình khác chia sẻ | Món ăn do các gia đình khác chia sẻ |
| 80 | `recipe-community.ts` | Đăng nhập tài khoản gia đình để báo cáo món. | Đăng nhập tài khoản gia đình để báo cáo món ăn. |
| 81 | `recipe-community.ts` | Báo cáo món | Báo cáo món ăn |
| 82 | `recipe-community.ts` | Bạn đã báo cáo món này rồi. | Bạn đã báo cáo món ăn này rồi. |
| 83 | `studio-recipes.ts` | Món cộng đồng | Món ăn cộng đồng |
| 84 | `studio-recipes.ts` | Món cộng đồng | Món ăn cộng đồng |
| 85 | `studio-recipes.ts` | Bật Món cộng đồng trong ứng dụng | Bật Món ăn cộng đồng trong ứng dụng |
| 86 | `studio-recipes.ts` | nguồn Cộng đồng trong kho món. | nguồn Cộng đồng trong kho món ăn. |
| 87 | `studio.ts` | Món gia đình tự viết / bản sao từ thư viện món, trên tất cả gia đình. | Món ăn gia đình tự viết / bản sao từ thư viện món ăn, trên tất cả gia đình. |
| 88 | `studio.ts` | Thư viện món | Thư viện món ăn |
| 89 | `studio.ts` | Thư viện món & giá | Thư viện món ăn & giá |
| 90 | `studio.ts` | Món trong thư viện | Món ăn trong thư viện |
| 91 | `studio.ts` | Món chưa có tranh đã duyệt. | Món ăn chưa có tranh đã duyệt. |
| 92 | `studio.ts` | Không đọc được thư viện món từ bản dựng. | Không đọc được thư viện món ăn từ bản dựng. |
| 93 | `studio-usage.ts` | Sửa món | Sửa món ăn |
| 94 | `studio-voice.ts` | món | món ăn |
| 95 | `personal-ui.ts` | Món / nguyên liệu cần tránh | Món ăn / nguyên liệu cần tránh |
| 96 | `personal-ui.ts` | Tìm món để chọn | Tìm món ăn để chọn |
| 97 | `personal-ui.ts` | Tên món… | Tên món ăn… |
| 98 | `personal-ui.ts` | Chưa có món phù hợp | Chưa có món ăn phù hợp |
| 99 | `personal-ui.ts` | Chọn món | Chọn món ăn |
| 100 | `personal-ui.ts` | Tạo nhanh món mới | Tạo nhanh món ăn mới |
| 101 | `personal-ui.ts` | Kiểm tra món & bữa | Kiểm tra món ăn & bữa |
| 102 | `personal-ui.ts` | Chọn món (Ưu tiên món nhà mình, tiếp theo là kho tham khảo | Chọn món ăn (Ưu tiên món nhà mình, tiếp theo là kho tham khảo |
| 103 | `personal-ui.ts` | Tạo nhanh món mới từ câu vừa nói | Tạo nhanh món ăn mới từ câu vừa nói |
| 104 | `personal-ui.ts` | Thêm món vào bữa | Thêm món ăn vào bữa |
| 105 | `personal-ui.ts` | Chọn món từ danh sách hoặc chọn Tạo nhanh món mới. | Chọn món ăn từ danh sách hoặc chọn Tạo nhanh món ăn mới. |
| 106 | `personal-ui.ts` | Bữa đã có món này. Kiểm tra trước khi thêm trùng. | Bữa đã có món ăn này. Kiểm tra trước khi thêm trùng. |
| 107 | `personal-ui.ts` | Đã thêm món và tính lại danh sách mua. | Đã thêm món ăn và tính lại danh sách mua. |
| 108 | `voice-commands.ts` | {bữa} chưa có món nào trên thực đơn. | {bữa} chưa có món ăn nào trên thực đơn. |
| 109 | `voice-commands.ts` | Thực đơn {ngày} chưa có món nào. | Thực đơn {ngày} chưa có món ăn nào. |
| 110 | `voice-commands.ts` | Chọn món | Chọn món ăn |
| 111 | `voice-commands.ts` | Tạo nhanh món mới | Tạo nhanh món ăn mới |
| 112 | `voice-commands.ts` | Đổi món trong thực đơn | Đổi món ăn trong thực đơn |
| 113 | `voice-commands.ts` | Món mới | Món ăn mới |
| 114 | `voice-commands.ts` | Chưa khớp món nào — chọn món, hoặc tạo nhanh món mới | Chưa khớp món ăn nào — chọn món ăn, hoặc tạo nhanh món ăn mới |
| 115 | `voice-commands.ts` | Thêm món vào bữa | Thêm món ăn vào bữa |
| 116 | `voice-commands.ts` | Thêm món | Thêm món ăn |
| 117 | `voice-commands.ts` | Chọn món mới cho bữa cần đổi. | Chọn món ăn mới cho bữa cần đổi. |
| 118 | `voice-commands.ts` | Chọn món để thêm vào bữa. | Chọn món ăn để thêm vào bữa. |
| 119 | `voice-commands.ts` | món | món ăn |
| 120 | `voice-recipe.ts` | rồi bấm Lưu món gia đình. | rồi bấm Lưu món ăn gia đình. |
| 121 | `voice-recipe.ts` | Tên món | Tên món ăn |
| 122 | `voice-recipe.ts` | Chưa nghe tên món — điền vào đây | Chưa nghe tên món ăn — điền vào đây |
| 123 | `onboarding-guide.ts` | Thực đơn & Kho món | Thực đơn & Kho món ăn |
| 124 | `onboarding-guide.ts` | Kho món có N món tham khảo | Kho món ăn có N món tham khảo |
| 125 | `onboarding-guide.ts` | Kho món có món tham khảo | Kho món ăn có món tham khảo |
| 126 | `onboarding-guide.ts` | Chạm tên món để xem nhanh | Chạm tên món ăn để xem nhanh |
| 127 | `onboarding-guide.ts` | Mở Kho món | Mở Kho món ăn |
| 128 | `onboarding-guide.ts` | Vietlish) để thêm món, ghi giá | Vietlish) để thêm món ăn, ghi giá |
| 129 | `offline-downloads.ts` | Món của gia đình luôn có sẵn. | Món ăn của gia đình luôn có sẵn. |
| 130 | `offline-downloads.ts` | Hình món tuần này | Hình món ăn tuần này |
| 131 | `offline-downloads.ts` | Toàn bộ hình món | Toàn bộ hình món ăn |
| 132 | `offline-downloads.ts` | label:'Kho món'} | label:'Kho món ăn'} |
| 133 | `offline-downloads.ts` | Hình món | Hình món ăn |
| 134 | `offline-downloads.ts` | Kho món | Kho món ăn |
| 135 | `offline-downloads.ts` | Đang lưu hình món tuần này… | Đang lưu hình món ăn tuần này… |
| 136 | `offline-downloads.ts` | Cần mạng để lưu hình món. | Cần mạng để lưu hình món ăn. |
| 137 | `offline-downloads.ts` | Đang tải kho món… | Đang tải kho món ăn… |
| 138 | `offline-downloads.ts` | Kho món chưa tải về máy | Kho món ăn chưa tải về máy |
| 139 | `sw.ts` | Kho món chưa được tải về máy này. | Kho món ăn chưa được tải về máy này. |
| 140 | `menu-reactions-ui.ts` | Cả nhà thấy món này thế nào | Cả nhà thấy món ăn này thế nào |
| 141 | `menu-reactions-ui.ts` | Chưa có món được thích. | Chưa có món ăn được thích. |
| 142 | `menu-reactions-ui.ts` | Chưa có món bị chê. | Chưa có món ăn bị chê. |
| 143 | `menu-reactions-core.ts` | hrow Error('Món không hợp lệ. | hrow Error('Món ăn không hợp lệ. |
| 144 | `insights-ui.ts` | Thử món chưa nấu | Thử món ăn chưa nấu |
| 145 | `insights-ui.ts` | Xem món & thêm vào bữa | Xem món ăn & thêm vào bữa |
| 146 | `insights-ui.ts` | Món nấu nhiều trong 30 ngày | Món ăn nấu nhiều trong 30 ngày |
| 147 | `insights-ui.ts` | Nhà mình với món này | Nhà mình với món ăn này |
| 148 | `insights-ui.ts` | Nhà mình thấy món này | Nhà mình thấy món ăn này |
| 149 | `insights-ui.ts` | Thử món khác cùng nhóm | Thử món ăn khác cùng nhóm |
| 150 | `family-features.ts` | Một công thức trong Kho món | Một công thức trong Kho món ăn |
| 151 | `family-features.ts` | Tên món | Tên món ăn |
| 152 | `family-features.ts` | oast('Điền tên món và cách nấu trước khi nhập. | oast('Điền tên món ăn và cách nấu trước khi nhập. |
| 153 | `simple-view.ts` | 🌱 Giải phóng tủ lạnh & gợi ý món từ tủ | 🌱 Giải phóng tủ lạnh & gợi ý món ăn từ tủ |
| 154 | `artwork.ts` | Minh họa món | Minh họa món ăn |
| 155 | `netlify/lib/push.mts` | Kiểm tra tủ và lịch sử món đã nấu, rồi chọn món mới | Kiểm tra tủ và lịch sử món ăn đã nấu, rồi chọn món mới |
| 156 | `netlify/lib/community-recipes.mts` | Thiếu tên món. | Thiếu tên món ăn. |
| 157 | `netlify/lib/community-recipes.mts` | Kho món cộng đồng đang đầy. | Kho món ăn cộng đồng đang đầy. |
| 158 | `netlify/lib/community-recipes.mts` | Không tìm thấy món đã chia sẻ. | Không tìm thấy món ăn đã chia sẻ. |
| 159 | `netlify/lib/community-recipes.mts` | Món này không còn trong hàng chờ. | Món ăn này không còn trong hàng chờ. |
| 160 | `netlify/lib/community-recipes.mts` | Không tìm thấy món. | Không tìm thấy món ăn. |
| 161 | `privacy.html` | Món cộng đồng | Món ăn cộng đồng |
| 162 | `privacy.html` | 5b. Món chia sẻ cộng đồng | 5b. Món ăn chia sẻ cộng đồng |
| 163 | `privacy.html` | ủ thực phẩm, Sửa món, Giọng nói | ủ thực phẩm, Sửa món ăn, Giọng nói |

Rows that appear more than once in a file (e.g. “Xóa món ăn này khỏi bữa” as `title`, “Chọn món ăn” in two pickers,
“Thư viện món ăn & giá” in two Studio views, “Không tìm thấy món ăn” in two server errors) were all changed.

## Voice vocabulary — “món ăn” accepted in addition to “món” (nothing removed)

| File | Change |
|---|---|
| `voice-commands.ts` `vcCleanTail` | leading `món ăn` stripped like `món` (“đổi thành món ăn phở bò” → dish “phở bò”) |
| `voice-recipe.ts` title markers | added `công thức món ăn`, `cách nấu món ăn`, `cách làm món ăn`, `món ăn` before the `món` forms |
| `personal-core.ts` lexicon | filler `món ăn`; meal phrases `làm món ăn`, `nấu món ăn` |
| `personal-ui.ts` heard-name clean-up | `mon an` removed before `mon` in both quick-add regexes |

New assertions: `voice-commands.test` (“tối thứ Ba đổi thành món ăn phở bò” → dish “phở bò”) and `voice-recipe.test`
(“Công thức món ăn canh bí đỏ…” → title “Canh bí đỏ”, 4 servings). Both fail on the previous build and pass now.

## Kept, with reasons (notable)

| Kept | Where | Reason |
|---|---|---|
| Món mặn / Món canh / Món rau / Món nước (cuối tuần) / Món chính / Món phụ / Món Âu & Ý / Món Việt / món chay | chips, selects, catalogue tags | category names (specific) |
| `N món`, `Xem thêm N món`, `Đang hiện N/M món`, `Kho 740 món`, `Xong · N món`, `Tối đa 12 món`, `Số món mỗi bữa`, `0 món` | counts | count wording |
| Món nhà mình / Thêm món nhà mình / Chép thành món nhà / Đã có trong món nhà | library, recipe card | “món nhà” compound (owner keeps) |
| Bỏ hết món | Menu card, next to “+ Thêm / bớt món ăn” | space-critical pair of buttons in the 7-day grid (desktop columns ≈ 60–85 px) |
| Cỡ món, Nhóm món, Vai trò món, Thời gian nấu tối đa / món, ảnh món / Ảnh món (không bắt buộc), Cả món, Chỉ ảnh + tên món | forms | short compound labels; “món ăn” adds width with no gain |
| Mỗi bữa đủ món, mỗi món vừa phần…; Nhiều món, lượng nấu vừa đủ; Chọn vài món ngon…; hints about chia phần | headings/hints | idiomatic prose |
| Món gia đình mới, Món từ ghi chú, “Món tự nhập chưa có định lượng…” | default **recipe name / prep text saved into family data** | data, not UI copy |
| Recipe catalogue (`recipe-catalog.ts`, `seed.ts`), planning themes (Đổi vị với món cá, Một món nhà mình thích, Cuối tuần ăn món nước) | data / theme titles | catalogue content; specific |
| “món” meaning a shopping **item**: So Giá, Giá cộng đồng, Studio price tables (“Món · cửa hàng”, “Món”), Đi chợ (“+ Mua thêm món / nguyên liệu…”, “Còn cần mua N món”, “N món chưa rõ giá”), push “Nhờ mua thêm ngay” | price-scout-ui, studio, app, voice answers | not the dish noun; `price-scout-ui.ts` also owned by agent II2 |
| Chọn món cuối tuần ↗, Mở kho món nước | weekend noodle panel | specific to “món nước” |
| Thích món này / X thích món này (aria), Đã ghi: X thích món này | menu reactions | demonstrative in a short phrase; the heading “Cả nhà thấy món ăn này thế nào?” was changed |
| Long prose (privacy policy body, community share explanation, push body second clause, onboarding bullets) | various | “món ăn” repeated in one sentence reads awkwardly; first standalone noun changed where it is the subject |
| Mã món không hợp lệ, Thiếu món nguồn | server errors | technical id wording |
| Voice vocabularies | voice files | still accept “món”; “món ăn” added (above) |

## Tests whose exact Vietnamese assertions changed (still exact, not weaker)

* `catalog-filters-browser`, `recipe-community-browser`: `/Không tìm thấy món.*\(0 món\)/` → `/Không tìm thấy món ăn khớp.*\(0 món\)/`
* `recipe-community-browser`: “Chưa có món cộng đồng” → “Chưa có món ăn cộng đồng”; Studio nav “Món cộng đồng” → “Món ăn cộng đồng”
* `offline-downloads-browser`: “✓ Hình món tuần này” → “✓ Hình món ăn tuần này”; network title “Kho món ✗” → “Kho món ăn ✗”

## Responsive QA (rules 7–9) — browser viewport simulation in Chromium, not physical devices

Device-only mode, synthetic plan (one dinner with 3 catalogue dishes, other meals empty so empty states show).
Screens: Menu (Thực đơn), meal editor modal, Kho món ăn của gia đình, Hôm nay (phones).

| Size | Theme / lang | Horizontal overflow | “món ăn” controls wrapping/clipped |
|---|---|---|---|
| 320×740 | VI light, VI dark | none | none for buttons/tabs; checkbox label “Lưu luôn vào Kho món ăn gia đình cho lần sau” and field label “Tìm món ăn trong kho gia đình hoặc 740 món tham khảo” wrap to 2 lines (labels, wrap is fine) |
| 375×812 | VI light, VI dark, EN light | none | none for buttons/tabs |
| 820×1100 | VI light | none | “+ Thêm / bớt món ăn” wraps to 2 lines in the 7-day grid (before: “+ Thêm / bớt món” already 2–4 lines there) |
| 1280×800 | VI light | none | same grid button 3–5 lines; previous text was already 3–4 lines in these ~60–85 px columns — pre-existing grid density, not a new clip |

* At 320 px “+ Thêm / bớt món ăn” and “+ Viết món ăn” fit on one line; tab “Món ăn gia đình (0)” is 112 px (was 98 px) inside the
  existing horizontally scrollable tab bar (`overflow-x:auto`, already wider than the screen before: 399 → 413 px scroll width).
* Screenshots (JPEG q70, all < 40 KB except tablet/desktop < 70 KB) in this folder: `menu-*`, `meal-editor-*`, `library-*`, `today-*`
  named `<screen>-<class>-<WxH>-<lang>-<theme>.jpg`.
* Limits: no physical devices; reduced motion was emulated (`reduce`); online state only for these screenshots (offline labels
  covered by `test:offline:browser`); Studio views checked by `test:recipe-community:browser` (nav label + no overflow) only.

## Checks run locally (supporting evidence; GitHub CI is the release gate)

`npm run build`, `npm run check`, `npm run typecheck`, `npm test` — pass.
Browser: `test:browser`, `test:library-guide:browser`, `test:catalog:browser`, `test:catalog-filters:browser`,
`test:menu-reactions:browser`, `test:recipe-community:browser`, `test:voice:browser`, `test:voice-commands:browser`,
`test:ladybug:browser`, `test:offline:browser`, `test:usage:browser` — all pass (local sandbox, Chromium 1243).
GitHub CI has **not** run on this branch (not pushed). Not deploy approval.
