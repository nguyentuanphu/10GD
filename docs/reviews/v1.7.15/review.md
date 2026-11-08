# v1.7.15 — search at the top right of every screen, and a “Tính năng” tab in the guide

**Owner, 8 Nov 2026 (Sydney time):** *“Làm một cái magnify glass trên góc phải của mỗi trang làm tìm kiếm những thứ mà người ta cần, theo bạn sẽ tìm kiếm được gì? Với cả trong how to use thì cần có 1 tab để cho người ta biết mình có features gì và nó là như thế nào.”*

**Plan approved by pop-up (8 Nov 2026):**
- Search: dishes, pantry, shopping, menu, receipts / spending / prices, guests and invitations, features and settings.
- **Not** offered by the search: the switches that turn off usage or voice statistics.
- No voice search (*“Chưa cần”*).
- *“Duyệt, làm luôn.”*

## 1. Search (magnifier)
- **Where:** a drawn magnifier (≥ 44 px) at the top right of every screen, before VI │ EN. It opens *Tìm kiếm*: full screen on phones, a sheet on larger screens. The cursor is in the box.
- **What it finds:**
  - **Món ăn:** the library and the family's own dishes; opens the recipe.
  - **Trong tủ:** amount, fridge / freezer / cupboard, use-by; opens the pantry on that item, marked for a moment.
  - **Đi chợ:** the list in view, *Cần mua X* or *Đã mua*; opens the row.
  - **Thực đơn:** dishes from 2 weeks back to 4 weeks ahead, *“Bữa tối · T3 10/11”*; opens that day on that meal.
  - **Hoá đơn & giá:** shops, receipt lines with price and date; opens the receipt.
  - **Khách:** guest groups on coming meals, with their answer; opens the guest sheet for that meal.
  - **Tính năng & cài đặt:** 23 features (shared with the guide tab); opens the screen or setting.
- **How it matches:**
  - Accents are optional (*bun bo*, *thit heo*). Vietnamese and English ingredient names both match (*pork* finds *Thịt heo*).
  - Results are grouped, at most 6 per group. **Enter** opens the first result.
- **Privacy:** everything is searched on the device, so it works offline. The words typed are not sent anywhere.
- **Not offered:** *tắt thống kê*, *usage statistics*, *voice statistics* and *voice sharing* find nothing about those switches (owner pop-up).
- **Narrow phones (≤ 360 px):** the top bar's gaps are smaller so the magnifier fits at 320 px. Every button is still ≥ 44 px, and the app name stays.

## 2. Hướng dẫn sử dụng: *Bắt đầu* │ *Tính năng*
- Two tabs: **Bắt đầu** (the steps, as before) and **Tính năng**.
- **Tính năng** lists every feature with its drawing, its name, what it does in one or two sentences, and **Mở** (words only, ≥ 44 px), which opens it.
- The features: Hôm nay, Thực đơn tuần, Đi chợ, Tủ đồ, Món ăn, Hoá đơn, Chi tiêu, Thống kê & sở thích, So Giá, Có khách, Mời khách qua link, Lịch tháng, Nhắn khẩn, Giọng nói, Nhắc nhở, Thành viên & khẩu phần, Kết nối gia đình, Tiền tệ & giá, Giao diện, Sao lưu, Dùng khi mất mạng, Hướng dẫn, Điều khoản & quyền riêng tư.
- The guide keeps one height, so switching tabs never moves the tabs (rule 24).

## Tests
- **New suite `test:v1715:browser`** (in `test:all`), at 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN). It checks:
  - **The magnifier:** drawn, at the top right, ≥ 44 px, labelled, on Today, Menu, Shopping, Pantry and Recipes.
  - **Searching:**
    - pantry + receipt (*pork*), no accents (*thit heo*), a shop, a guest, a dish on the menu and in the library, a feature;
    - the statistics switches are not offered (6 phrasings).
  - **Results and opening them:**
    - rows ≥ 44 px, words only;
    - a pantry result shows the card;
    - Enter opens the first result;
    - works offline.
  - **Guide tabs:** two tabs; tapping does not move the tab; ≥ 20 features, each with a drawing, a name, what it does and *Mở*; no statistics switch listed; *Mở* opens the screen.
  - No overflow, no page errors.
- **Also run:**
  - `default-language` (rule 27, name at 320);
  - `browser` (account menu, top bar);
  - `language` (no mixed languages);
  - `artwork`, `emoji-art`, `ladybug`, `library-guide`, `scout-pair`, `authenticated-startup`.

## Evidence
- `docs/reviews/v1.7.15/{search-results,guide-features}-{vi,en}-{size}.png`. Chromium viewport simulation, not physical devices.

## Limits
- The search covers what is on this device. A family member's changes appear after sync.
- The menu is searched from 2 weeks back to 4 weeks ahead.
