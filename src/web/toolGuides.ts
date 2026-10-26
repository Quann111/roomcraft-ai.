// In-tool guides for customers: what the tool does, how to use it, tips and a real before/after example.
// Keyed by the tool card name on /app. Example strips live in public/examples (made from real generations).

export type L2 = [en: string, vi: string];
export type Guide = { what: L2; steps: L2[]; tips: L2[]; credits: L2; example?: string };

const REDESIGN_STEPS: L2[] = [
  ["Upload a photo of your room, house front or garden.", "Tải ảnh căn phòng, mặt tiền nhà hoặc sân vườn lên."],
  ["Pick the room type and a design style.", "Chọn loại phòng và phong cách thiết kế."],
  ["Choose how much should change, then press Generate.", "Chọn mức độ thay đổi rồi bấm Tạo thiết kế."],
];
const PHOTO_TIP: L2 = ["Use a bright, straight-on photo that shows most of the space.", "Dùng ảnh đủ sáng, chụp thẳng, thấy được phần lớn không gian."];
const ONE_CREDIT: L2 = ["1 credit per image (2K: 2, 4K: 3)", "1 credit mỗi ảnh (2K: 2, 4K: 3)"];

export const GUIDES: Record<string, Guide> = {
  "Magic Redesign": {
    what: ["Give your space a new look while walls, windows and the camera angle stay put.", "Làm mới diện mạo không gian, giữ nguyên tường, cửa sổ và góc chụp."],
    steps: REDESIGN_STEPS, tips: [PHOTO_TIP, ["Use Additional Instructions to ask for specific things, e.g. “keep the sofa, add a reading corner”.", "Dùng mục Yêu cầu thêm để nêu ý muốn, VD: “giữ sofa, thêm góc đọc sách”."]],
    credits: ONE_CREDIT, example: "redesign",
  },
  "Perfect Redesign": {
    what: ["A full redesign of your room in the style you choose, with new furniture, colors and decor, keeping its structure.", "Thiết kế lại toàn bộ căn phòng theo phong cách bạn chọn, với nội thất, màu sắc và đồ trang trí mới, giữ nguyên kết cấu."],
    steps: REDESIGN_STEPS, tips: [PHOTO_TIP, ["Try 2–3 styles on the same photo to compare.", "Thử 2–3 phong cách trên cùng một ảnh để so sánh."]], credits: ONE_CREDIT, example: "redesign",
  },
  "Creative Redesign": {
    what: ["A bolder redesign: the AI may rearrange furniture for a fresh layout.", "Thiết kế lại táo bạo hơn: AI có thể sắp xếp lại nội thất để có bố cục mới."],
    steps: REDESIGN_STEPS, tips: [["Set the change level to High or Extreme for the most creative results.", "Chọn mức thay đổi Cao hoặc Tối đa để có kết quả sáng tạo nhất."]], credits: ONE_CREDIT, example: "redesign",
  },
  "Virtual Staging": {
    what: ["Furnish an empty room so buyers and renters can picture living there.", "Bày nội thất vào phòng trống để người mua, người thuê hình dung được."],
    steps: [["Upload a photo of the empty room.", "Tải ảnh phòng trống lên."], ["Pick the room type and a furnishing style.", "Chọn loại phòng và phong cách bài trí."], ["Press Generate.", "Bấm Tạo thiết kế."]],
    tips: [["Works best on truly empty rooms; use Furniture Removal first if needed.", "Tốt nhất với phòng trống hẳn; nếu còn đồ, dùng Furniture Removal trước."]], credits: ONE_CREDIT, example: "staging",
  },
  "Fill Spaces": {
    what: ["Furnish and decorate an empty room in the style and room type you choose.", "Bày nội thất và trang trí cho phòng trống theo phong cách và loại phòng bạn chọn."],
    steps: [["Upload a photo of the empty room.", "Tải ảnh phòng trống lên."], ["Pick the room type and a style.", "Chọn loại phòng và phong cách."], ["Press Generate.", "Bấm Tạo thiết kế."]],
    tips: [["Pick the correct room type so the AI chooses the right furniture.", "Chọn đúng loại phòng để AI chọn đúng đồ nội thất."]], credits: ONE_CREDIT, example: "staging",
  },
  "Decor Staging": {
    what: ["Stage furniture and decor in your space to make photos more appealing.", "Bài trí nội thất và đồ trang trí để ảnh không gian hấp dẫn hơn."],
    steps: [["Upload a photo of the room.", "Tải ảnh căn phòng lên."], ["Pick the room type and a style.", "Chọn loại phòng và phong cách."], ["Press Generate.", "Bấm Tạo thiết kế."]],
    tips: [PHOTO_TIP], credits: ONE_CREDIT, example: "staging",
  },
  "Sketch to Render": {
    what: ["Turn a hand sketch or line drawing into a realistic photo.", "Biến bản phác thảo tay hoặc bản vẽ nét thành ảnh chân thực."],
    steps: [["Choose interior or exterior, then upload your sketch.", "Chọn nội thất hoặc ngoại thất rồi tải bản phác thảo lên."], ["Pick a style (and room type for interiors).", "Chọn phong cách (và loại phòng nếu là nội thất)."], ["Press Generate.", "Bấm Tạo thiết kế."]],
    tips: [["Clear lines with a visible perspective give the most faithful renders.", "Nét vẽ rõ, có phối cảnh sẽ cho ảnh bám sát bản vẽ nhất."]], credits: ONE_CREDIT, example: "sketch",
  },
  "Colors & Textures": {
    what: ["Swap the material of one surface: floor, walls, countertops, cabinets or ceiling.", "Đổi vật liệu của một bề mặt: sàn, tường, mặt bếp, tủ hoặc trần."],
    steps: [["Upload a photo of the room.", "Tải ảnh căn phòng lên."], ["Pick the surface, then the material.", "Chọn bề mặt rồi chọn vật liệu."], ["Press Generate; everything else stays the same.", "Bấm Tạo thiết kế; mọi thứ khác giữ nguyên."]],
    tips: [["Generate several materials on the same photo to compare them side by side.", "Tạo nhiều vật liệu trên cùng một ảnh để so sánh cạnh nhau."]], credits: ONE_CREDIT, example: "material",
  },
  "Material Swap": {
    what: ["Try a new floor (including VICOSTONE tiles), wall finish, countertop, cabinet or ceiling material on your own photo.", "Thử vật liệu sàn (kể cả gạch VICOSTONE), tường, mặt bếp, tủ hoặc trần mới ngay trên ảnh của bạn."],
    steps: [["Upload a photo of the room.", "Tải ảnh căn phòng lên."], ["Pick a surface, then click a material swatch or a VICOSTONE tile; pick for several surfaces to change them all in one image.", "Chọn bề mặt rồi bấm ô vật liệu hoặc mẫu gạch VICOSTONE; chọn cho nhiều bề mặt để đổi tất cả trong một ảnh."], ["Press Generate; furniture and rugs stay.", "Bấm Tạo thiết kế; nội thất và thảm giữ nguyên."]],
    tips: [["Make sure the surface you want to change is clearly visible.", "Đảm bảo bề mặt cần đổi hiện rõ trong ảnh."], ["VICOSTONE tiles are laid as 120 × 120 cm polished slabs from the real swatch.", "Gạch VICOSTONE được lát khổ 120 × 120 cm, bóng kiếng, theo đúng ảnh mẫu gạch."], ["For floor photos with rugs or people, tick “Auto-check the result” so a lost rug or person is redone once at no extra credit.", "Ảnh sàn có thảm hoặc người thì bật “Tự kiểm tra kết quả” để AI tự tạo lại 1 lần nếu lỡ mất thảm hoặc người, không tốn thêm credit."]], credits: ONE_CREDIT, example: "material",
  },
  "Paint Visualizer": {
    what: ["Preview a new wall color before buying paint, inside or outside.", "Xem trước màu tường mới trước khi mua sơn, cả trong nhà lẫn ngoài nhà."],
    steps: [["Choose interior or exterior, then upload a photo.", "Chọn nội thất hoặc ngoại thất rồi tải ảnh lên."], ["Pick a preset color or enter your own color code, and a finish.", "Chọn màu có sẵn hoặc nhập mã màu riêng, và độ bóng."], ["Press Generate.", "Bấm Tạo thiết kế."]],
    tips: [["Daylight photos show the truest color.", "Ảnh chụp ban ngày cho màu sơn chính xác nhất."]], credits: ONE_CREDIT, example: "paint",
  },
  "Furniture Removal": {
    what: ["Remove furniture, clutter or people, or empty the whole room.", "Xoá đồ đạc, đồ lộn xộn, người trong ảnh, hoặc dọn trống cả phòng."],
    steps: [["Upload a photo of the room.", "Tải ảnh căn phòng lên."], ["Tick what to remove (or “everything” for an empty room).", "Chọn thứ cần xoá (hoặc “tất cả” để có phòng trống)."], ["Press Generate.", "Bấm Tạo thiết kế."]],
    tips: [["Follow up with Virtual Staging to furnish the emptied room in a new style.", "Sau đó dùng Virtual Staging để bày nội thất mới cho phòng đã dọn."]], credits: ONE_CREDIT, example: "declutter",
  },
  "Sky Colors": {
    what: ["Change the sky and weather in an exterior photo: golden hour, blue sky, snow…", "Đổi bầu trời và thời tiết của ảnh ngoại thất: giờ vàng, trời xanh, tuyết…"],
    steps: [["Upload a photo of the house exterior.", "Tải ảnh mặt ngoài ngôi nhà lên."], ["Pick a sky.", "Chọn kiểu bầu trời."], ["Press Generate; light and shadows adapt.", "Bấm Tạo thiết kế; ánh sáng và bóng đổ tự điều chỉnh."]],
    tips: [["Photos with plenty of visible sky give the strongest effect.", "Ảnh thấy nhiều bầu trời cho hiệu ứng rõ nhất."]], credits: ONE_CREDIT, example: "sky",
  },
  "Furniture Finder": {
    what: ["Find the furniture and decor in a photo and where to buy something similar.", "Nhận diện đồ nội thất trong ảnh và tìm nơi mua món tương tự."],
    steps: [["Upload a room photo or one of your generated designs.", "Tải ảnh phòng hoặc ảnh thiết kế bạn đã tạo lên."], ["Press Generate.", "Bấm Tạo thiết kế."], ["Each item gets a number on the photo and shopping links.", "Mỗi món có số trên ảnh và link mua sắm."]],
    tips: [["Prices are AI estimates; check the store for the real price.", "Giá là ước tính của AI; hãy xem giá thật ở cửa hàng."]], credits: ["1 credit per search", "1 credit mỗi lần tìm"],
  },
  "Room Composer": {
    what: ["Place your own furniture photos into your room, at the right scale and perspective.", "Đặt ảnh đồ nội thất của bạn vào căn phòng, đúng tỉ lệ và phối cảnh."],
    steps: [["Upload a photo of your room.", "Tải ảnh căn phòng lên."], ["Add 1–3 photos of furniture or decor you want to place.", "Thêm 1–3 ảnh đồ nội thất hoặc đồ trang trí muốn đặt vào."], ["Optionally say where each piece goes in Additional Instructions, then Generate.", "Có thể ghi vị trí từng món trong Yêu cầu thêm, rồi bấm Tạo thiết kế."]],
    tips: [["Product photos on a plain background work best.", "Ảnh sản phẩm trên nền trơn cho kết quả tốt nhất."]], credits: ONE_CREDIT, example: "compose",
  },
  "Design Transfer": {
    what: ["Apply the style of an inspiration photo to your own room.", "Áp phong cách của một ảnh mẫu bạn thích vào căn phòng của bạn."],
    steps: [["Upload a photo of your room.", "Tải ảnh căn phòng lên."], ["Upload an inspiration photo.", "Tải ảnh mẫu bạn thích lên."], ["Pick how much should change and press Generate.", "Chọn mức độ thay đổi rồi bấm Tạo thiết kế."]],
    tips: [["Pick an inspiration photo with a clear color palette and furniture style.", "Chọn ảnh mẫu có bảng màu và phong cách nội thất rõ ràng."]], credits: ONE_CREDIT, example: "transfer",
  },
  "Text to Design": {
    what: ["Describe a space in words and get a photorealistic design, no photo needed.", "Mô tả không gian bằng lời và nhận ảnh thiết kế chân thực, không cần ảnh gốc."],
    steps: [["Choose interior, exterior or garden.", "Chọn nội thất, ngoại thất hoặc sân vườn."], ["Describe the space: room, colors, materials, furniture, mood.", "Mô tả không gian: loại phòng, màu sắc, vật liệu, nội thất, cảm giác."], ["Optionally pick a style, then Generate.", "Có thể chọn thêm phong cách, rồi bấm Tạo thiết kế."]],
    tips: [["The more specific the description, the closer the result.", "Mô tả càng cụ thể, kết quả càng sát ý."]], credits: ONE_CREDIT, example: "text",
  },
  "Day & Night Lighting": {
    what: ["See your room in morning sun, golden hour, at dusk or at night with the lights on.", "Xem căn phòng lúc nắng sáng, giờ vàng, chạng vạng hoặc ban đêm khi bật đèn."],
    steps: [["Upload a photo of the room.", "Tải ảnh căn phòng lên."], ["Pick a time of day.", "Chọn thời điểm trong ngày."], ["Press Generate; only the light changes.", "Bấm Tạo thiết kế; chỉ ánh sáng thay đổi."]],
    tips: [["Rooms with windows and visible lamps show the biggest difference.", "Phòng có cửa sổ và đèn nhìn thấy được sẽ khác biệt rõ nhất."]], credits: ONE_CREDIT, example: "lighting",
  },
  "Sun & Wind Analysis": {
    what: ["Tell us which way your home faces: the AI reads the sun and wind on every side and suggests climate-smart changes.", "Cho biết nhà bạn quay hướng nào: AI đánh giá nắng gió trên từng mặt và đề xuất giải pháp thiết kế phù hợp khí hậu."],
    steps: [["Upload a floor plan or a photo of the facade.", "Tải mặt bằng hoặc ảnh mặt tiền lên."], ["Pick the direction (top of the plan or the facade) and your city.", "Chọn hướng (phía trên bản vẽ hoặc mặt tiền) và thành phố."], ["Generate, then optionally render the recommendations.", "Bấm Tạo thiết kế, rồi có thể render phương án minh hoạ."]],
    tips: [["Not sure of the direction? Open a map app at your home and check which way the front door faces.", "Chưa rõ hướng? Mở ứng dụng bản đồ tại nhà và xem cửa chính quay về hướng nào."], ["This is an early design guide, not an engineering simulation.", "Đây là đánh giá sơ bộ để định hướng thiết kế, không thay cho tính toán kỹ thuật."]],
    credits: ["1 credit for the analysis, 1 more for the illustration", "1 credit cho phân tích, thêm 1 credit cho ảnh minh hoạ"], example: "orient",
  },
  "Business 3D Floorplan": {
    what: ["Upload one floor plan: the AI finds every room and renders each one in a consistent style.", "Tải một mặt bằng: AI tìm ra từng phòng và render mỗi phòng theo cùng một phong cách."],
    steps: [["Upload the 2D plan and pick a style for the whole home.", "Tải mặt bằng 2D và chọn phong cách cho cả căn."], ["Press “Detect rooms” (free), then untick or rename rooms.", "Bấm “Đọc các phòng” (miễn phí), rồi bỏ chọn hoặc đổi tên phòng."], ["Render: each room appears as it finishes.", "Bấm Render: ảnh từng phòng hiện ra khi xong."]],
    tips: [["Plans with room labels give the best room list.", "Mặt bằng có ghi tên phòng cho danh sách phòng chính xác nhất."]], credits: ["1 credit per room", "1 credit mỗi phòng"], example: "bizplan",
  },
  "3D Floorplan": {
    what: ["Turn a 2D floor plan into a furnished 3D view of the whole home.", "Biến mặt bằng 2D thành ảnh 3D có nội thất của cả căn nhà."],
    steps: [["Upload the floor plan.", "Tải mặt bằng lên."], ["Pick a style; the 45° perspective view is used.", "Chọn phong cách; ảnh dùng góc phối cảnh 45°."], ["Press Generate.", "Bấm Tạo thiết kế."]],
    tips: [["The top-down view is coming soon.", "Góc nhìn từ trên xuống sắp ra mắt."], ["Plans with clear walls and room labels give the most faithful layout.", "Mặt bằng có nét tường rõ và tên phòng cho bố cục sát nhất."]], credits: ONE_CREDIT, example: "floorplan",
  },
  "Video Generation": {
    what: ["Turn a room or house photo into an 8-second cinematic clip with ambient sound.", "Biến ảnh phòng hoặc ngôi nhà thành clip điện ảnh 8 giây có âm thanh nền."],
    steps: [["Upload a photo (a generated design works great).", "Tải ảnh lên (ảnh thiết kế đã tạo cũng rất hợp)."], ["Pick the camera movement.", "Chọn chuyển động camera."], ["Press Generate and wait 1–3 minutes.", "Bấm Tạo thiết kế và chờ 1–3 phút."]],
    tips: [["Wide photos with depth give the smoothest camera moves.", "Ảnh góc rộng, có chiều sâu cho chuyển động camera mượt nhất."]], credits: ["5 credits per clip", "5 credit mỗi clip"], example: "video",
  },
  "Design Critique": {
    what: ["Get an honest review of your room from an AI designer: a score, strengths and what to improve.", "Nhận đánh giá thẳng thắn từ nhà thiết kế AI: điểm số, điểm mạnh và những gì nên cải thiện."],
    steps: [["Upload a photo of the room.", "Tải ảnh căn phòng lên."], ["Optionally add your goals or budget in Additional Instructions.", "Có thể ghi mục tiêu hoặc ngân sách trong Yêu cầu thêm."], ["Press Generate and read the review.", "Bấm Tạo thiết kế và đọc nhận xét."]],
    tips: [["Try the suggestions right away with Redesign or Material Swap.", "Thử ngay các gợi ý bằng Redesign hoặc Material Swap."]], credits: ["1 credit per review", "1 credit mỗi lần nhận xét"],
  },
  "Design Advisor": {
    what: ["Chat with an AI interior designer about layout, colors, materials and budget.", "Trò chuyện với nhà thiết kế AI về bố cục, màu sắc, vật liệu và ngân sách."],
    steps: [["Optionally add a room photo, the room type and your budget.", "Có thể thêm ảnh phòng, loại phòng và ngân sách."], ["Ask your question or tap a suggestion.", "Đặt câu hỏi hoặc bấm vào một gợi ý."], ["Keep asking follow-ups in the same conversation.", "Tiếp tục hỏi thêm trong cùng cuộc trò chuyện."]],
    tips: [["Mention how you use the room and what you want to keep.", "Hãy nói bạn dùng phòng thế nào và muốn giữ lại gì."]], credits: ["1 credit per conversation (up to 20 questions)", "1 credit mỗi cuộc trò chuyện (tối đa 20 câu hỏi)"],
  },
};
