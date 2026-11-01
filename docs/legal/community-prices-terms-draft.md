# DRAFT: Community price sharing terms and privacy notes

> **DRAFT. This needs owner and legal review before any public use.**
> It was written by an engineering agent for the community price pilot (v1.5). It is not legal advice. Australian law applies, including the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs), and the Australian Consumer Law (ACL). Version id used by the app: `2026-11-draft`.

---

## Tiếng Việt: Điều khoản chia sẻ giá cộng đồng (bản nháp)

1. **Giá đúng, thấy tận mắt.** Bạn chỉ chia sẻ giá mà bạn thật sự thấy ở cửa hàng: ảnh nhãn giá trên kệ, hoặc một dòng trong hóa đơn đã xác nhận. Giá phải đúng và còn hiệu lực ở thời điểm chụp.
2. **Không đăng giá sai.** Không đăng giá bịa. Không đăng giá nhằm quảng cáo cho cửa hàng của bạn, hay nhằm hạ uy tín một cửa hàng khác. Nếu bạn làm chủ hoặc làm việc cho một tiệm, hãy dùng kênh “Giá do tiệm đăng”.
3. **Chia sẻ ẩn danh.** Mỗi lần chia sẻ chỉ gửi các dữ kiện sau:
   - món và tên trên nhãn
   - giá và đơn giá
   - quy cách
   - cửa hàng
   - chi nhánh (khu và postcode do bạn chọn)
   - bang
   - khuyến mãi và ngày kết thúc
   - thời điểm chụp
   - dấu vân ảnh (mã SHA-256)
   - kết quả đối chiếu giá đọc từ ảnh

   Tên bạn, tên gia đình, ghi chú và các dòng hóa đơn khác **không** được chia sẻ. Người dùng khác chỉ thấy “Cộng đồng”.
4. **Kiểm duyệt.** Giá có thể được kiểm duyệt. Nếu giá khác thường, bạn có thể chọn gửi ảnh để người kiểm duyệt xem. Ảnh lưu ở khu vực riêng và bị xóa sau khi duyệt, hoặc chậm nhất sau 14 ngày.
5. **Gỡ và giới hạn.** Chúng tôi có thể ẩn hoặc gỡ giá. Tài khoản đăng giá sai, hoặc có dấu hiệu xung đột lợi ích, có thể bị giới hạn.
6. **Chỉ để tham khảo.** Giá cộng đồng do các gia đình khác báo lại. Đó không phải giá niêm yết, cũng không phải giá được bảo đảm. Hãy kiểm tra giá tại cửa hàng.
7. **Ngừng và gỡ.** Bạn có thể ngừng chia sẻ bất cứ lúc nào: chỉ cần không đánh dấu ô chia sẻ. Bạn cũng có thể liên hệ hỗ trợ để yêu cầu gỡ những giá đã chia sẻ.

Khi bạn bấm “Đồng ý & chia sẻ”, ứng dụng lưu thời điểm bạn đồng ý cùng phiên bản điều khoản.

## English: Community price sharing terms (draft)

1. **Accurate, seen in person.** Only share a price you actually saw in a store, either as a shelf-tag photo or as a line on a confirmed receipt. It must be accurate and current when captured.
2. **No false prices.** Do not post made-up prices. Do not post prices meant to promote your own shop or to harm another store. If you own or work for a shop, use the "Shop-posted price" channel.
3. **Anonymous sharing.** Each share sends only these facts:
   - the item and its label
   - the price and unit price
   - the pack size
   - the store
   - the branch (the suburb and postcode you choose)
   - the state
   - any deal and its end date
   - the capture time
   - a photo fingerprint (SHA-256)
   - whether the price read from the photo matched

   Your name, your family, your notes and the other receipt lines are **never** shared. Other users only see "Community".
4. **Moderation.** Prices may be moderated. If a price looks unusual, you may choose to send the photo for a moderator to see. The photo is kept in a private area and deleted after review, or within 14 days at most.
5. **Removal and limits.** We may hide or remove prices. Accounts that post false prices, or that show conflict-of-interest signals, may be limited.
6. **A guide only.** Community prices are reported by other families. They are not guaranteed shelf prices. Check the price in store.
7. **Stopping and removal.** You can stop sharing at any time by leaving the share box unticked. You can also contact support to ask for prices you shared to be removed.

When you tap "Agree & share", the app records when you agreed and which version of these terms you agreed to.

---

## Privacy notes for the owner (draft, English)

**Data collected per contribution, in the `bep-community` store:**

- **Extracted price facts:** the items listed in term 3 above.
- **Contributor username:** used for trust, rate limits and bans. It is never returned by the public API.
- **Salted hash of the family id:** used for "one vote per family".
- **Salted hash of the IP address:** used for rate limits and the shared-network signal.
- **Submission time.**
- **Evidence fingerprint:** a SHA-256 marker used to reject duplicates.

**Photos:**
- A photo is stored only when a submission is held for moderation and the contributor agrees to send it.
- The server checks that the uploaded bytes hash to the evidence hash.
- The photo is deleted when a moderator acts on it, or by the prune job after 14 days.

**Receipts:** the server reads the contributor's own family receipt to confirm that the line exists. Only the line's price facts are shared.

**Shop channel:** the shop name, ABN (free text, not verified automatically), suburb and postcode are stored. Shop-posted prices expire after 14 days.

**Retention:**
- Item shards keep about 40 days of submissions. Held items are kept until a moderator acts.
- Rate counters are deleted after 2 days.
- Photos are deleted after review, or within 14 days at most.
- Contributor trust records persist while the account exists. *TODO: delete them on account deletion. This is not wired yet.*

**APPs to address before public launch:**
- **APP 1:** update the privacy policy.
- **APP 5:** give a collection notice. The consent sheet is a start, not the full notice.
- **APP 6:** use the data only for price display and moderation.
- **APP 11:** retention and deletion, as listed above.
- **APP 12 and 13:** access and correction. Support can remove a contributor's submissions through Studio's ban, hide and reject actions. A bulk "remove my contributions" tool is **not built**.

**ACL and defamation risk:**
- Community prices are labelled as reports, not guarantees.
- "Report wrong price" and moderation exist.
- Retailer names appear only as store names. No retailer content (screenshots or website captures) is shared.
- Get advice on comparative price claims before any marketing use.

**Shop ABN:** the shop channel stores the ABN as free text. Verifying it with the ABN Lookup service is a manual owner step.
