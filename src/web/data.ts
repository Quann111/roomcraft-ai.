import type { ToolId } from "./GeneratePanel";

export type L2 = [en: string, vi: string];
export type Feature = { slug: string; name: L2; desc: L2; group: "redesign" | "edit" | "staging" | "advice"; tool?: ToolId; icon: string };

export const FEATURES: Feature[] = [
  { slug: "full-redesign", name: ["Full Redesign", "Thiết kế lại toàn phần"], desc: ["Keep the layout, change the whole look in one click.", "Giữ nguyên bố cục, đổi toàn bộ diện mạo chỉ với một cú nhấp."], group: "redesign", tool: "interior-redesign", icon: "✨" },
  { slug: "sketch-to-render", name: ["Sketch to Render", "Phác thảo → ảnh thật"], desc: ["Turn a hand sketch or drawing into a realistic render.", "Biến bản vẽ tay thành ảnh render chân thực."], group: "redesign", tool: "interior-sketch", icon: "✏️" },
  { slug: "exterior-redesign", name: ["Exterior Redesign", "Thiết kế lại ngoại thất"], desc: ["Re-imagine facades, roofs and materials.", "Hình dung lại mặt tiền, mái và vật liệu."], group: "redesign", tool: "exterior-redesign", icon: "🏠" },
  { slug: "garden-redesign", name: ["Garden Redesign", "Thiết kế lại sân vườn"], desc: ["From patios to full gardens in 12 styles.", "Từ sân hiên đến vườn hoàn chỉnh với 12 phong cách."], group: "redesign", tool: "garden-redesign", icon: "🌿" },
  { slug: "material-swap", name: ["Material Swap", "Đổi vật liệu"], desc: ["Change floor, walls, cabinets, countertops or ceiling.", "Đổi sàn, tường, tủ, mặt bàn hoặc trần."], group: "edit", tool: "interior-material", icon: "🧱" },
  { slug: "sky-colors", name: ["Sky & Weather Swap", "Đổi bầu trời & thời tiết"], desc: ["Golden hour, twilight, snow — pick the perfect sky.", "Giờ vàng, chạng vạng, tuyết — chọn bầu trời hoàn hảo."], group: "edit", tool: "exterior-sky", icon: "🌅" },
  { slug: "precision-plus", name: ["Precision+", "Chỉnh sửa chính xác"], desc: ["Select a region and replace or remove one object.", "Chọn vùng và thay hoặc xoá một vật thể."], group: "edit", icon: "🎯" },
  { slug: "paint-visualizer", name: ["Paint Visualizer", "Thử màu sơn"], desc: ["Preview wall colors before you buy paint.", "Xem trước màu tường trước khi mua sơn."], group: "edit", icon: "🎨" },
  { slug: "virtual-staging-ai", name: ["Virtual Staging", "Bài trí ảo"], desc: ["Furnish empty rooms for listings and previews.", "Bày nội thất cho phòng trống để đăng tin và xem trước."], group: "staging", tool: "interior-staging", icon: "🛋️" },
  { slug: "ai-furniture-removal", name: ["Declutter", "Dọn đồ"], desc: ["Remove furniture, clutter or people from photos.", "Xoá đồ đạc, đồ lộn xộn hoặc người khỏi ảnh."], group: "staging", tool: "interior-declutter", icon: "🧹" },
  { slug: "furniture-finder", name: ["Furniture Finder", "Tìm nội thất"], desc: ["Detect furniture in the image and find where to buy.", "Nhận diện nội thất trong ảnh và tìm nơi mua."], group: "staging", icon: "🔎" },
  { slug: "room-composer", name: ["Room Composer", "Sắp xếp phòng"], desc: ["Arrange your own furniture inside the room.", "Sắp xếp đồ của bạn vào phòng."], group: "staging", tool: "interior-compose", icon: "🧩" },
  { slug: "text-to-design", name: ["Text to Design", "Văn bản → thiết kế"], desc: ["Describe the space and get design ideas.", "Mô tả không gian để nhận ý tưởng thiết kế."], group: "advice", icon: "💬" },
  { slug: "design-critique", name: ["Design Critique", "Nhận xét thiết kế"], desc: ["Get feedback and improvement tips.", "Nhận phản hồi và gợi ý cải thiện."], group: "advice", tool: "interior-critique", icon: "📝" },
  { slug: "ai-floor-plan-generator", name: ["2D to 3D Floor Plan", "Mặt bằng 2D → 3D"], desc: ["Turn a floor plan into a furnished 3D view.", "Biến mặt bằng thành mô hình 3D có nội thất."], group: "advice", tool: "interior-floorplan", icon: "📐" },
  { slug: "video-walkthrough", name: ["Video Walkthrough", "Video tham quan"], desc: ["Animate a design into a short walkthrough clip.", "Biến thiết kế thành clip tham quan ngắn."], group: "advice", icon: "🎬" },
];

export const GROUPS: Record<Feature["group"], L2> = {
  redesign: ["Redesign", "Thiết kế lại"], edit: ["Edit & materials", "Chỉnh sửa & vật liệu"], staging: ["Staging & furniture", "Bài trí & nội thất"], advice: ["Advice & new", "Tư vấn & mới"],
};

export type UseCase = { slug: string; name: L2; intro: L2; tool: ToolId; preset?: { roomType?: string }; bullets: L2[]; free?: boolean };
const std: L2[] = [
  ["Upload one photo, no 3D modeling needed", "Chỉ cần một ảnh, không cần dựng 3D"],
  ["Structure, windows and layout stay the same", "Giữ nguyên cấu trúc, cửa sổ và bố cục"],
  ["Compare before/after with a slider", "So sánh trước/sau bằng thanh trượt"],
];
export const USE_CASES: UseCase[] = [
  { slug: "interior-design-ai", name: ["AI Interior Design", "Thiết kế nội thất bằng AI"], intro: ["Redesign any interior in seconds and explore dozens of styles.", "Thiết kế lại mọi không gian nội thất trong vài giây, thử hàng chục phong cách."], tool: "interior-redesign", bullets: std },
  { slug: "room-design-ai", name: ["AI Room Design", "Thiết kế phòng bằng AI"], intro: ["Try a new look for any room before spending money.", "Thử diện mạo mới cho mọi căn phòng trước khi chi tiền."], tool: "interior-redesign", bullets: std },
  { slug: "living-room-design-ai", name: ["Living Room Design AI", "Thiết kế phòng khách"], intro: ["Find the layout and style that make your living room shine.", "Tìm bố cục và phong cách làm phòng khách nổi bật."], tool: "interior-redesign", preset: { roomType: "Living room" }, bullets: std },
  { slug: "kitchen-design-ai", name: ["Kitchen Design AI", "Thiết kế nhà bếp"], intro: ["Preview cabinets, countertops and finishes in your own kitchen.", "Xem trước tủ, mặt bàn và hoàn thiện ngay trong bếp nhà bạn."], tool: "interior-redesign", preset: { roomType: "Kitchen" }, bullets: std },
  { slug: "bathroom-design-ai", name: ["Bathroom Design AI", "Thiết kế phòng tắm"], intro: ["Test tiles, fixtures and colors before the renovation.", "Thử gạch, thiết bị và màu sắc trước khi cải tạo."], tool: "interior-redesign", preset: { roomType: "Bathroom" }, bullets: std },
  { slug: "exterior-ai", name: ["Exterior Design AI", "Thiết kế ngoại thất"], intro: ["Re-imagine your facade with new materials and styles.", "Hình dung lại mặt tiền với vật liệu và phong cách mới."], tool: "exterior-redesign", bullets: std },
  { slug: "landscaping-ai", name: ["Landscaping AI", "Thiết kế cảnh quan"], intro: ["Plan gardens, patios and outdoor living areas.", "Lên ý tưởng sân vườn, hiên và khu sinh hoạt ngoài trời."], tool: "garden-redesign", bullets: std },
  { slug: "wall-ai", name: ["Wall & Paint AI", "Tường & màu sơn"], intro: ["See new wall finishes and colors instantly.", "Xem ngay lớp hoàn thiện và màu tường mới."], tool: "interior-material", bullets: std },
  { slug: "flooring-ai", name: ["Flooring AI", "Thiết kế sàn"], intro: ["Compare hardwood, tile, terrazzo and more on your own floor.", "So sánh gỗ, gạch, terrazzo… ngay trên sàn nhà bạn."], tool: "interior-material", bullets: std },
  { slug: "countertop-ai", name: ["Countertop AI", "Mặt bàn bếp"], intro: ["Marble, quartz or butcher block? See before you choose.", "Đá cẩm thạch, thạch anh hay gỗ? Xem trước khi chọn."], tool: "interior-material", bullets: std },
  { slug: "real-estate-ai", name: ["AI for Real Estate", "AI cho bất động sản"], intro: ["Make listings stand out with staged, decluttered photos.", "Làm tin đăng nổi bật với ảnh đã bài trí, dọn gọn."], tool: "interior-staging", bullets: std },
  { slug: "furniture-replacement-ai", name: ["Furniture Replacement", "Thay nội thất"], intro: ["Clear the old furniture and try something new.", "Dọn đồ cũ và thử nội thất mới."], tool: "interior-declutter", bullets: std },
  { slug: "ai-interior-design-free", name: ["Free AI Interior Design", "Thiết kế nội thất AI miễn phí"], intro: ["Create an account and get free daily credits.", "Tạo tài khoản và nhận credit miễn phí mỗi ngày."], tool: "interior-redesign", bullets: std, free: true },
  { slug: "ai-home-exterior-design-free", name: ["Free Exterior Design", "Thiết kế ngoại thất miễn phí"], intro: ["Try new facades with free daily credits.", "Thử mặt tiền mới với credit miễn phí mỗi ngày."], tool: "exterior-redesign", bullets: std, free: true },
  { slug: "ai-landscape-design-free", name: ["Free Landscape Design", "Thiết kế cảnh quan miễn phí"], intro: ["Plan your garden with free daily credits.", "Lên ý tưởng sân vườn với credit miễn phí mỗi ngày."], tool: "garden-redesign", bullets: std, free: true },
  { slug: "ai-virtual-stage-free", name: ["Free Virtual Staging", "Bài trí ảo miễn phí"], intro: ["Stage an empty room with free daily credits.", "Bài trí phòng trống với credit miễn phí mỗi ngày."], tool: "interior-staging", bullets: std, free: true },
];

export type Persona = { slug: string; name: L2; headline: L2; sub: L2; tool: ToolId; points: L2[] };
export const PERSONAS: Persona[] = [
  { slug: "realtor", name: ["Realtors", "Môi giới BĐS"], headline: ["Sell faster with staged photos", "Bán nhanh hơn với ảnh bài trí sẵn"], sub: ["Stage empty rooms and declutter listings in minutes.", "Bài trí phòng trống và dọn gọn ảnh tin đăng trong vài phút."], tool: "interior-staging", points: [["Virtual staging for listing photos", "Bài trí ảo cho ảnh đăng tin"], ["Declutter occupied homes", "Dọn gọn nhà đang ở"], ["Multiple styles per listing", "Nhiều phong cách cho mỗi tin"]] },
  { slug: "designer", name: ["Interior designers", "Nhà thiết kế nội thất"], headline: ["Show clients ideas, not just words", "Cho khách xem ý tưởng thay vì chỉ mô tả"], sub: ["Mood boards and concept renders from a client photo.", "Moodboard và ảnh concept từ ảnh hiện trạng của khách."], tool: "interior-redesign", points: [["Concept renders in seconds", "Ảnh concept trong vài giây"], ["Swap materials live in meetings", "Đổi vật liệu ngay trong buổi họp"], ["90+ style directions", "Hơn 90 hướng phong cách"]] },
  { slug: "architect", name: ["Architects", "Kiến trúc sư"], headline: ["From sketch to render, fast", "Từ phác thảo đến ảnh render, nhanh chóng"], sub: ["Turn rough drawings into presentation-ready visuals.", "Biến bản vẽ nháp thành hình ảnh trình bày."], tool: "exterior-sketch", points: [["Sketch to render", "Phác thảo → ảnh thật"], ["Facade style exploration", "Thử nghiệm phong cách mặt tiền"], ["Sky & weather presets", "Bầu trời & thời tiết có sẵn"]] },
  { slug: "landscaper", name: ["Landscapers", "Nhà thiết kế cảnh quan"], headline: ["Sell the garden before you dig", "Bán ý tưởng sân vườn trước khi thi công"], sub: ["Show clients their yard in 12 garden styles.", "Cho khách xem sân vườn của họ với 12 phong cách."], tool: "garden-redesign", points: [["Garden redesign from one photo", "Thiết kế lại vườn từ một ảnh"], ["Day, dusk and seasonal looks", "Ban ngày, chạng vạng, theo mùa"], ["Faster approvals", "Khách duyệt nhanh hơn"]] },
  { slug: "renovator", name: ["Renovators", "Người cải tạo nhà"], headline: ["Decide before you renovate", "Quyết định trước khi cải tạo"], sub: ["Preview finishes and layouts for your remodel.", "Xem trước vật liệu và diện mạo cho dự án cải tạo."], tool: "interior-material", points: [["Try floors, walls, cabinets", "Thử sàn, tường, tủ"], ["Avoid costly surprises", "Tránh phát sinh tốn kém"], ["Share results with family", "Chia sẻ kết quả với gia đình"]] },
  { slug: "contractor", name: ["Contractors", "Nhà thầu"], headline: ["Win more bids with visuals", "Thắng thêm gói thầu nhờ hình ảnh"], sub: ["Give clients a picture of the finished job.", "Cho khách thấy hình ảnh công trình hoàn thiện."], tool: "interior-material", points: [["Before/after proposals", "Đề xuất trước/sau"], ["Material options side by side", "So sánh vật liệu cạnh nhau"], ["No design skills needed", "Không cần kỹ năng thiết kế"]] },
  { slug: "developer", name: ["Developers & builders", "Chủ đầu tư & nhà xây"], headline: ["Market homes before they are built", "Giới thiệu nhà trước khi xây xong"], sub: ["Visualize finished homes for off-plan sales.", "Hình dung nhà hoàn thiện để bán trước khi xây."], tool: "exterior-redesign", points: [["Facade variations", "Nhiều biến thể mặt tiền"], ["Staged interiors", "Nội thất đã bài trí"], ["Consistent marketing assets", "Hình ảnh marketing đồng nhất"]] },
];

export type Plan = { id: string; name: string; monthly: number; yearly: number; credits: number; styles: string; popular?: boolean };
export const PLANS: Plan[] = [
  { id: "standard", name: "Standard", monthly: 22, yearly: 9, credits: 100, styles: "80+" },
  { id: "pro", name: "Pro", monthly: 29, yearly: 11, credits: 1000, styles: "160+", popular: true },
  { id: "expert", name: "Expert", monthly: 37, yearly: 14, credits: 2000, styles: "200+" },
];

export const FAQ: { q: L2; a: L2 }[] = [
  { q: ["Will the AI change my room structure?", "AI có thay đổi cấu trúc phòng không?"], a: ["No. Walls, windows and layout are preserved; only furniture and style change (at the intervention level you choose).", "Không. Tường, cửa sổ và bố cục được giữ nguyên; chỉ nội thất và phong cách thay đổi (theo mức can thiệp bạn chọn)."] },
  { q: ["How do credits work?", "Credit hoạt động thế nào?"], a: ["1K images cost 1 credit, 2K cost 2, 4K cost 3. Free accounts get 3 credits that refill every 24 hours.", "Ảnh 1K tốn 1 credit, 2K tốn 2, 4K tốn 3. Tài khoản miễn phí có 3 credit, nạp lại sau mỗi 24 giờ."] },
  { q: ["What happens if a generation fails?", "Nếu tạo ảnh thất bại thì sao?"], a: ["Credits are refunded automatically.", "Credit được hoàn lại tự động."] },
  { q: ["Which photos work best?", "Ảnh nào cho kết quả tốt nhất?"], a: ["Well-lit, straight-on JPG/PNG/WebP photos up to 10 MB.", "Ảnh đủ sáng, chụp thẳng, định dạng JPG/PNG/WebP tối đa 10 MB."] },
  { q: ["Can I use results commercially?", "Tôi có dùng kết quả cho mục đích thương mại được không?"], a: ["Check our Terms of Service for the current license. AI results are for reference only.", "Xem Điều khoản dịch vụ để biết giấy phép hiện hành. Kết quả AI chỉ mang tính tham khảo."] },
  { q: ["Is my data private?", "Dữ liệu của tôi có riêng tư không?"], a: ["Your photos are private unless you choose to publish a result to the community gallery. You can delete any design at any time.", "Ảnh của bạn ở chế độ riêng tư trừ khi bạn chọn đăng lên thư viện cộng đồng. Bạn có thể xoá bất kỳ thiết kế nào bất cứ lúc nào."] },
];
