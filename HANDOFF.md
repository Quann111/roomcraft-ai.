# RoomCraft AI (SOLYC Gen Labs) — Tài liệu chuyển giao

Cập nhật: **2026-10-30**. Code: `main` @ `9936e27` (PR #64), repo [Quann111/roomcraft-ai.](https://github.com/Quann111/roomcraft-ai.) (private).
Production: https://roomcraft-ai.quann111.workers.dev, đang chạy `main` @ `440f7c3` (PR #70), version `b53bc28f`, deploy 2026-10-31.

Tài liệu dành cho người hoặc coding agent mới nhận phần **tính năng AI và giao diện của chúng**. Phần web chung, đăng nhập và bảo mật toàn site do người khác phụ trách.

## 0. Đọc theo thứ tự này

1. Mục 1–2: sản phẩm và kiến trúc.
2. Mục 6: **quy tắc bắt buộc**. Đọc trước khi sửa bất cứ thứ gì.
3. Mục 3–4: từng công cụ AI chạy model nào, và các tính năng phức tạp nhất.
4. Mục 5: lệnh hằng ngày và cách deploy.
5. Mục 7: các bẫy đã gặp thật.

Kiểm tra nhanh:

```bash
git status; git log --oneline -5
npx tsc --noEmit && npx vite build   # kỳ vọng: không lỗi, "built in …"
```

## 1. Sản phẩm và trạng thái

Web app thiết kế nội thất bằng AI: tải ảnh phòng hoặc bản vẽ, chọn phong cách hoặc vật liệu, AI trả ảnh. Giao diện song ngữ Việt/Anh (`src/web/i18n.ts`, hàm `bi()` và `t()`).

- **Trang chủ `/app`** chia 3 nhóm công cụ (PR #62):
  - **Doanh nghiệp:** Mặt bằng 3D cho doanh nghiệp, Mặt bằng 3D, Tạo video, Sun & Wind.
  - **Tư vấn – Kiến trúc sư:** các công cụ thiết kế lại, Tư vấn thiết kế, Nhận xét thiết kế.
  - **Cá nhân:** Bài trí ảo, Xoá đồ, Đổi vật liệu, Thử màu sơn, Tìm nội thất, Sắp xếp phòng.
  - Tab "Tất cả" mở khung liệt kê mọi công cụ. Ctrl+K, Cmd+K hoặc `/` mở menu Mở nhanh.
- **Danh sách công cụ:** `TOOLS` trong `src/web/App.tsx`. Mỗi tool có `cat` (nhóm) và `spaces` (tool id phía worker). Tool không có `spaces` hiện "Sắp ra mắt".
- **Truy cập mở:** `OPEN_ACCESS=1` có chủ đích. Khách không đăng nhập dùng chung một tài khoản admin. **Đừng báo đây là lỗi bảo mật.** Đặt `"0"` để bật lại đăng nhập.
- **Credit:** `DAILY_CREDITS=3`, nạp lại mỗi 24 giờ; admin không giới hạn. Mỗi ảnh 1K tốn 1 credit (2K: 2, 4K: 3). Lỗi thì hoàn credit.
- **Trang test nội bộ** (không có link từ menu): `/test-results`, đọc từ `public/test-results/manifest.json`.
- **Trang chi phí:** `/admin` (bảng `api_costs`, import được CSV billing của RunningHub).
- **Trang điều tra kết quả:** `/admin/investigate` (mục 4.6). Hai trang admin chỉ mở khi đăng nhập thật bằng email admin (`realAdmin`).
- **Thiết bị vệ sinh Viglacera** (nhóm Doanh nghiệp, PR #72–74): bồn cầu, chậu rửa, vòi chậu; chọn 1–3 món, lắp cùng lúc trong một ảnh.

## 2. Kiến trúc và luồng dữ liệu

```text
Trình duyệt (React + Vite, src/web)            Cloudflare Worker (Hono, src/worker/index.ts)
  ├─ imagePrep.ts: nén/cắt ảnh, vẽ khung         ├─ prompts.ts   : mọi prompt + kiểm tra input (CHỈ ở server)
  │   tường phối cảnh cho mặt bằng                ├─ runninghub.ts: gọi RunningHub (ảnh, video, LLM)
  ├─ POST /api/upload ─────────────────────────► ├─ R2  IMAGES  : in/<user>/…, out/<user>/…, facts/…
  ├─ POST /api/generate ───────────────────────► ├─ D1  DB      : users, generations, credit_ledger, api_costs…
  └─ GET  /api/generations/:id (poll 5 s) ─────► └─ cron * * * * * → settleOpenJobs (tab đóng vẫn xong job)
                                                         │
                                                         ▼
                                              RunningHub: tạo task → query → tải ảnh về R2
```

**Một lần tạo ảnh:**
1. Ảnh lên R2 qua `/api/upload`.
2. `/api/generate` dựng prompt bằng `buildPrompt(tool, params)`, gửi task lên RunningHub, ghi một dòng `generations` trạng thái `RUNNING`.
3. Trình duyệt hỏi `/api/generations/:id`. Mỗi lần hỏi, hàm `settle()` kiểm tra task. Xong thì tải ảnh vào `out/…` và đặt `SUCCESS`.
4. Nếu tab đã đóng, cron chạy mỗi phút sẽ settle các job mở trong 20 phút gần nhất. Quá 15 phút thì job `FAILED` và hoàn credit.

**Thứ tự trong `settle()`** (theo thứ tự này):
1. Tự kiểm tra (`qaCheck`), nếu được bật.
2. Bước đánh bóng bằng Gemini (`startPolish`), chỉ có ở Mặt bằng 3D.
3. Lưu kết quả.

Lệnh UPDATE cuối có điều kiện `rh_task_id=?`, để một lần poll đến muộn không ghi đè bản vẽ lại mới hơn.

**Lịch sử ảnh:** "Thiết kế gần đây" dùng chung cho mọi công cụ. Các ảnh cùng một lần chạy Mặt bằng 3D doanh nghiệp có chung `params.batchId` và gộp thành một thẻ.

**Bindings** (`wrangler.jsonc`):
- `DB` (D1 `roomcraft`)
- `IMAGES` (R2 `roomcraft-images`)
- `ASSETS` (`dist/`, SPA; `/api/*` vào worker trước)
- vars `DAILY_CREDITS`, `OPEN_ACCESS`

Secret là `RUNNINGHUB_API_KEY`. Ở local nó nằm trong `.dev.vars`, đã gitignore. **Không bao giờ in key ra.**

Migrations: `migrations/0001`–`0005`. `0001`–`0004` đã áp lên production; `0005` (điều tra kết quả) phải áp trước lần deploy kèm nó.

## 3. Công cụ AI và model

Giá RunningHub (economy):
- Gemini flash image: $0.027 mỗi ảnh 1K.
- GPT Image 2.5 Sunburst: $0.05 cố định.
- Nano Banana Pro: $0.06.
- Veo 3.1 Fast: $0.20 mỗi clip 8 giây.
- LLM `google/gemini-3.8-flash` (đọc ảnh): khoảng $0.002 mỗi lần gọi.

Tên model nằm ở `runninghub.ts`; `costs.ts` ánh xạ ra giá.

| Tool id (worker) | Thẻ trên web | Model | Ghi chú |
|---|---|---|---|
| `interior-redesign`, `exterior-redesign`, `garden-redesign` | Thiết kế hoàn hảo | flash | Giữ khung hình và mục đích phòng |
| `interior-staging`, `interior-declutter`, `interior-sketch`, `interior-transfer`, `interior-compose`, `interior-lighting`, `exterior-sky`, `*-text` | Các thẻ tương ứng | flash (text → text-to-image) | |
| `interior-paint`, `exterior-paint` | Thử màu sơn | flash | 5 mức độ bóng |
| `interior-material` (1 bề mặt) | Đổi vật liệu | flash | Độ bóng tuỳ chọn |
| `interior-material` (2–5 bề mặt, `changes`) | Đổi vật liệu | **GPT 2.5** | Bỏ sàn nếu ảnh không có sàn trống (`skipped`) |
| `interior-floor` + gạch VICOSTONE | Đổi vật liệu (tab Sàn) | **GPT 2.5** | Bước "scout" đọc ảnh trước, tự kiểm tra tuỳ chọn |
| `interior-floorplan` | Mặt bằng 3D | **GPT 2.5** rồi **flash** đánh bóng | Xem mục 4.1 |
| `interior-bizplan` | Mặt bằng 3D cho doanh nghiệp | **GPT 2.5** mỗi phòng | Xem mục 4.2 |
| `interior-critique`, `interior-advisor`, `interior-finder`, `exterior-orient` | Nhận xét, Tư vấn (chat), Tìm nội thất, Sun & Wind | LLM gemini-3.8-flash | Trả JSON; Sun & Wind thêm 1 ảnh minh hoạ |
| `interior-video` | Tạo video | Veo 3.1 Fast | 8 giây |

**Tự kiểm tra** (ô tick, mặc định tắt) có cho gạch VICOSTONE, Mặt bằng 3D và từng phòng doanh nghiệp. Cách chạy:
1. Gemini so sánh ảnh vào với ảnh ra.
2. Nếu thấy lỗi nặng thì vẽ lại 1 lần, kèm ghi chú về lỗi đó.
3. Giữ bản ít lỗi hơn. Không tính thêm credit.

Code nằm ở `checkFor` và `qaCheck` trong `index.ts`.

## 4. Tính năng phức tạp nhất

### 4.1 Mặt bằng 3D (2D → 3D), PR #41, #58

Bài học quan trọng nhất: **model chỉnh ảnh giữ nguyên bố cục của ảnh đầu vào**. Vì vậy góc nhìn phải được tạo sẵn bằng cách biến đổi ảnh vào. Bảo model "xoay góc nhìn" thì nó chỉ kéo méo tường.

1. **Đọc bản vẽ:** `/api/floorplan/read` cho LLM đọc bản vẽ (`PLAN_READ_PROMPT`). Kết quả gồm kích thước tổng, khung cắt quanh toà nhà, danh sách phòng theo thứ tự và các phòng không có. Lưu cache ở R2 `facts/<inputKey>.json`.
2. **Vẽ khung tường:** `perspGuide()` trong `src/web/imagePrep.ts` chạy trên trình duyệt (cả điện thoại). Nó chiếu bản vẽ qua một **camera pinhole thật** (nhìn chính diện, chếch 42°) hai lần lên canvas 16:9:
   - lớp nét đậm ở mặt sàn;
   - lớp xanh nhạt ở đỉnh tường cao 1,2 m.
3. **GPT 2.5** dựng mỗi bức tường giữa hai lớp đó, nên mọi tường tụ đúng về một điểm (`PERSPECTIVE_GUIDE`). Ảnh 2 là bản vẽ thẳng đứng, để model đọc tên phòng.
4. **Đánh bóng bằng Gemini flash** (`startPolish`, `PLAN_POLISH_PROMPT`): làm sáng và tươi màu, không dịch chuyển hình. Ảnh GPT được giữ làm bản nháp (`draftKey`). Bước đánh bóng lỗi hoặc quá hạn thì job kết thúc bằng ảnh GPT (`polishFailed`).
5. **Benchmark trên 7 bản vẽ** (thư mục scratch, không có trong repo):
   - Khung camera giữ kết cấu tốt bằng cách GPT cũ, và cho đường tụ nhất quán.
   - Bước đánh bóng giữ khoảng 96% nét tường.
   - Đưa thêm ảnh mẫu màu cho Gemini thì nó vẽ lại cả bố cục, nên **không dùng**.
   - Bản 2 điểm tụ (nhìn từ góc) chưa ổn định nên chưa đưa vào.

### 4.2 Mặt bằng 3D cho doanh nghiệp, PR #15, #52, #55, #64

- **Các bước:**
  1. `/api/bizplan/detect`: LLM tìm các phòng, kèm khung toạ độ.
  2. Trình duyệt cắt từng phòng (`BizPlan.tsx`).
  3. `/api/bizplan/render`: mỗi phòng một job GPT 2.5, chung `batchId`.
- **Màn xem một lần chạy:** `PlanRun.tsx`. Có các phiên bản ‹ › cho từng phòng, tick "Vẽ lại" kèm ghi chú, và ★ ảnh mẫu.
- **Vẽ lại** (`/api/bizplan/redo`): dùng một phòng đã xong làm ảnh mẫu, kèm bảng màu Gemini đọc từ ảnh đó (`PALETTE_PROMPT`) để đồng bộ vật liệu. Kết quả nhập vào cùng lần chạy.
- **Bấm ảnh phòng** mở lớp nổi có nền mờ (`RoomMaterials.tsx`, PR #64):
  - Bên trái là ảnh lớn có ‹ › chuyển phiên bản; bên phải là bảng Đổi vật liệu.
  - Thay đổi gửi `/api/generate` kèm `planRun: { batchId, id }` và áp lên phiên bản đang xem.
  - Kết quả là phiên bản mới của phòng (`params.planRoom: true`), hiện ngay trong cửa sổ.

### 4.3 Đổi vật liệu (gộp cả Floor Editor cũ), PR #25–26, #47, #54, #63

- **Bề mặt:** sàn, tường, mặt bàn bếp, tủ, trần.
  - Mẫu vật liệu: `public/materials/<surface>/<slug>.jpg`.
  - Mô tả hình ảnh của từng vật liệu: `SURFACE_LOOK` / `WALL_LOOK` (server).
- **Một bề mặt** chạy engine riêng của bề mặt đó. **Từ 2 bề mặt trở lên** chạy một lần GPT với `changes` (`cleanChanges`, `multiSurfacePrompt`).
- **Gạch VICOSTONE** 120×120 cm, bóng kiếng (`floorTiles.ts`):
  - Gửi kèm ảnh mẫu gạch; bước scout đọc trước thảm, người và đồ vật trong ảnh.
  - Gạch giữ nguyên độ bóng của sản phẩm.
- **Độ bóng 5 mức:** `FINISHES` = matte, textured, satin, semi-gloss, gloss (Mờ, Nhám, Bóng nhẹ, Bán bóng, Bóng). Dùng chung cho sơn và vật liệu.
  - Mỗi mức mô tả cách ánh sáng phản chiếu trên bề mặt (`FINISH_LOOK`). Chỉ ghi tên mức thì AI gần như không đổi gì.
  - Giao diện: `src/web/FinishPicker.tsx`.
  - Thực tế Mờ và Nhám chỉ khác ở độ sần, phải nhìn gần mới thấy.

### 4.4 Đá tấm VASTA ESSENTIALS cho mặt bàn và mặt đảo bếp (PR #69 và PR sau đó)

- **Danh mục:** `src/worker/slabs.ts`, ảnh trong `public/materials/slabs/`. Có 18 mẫu, tấm 2800 × 1200 × 9 mm.
  - Ảnh mẫu là cả tấm đặt nằm ngang, rộng 1600 px, gửi kèm ảnh gốc. Ảnh nhỏ cho ô chọn là 320 px.
  - Mô tả vân đá chỉ ở server. `/api/styles` chỉ trả mã, tên và ảnh nhỏ.
  - Ảnh gốc của nhà cung cấp nằm ngoài repo, ở `D:\Desktop\VASTA ESSENTIALS - 1200x2800x9 mm`.
- **Độ bóng:** chọn trên thang 5 mức chung (`FinishPicker`).
  - Không chọn ("Tự nhiên") thì dùng độ bóng mẫu đó đang bán: có bản DP thì bóng, không thì mờ.
  - Tên cũ có hậu tố `-DM`/`-DP` trong lịch sử vẫn đọc được, mang theo độ bóng của nó.
  - Calacata Grey không có mã sản phẩm, coi như bán bản bóng.
- **Bề mặt:** "Mặt bàn bếp" là mặt bàn sát tường; "Mặt đảo bếp" (`island`) là bề mặt riêng. Mỗi bề mặt chọn vật liệu thường hoặc một mẫu VASTA.
- **Cách chạy:**
  - Chọn đá, kể cả chỉ 1 bề mặt, luôn chạy dạng `changes` trên GPT Image 2.5.
  - Ảnh mẫu xếp sau ảnh gốc theo `changeSwatches()`: gạch VICOSTONE trước, rồi đến đá.
  - Trước đó Gemini đọc bếp (`KITCHEN_SCOUT_PROMPT`): đảo ở đâu, đồ trên mặt, tường sau bếp.
  - Prompt ghi tên đồ cần giữ và bề mặt cần giữ, kèm luật tấm 2,8 m (không đường nối, không chia ô), cạnh dày 3 cm, không ốp xuống mặt bên.
  - Chỉ chọn mặt đảo mà ảnh không có đảo thì trả 422. Nếu chọn cùng bề mặt khác thì bỏ qua phần đảo.
- **Tự kiểm tra** (`SLAB_QA_PROMPT`): siết riêng lỗi đường nối, vì lỗi này từng lọt qua máy chấm.
- **Test:** 6 bếp × đảo / mặt bàn / cả hai, tổng 48 ảnh.
  - Sau 1 lần vẽ lại: 47/48 đúng khi xem bằng mắt.
  - Lỗi còn lại: đá Armani Charcoal bóng trên đảo cong vẫn có vạch chia ô.
  - Gemini flash và Pro giữ đồ và các bề mặt khác kém hơn nhiều, nên không dùng.

### 4.5 Khác

- **Lưu vào Ảnh trên điện thoại:** `SaveToPhotos.tsx`. Trên điện thoại mở share sheet; nếu không được thì nhấn giữ ảnh.
- **Loader:** `AiThinking.tsx`, gồm "SOLYC Analyzing/Thinking" và vòng xoay quanh logo.
- **Hướng dẫn trong từng công cụ:** `toolGuides.ts`.

### 4.6 Ghi vết và điều tra kết quả xấu (migration 0005)

Mục đích: khi khách thấy ảnh không như ý, biết được đã gửi gì cho model. Mỗi lần tạo có thể ra kết quả khác nhau, nên không kết luận từ một ảnh: chạy lại N lần và xem tỉ lệ đạt.

- **Ghi vết:** `params.trace` của mỗi ảnh mới ghi phiên bản deploy (`CF_VERSION_METADATA`), model, tỉ lệ, độ phân giải, danh sách ảnh đã gửi theo đúng thứ tự (key R2 hoặc đường dẫn asset) và request gốc. Ảnh tạo trước khi có ghi vết thì không chạy lại được.
- **Giữ mọi lần thử:** lần 1 của tự kiểm tra (`-try1`), lần 2 thua lần 1 (`-try2`), bản GPT trước khi Gemini đánh bóng (`-draft`). Xoá ảnh trong lịch sử thì xoá luôn các file này và dữ liệu điều tra.
- **Khách chấm:** dưới mỗi kết quả có 👍/👎 (kết quả chính, xem trước trong lịch sử, lớp nổi phòng Doanh nghiệp). 👎 cho chọn lý do và ghi chú. Dữ liệu ở bảng `generation_feedback`.
- **Trang `/admin/investigate`:**
  - Danh sách: 👎 từ khách, tự kiểm tra lỗi lần đầu, bộ kiểm thử, tất cả có ghi vết.
  - Từng ca: ảnh đã gửi, kết quả, các lần thử kèm lỗi máy chấm thấy, đánh giá của khách, tham số và kết quả đọc ảnh (scout).
  - Prompt không hiện, chỉ có mã hash để phân biệt phiên bản.
- **Chạy lại N lần (1–5):** bảng `generation_replays`.
  - Không hiện trong lịch sử khách, không trừ credit, nhưng tốn tiền API thật.
  - "Giữ nguyên prompt" đo độ ngẫu nhiên. "Prompt hiện tại" dựng lại prompt bằng code đang deploy, để thử bản sửa (chỉ cho `/api/generate`, không cho các batch).
  - Công cụ có tự kiểm tra thì máy tự chấm; admin chấm đè được bằng ✓/✗. Tỉ lệ đạt tính theo từng mã hash prompt.
- **Bộ kiểm thử:** `regression_cases`. Thêm ca từ trang chi tiết; "Chạy lại cả bộ" chạy mọi ca với prompt hiện tại (tối đa 30 lượt mỗi lần).
- **Cần hỏi bên web/bảo mật:** thời gian giữ ảnh khách và các lần thử, và điều khoản về việc lưu ảnh.

## 5. Lệnh hằng ngày

```bash
npm install
npx wrangler d1 migrations apply roomcraft --local   # lần đầu
npx vite build && npx wrangler dev                   # http://localhost:8787 (cần .dev.vars có RUNNINGHUB_API_KEY)
npx tsc --noEmit                                     # typecheck
node --experimental-strip-types scripts/check-prompts.mts   # kiểm tra STYLES và buildPrompt
node --experimental-strip-types scripts/rh-smoke.mts --out <dir> [--only tool1,tool2]   # 1 ảnh thật mỗi tool (tốn tiền)
```

Phong cách và prompt phong cách nằm trong `seed/styles.json`. File này nhập từ Excel bằng `scripts/import-prompts.py`.

**Deploy** (chỉ khi được yêu cầu):
- Tài khoản Cloudflare: "Qquankun@gmail.com's Account". Máy này đăng nhập wrangler thấy nhiều tài khoản, nên **luôn truyền account id**.

```bash
CLOUDFLARE_ACCOUNT_ID=6a959e87aaf889d75de1f587de9f89cb npx wrangler d1 migrations list roomcraft --remote   # chỉ file mới là pending
rm -rf dist && npx vite build                                                                                 # build sạch, không lẫn file test
CLOUDFLARE_ACCOUNT_ID=6a959e87aaf889d75de1f587de9f89cb npx wrangler deploy
```

- Sau khi deploy, kiểm tra `/api/styles`, `/app` và chạy thử 1 ảnh rẻ.
- Gọi API bằng script thì phải đặt **User-Agent kiểu trình duyệt**, nếu không Cloudflare trả 403.
- Lệnh `migrations list` đôi khi lỗi 7403 lần đầu; chạy lại là được.

**PR:** chủ repo không review. PR tính năng của mình thì tự merge khi check xanh (repo hiện không có CI). Còn lại thì hỏi trước.

## 6. Quy tắc bắt buộc

1. **Prompt là bí mật, chỉ ở server.**
   - Không trang nào hay API nào được trả nội dung prompt. Trang "Thư viện prompt" đã bị xoá theo yêu cầu (PR #61).
   - **Không import `src/worker/prompts.ts` từ `src/web`.** Mọi thứ import vào web đều nằm trong file JS công khai.
   - Trước khi deploy thay đổi phía web, dò `dist/` xem có câu prompt nào lọt vào không: so từng chuỗi dài 70 ký tự trở lên của `prompts.ts` với `dist/**/*.js|html|json`.
   - Lưu ý: các bản deploy trước PR #61 đã từng chứa prompt.
2. **Chỉ deploy khi được yêu cầu rõ ràng.** Merge không đồng nghĩa với deploy.
3. **Không ghi tên người báo lỗi** trong PR, trang test hay báo cáo; mô tả vấn đề trung tính. Khi cần nhắc đến thì gọi là "anh Hà".
4. **Không in API key**, kể cả trong log hay script.
5. Thông báo lỗi luôn **song ngữ**: `"English · Tiếng Việt"`.
6. Viết code cùng phong cách với code xung quanh: style inline trong component, comment ngắn giải thích lý do.

## 7. Các bẫy đã gặp

- **Model chỉnh ảnh trả đúng tỉ lệ được yêu cầu.** Ảnh vào phải cắt sẵn đúng tỉ lệ đó, nếu không kết quả bị đóng khung lại. Mặt bằng phối cảnh luôn dùng 16:9, kể cả khi tự kiểm tra vẽ lại.
- **Model giữ bố cục ảnh vào.** Muốn đổi góc nhìn phải biến đổi ảnh trước (mục 4.1).
- **Bộ lọc nội dung của RunningHub** đôi khi chặn nhầm ("Content security audit did not pass"). Chạy lại hoặc viết lại prompt.
- **GPT Image 2 bản official** tính $0.198 mỗi ảnh, dù bảng giá ghi $0.027. Đừng dùng.
- **Gemini sửa ảnh GPT** chỉ chỉnh được ánh sáng và màu, không sửa được kết cấu. Đừng dựa vào nó để sửa sai bố cục.
- **Khung trình duyệt của agent bị ẩn:** screenshot cũ hoặc đen, CSS transition và smooth scroll không chạy. Hãy kiểm tra bằng DOM hoặc API, tắt transition khi đo, cuộn kiểu `instant`.
- **`npx vite build` trong lúc `wrangler dev` đang chạy** sẽ tạm thời trả 404 (vì `dist/` bị xoá). Tải lại trang là được.
- **React TDZ:** JSX gán vào biến (`const x = (<>…</>)`) chạy ngay lúc khai báo. Hàm nó dùng phải khai báo phía trên, nếu không trang trắng (gặp ở PR #63).
- **Heredoc trong Bash tool** hay hỏng khi có dấu nháy hoặc backtick. Viết script ra file rồi chạy.

## 8. Chi phí

- Ngày test lớn 24/10: $12.46 cho 284 task.
- Mỗi ảnh Mặt bằng 3D hiện tốn khoảng $0.077 ($0.05 GPT + $0.027 flash) cộng $0.002 đọc bản vẽ.
- Task lỗi không bị tính tiền.
- Chi phí thật ghi vào D1 `api_costs` (xem tại `/admin`).
- Công ty muốn dùng tài khoản công ty; không tự nạp tiền cá nhân.

## 9. Việc còn dở và R&D

- **Cần xác nhận:** người yêu cầu đã thấy camera mới của Mặt bằng 3D (PR #58, đã deploy 27/10) chưa. Nếu ý họ là ảnh từng phòng của bản doanh nghiệp thì phần đó chưa đổi camera.
- **R&D 1: thư viện vật liệu, tìm vật liệu tương đương từ ảnh mẫu.**
  - Hướng đề xuất:
    1. LLM gắn thuộc tính cho từng vật liệu (loại, màu, vân, kích thước, độ bóng).
    2. Lọc ra khoảng 10 vật liệu gần nhất.
    3. LLM so trực tiếp ảnh mẫu với 10 vật liệu đó rồi xếp hạng.
  - Chi phí dưới $0.01 mỗi lần tìm.
  - **Nghẽn ở dữ liệu:** cần danh mục từ nhà cung cấp (ảnh chuẩn, mã sản phẩm, giá).
- **R&D 2: bóc khối lượng từ bản vẽ** (tường, sàn, trần, mặt bàn, mặt tủ).
  - Mở rộng bước đọc bản vẽ đã có.
  - Sai số dự kiến 10–20% khi đọc từ ảnh. Cần thử trên 5–7 bản vẽ có số đo thật trước khi làm.
  - Muốn chính xác thì đầu vào nên là file vector, hoặc cho người dùng sửa số.
- **Bản 2 điểm tụ** cho Mặt bằng 3D: GPT chưa theo khung ổn định.
- **Ảnh 360 từ ảnh phẳng** (đã thử 30/10, tạm dừng):
  - Tạo ảnh 21:9 bằng Nano Banana Pro. Ảnh 21:9 phủ 360° ngang và khoảng ±77° dọc, độn 2 chỏm trên dưới thành 2:1.
  - Khoảng 1/3 ảnh có đường nối lệch; sửa bằng flash ở dải nối.
  - Phần phía sau camera là AI tự vẽ thêm.
  - GPT Image 2.5 trên RunningHub không nhận tỉ lệ 2:1 (tối đa 21:9, trường `size` bị bỏ qua). Không dùng GPT Image 2.

## 10. Lịch sử PR gần đây

| PR | Ngày | Nội dung |
|---|---|---|
| #36 | 24/10 | Lịch sử dùng chung cho mọi công cụ |
| #37–40 | 24/10 | Lưu vào Ảnh trên điện thoại |
| #41–43 | 25/10 | Mặt bằng: đọc bản vẽ trước, GPT 2.5, tự kiểm tra; trang test |
| #44–45 | 25–26/10 | Làm mờ lựa chọn không chọn; tab cuộn tới lưới công cụ |
| #46–47 | 26/10 | Gộp Beautiful vào Perfect Redesign; gộp Floor Editor vào Material Swap |
| #48–50 | 26/10 | Loader SOLYC |
| #51 | 26/10 | Cron xong job khi đã đóng tab |
| #52 | 26/10 | Doanh nghiệp: vẽ lại phòng chọn, đồng bộ theo ảnh mẫu |
| #53 | 26/10 | Isometric (đã thay bằng #58) |
| #54–55 | 26–27/10 | Đổi vật liệu nhiều bề mặt; đổi vật liệu ngay trong lần chạy doanh nghiệp |
| #56–60 | 27/10 | Mở nhanh (Ctrl+K), khung "Tất cả công cụ" |
| #58 | 27/10 | Mặt bằng 3D: phối cảnh thật + Gemini đánh bóng |
| #61 | 28/10 | Bỏ Thư viện prompt; prompt không còn trong file JS |
| #62–64 | 30/10 | 3 nhóm; 5 mức độ bóng; lớp nổi đổi vật liệu |
| #67–68 | 31/10 | Nội dung phần 3 lựa chọn; lịch sử trang chủ 1 hàng cuộn ngang |
| #69 | 31/10 | Đá tấm VASTA cho mặt bàn và mặt đảo bếp |
| #70–71 | 31/10 | VASTA dùng thang độ bóng chung; nhãn VASTA ESSENTIALS |
| #72–74 | 31/10 | Thiết bị vệ sinh Viglacera: bồn cầu (BTE là bồn trẻ em), chậu rửa, vòi chậu |
| #75 | 31/10 | Ghi vết mỗi lần tạo, 👍/👎 của khách, trang điều tra và chạy lại N lần |
