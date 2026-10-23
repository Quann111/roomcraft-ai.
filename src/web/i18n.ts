// English stays the canonical value sent to the API; Vietnamese is display-only.
const VI: Record<string, string> = {
  // categories & tools
  Interiors: "Nội thất", Exteriors: "Ngoại thất", Gardens: "Sân vườn",
  Redesign: "Thiết kế lại", "Virtual Staging": "Bài trí ảo", Declutter: "Dọn đồ", "Sketch to Render": "Phác thảo → ảnh thật",
  "Material Swap": "Đổi vật liệu", "Video Walkthrough": "Video tham quan", "2D to 3D Floor Plan": "Mặt bằng 2D → 3D", "Room Composer": "Sắp xếp phòng", "Design Critique": "Nhận xét thiết kế", "Design Advisor": "Tư vấn thiết kế", "Furniture Finder": "Tìm nội thất", "push-in": "Đẩy vào", pan: "Lia ngang", orbit: "Đi vòng", reveal: "Lùi ra toàn cảnh", "Camera · Camera": "Camera", "Under $500": "Dưới $500",
  "Sky & Weather Swap": "Đổi bầu trời & thời tiết",
  // rooms
  "Living room": "Phòng khách", Bedroom: "Phòng ngủ", Bathroom: "Phòng tắm", Kitchen: "Nhà bếp", "Dining room": "Phòng ăn",
  Attic: "Gác mái", Study: "Phòng đọc sách", "Home office": "Phòng làm việc", "Family room": "Phòng sinh hoạt chung",
  "Kids room": "Phòng trẻ em", Balcony: "Ban công", "Gaming room": "Phòng game", Hallway: "Hành lang", "Laundry room": "Phòng giặt",
  Basement: "Tầng hầm", Nursery: "Phòng em bé", "Walk-in closet": "Phòng thay đồ", "Home gym": "Phòng tập gym",
  "Home theater": "Phòng chiếu phim", Workshop: "Xưởng", "Yoga studio": "Phòng yoga", "Wine cellar": "Hầm rượu",
  // surfaces & materials
  floor: "Sàn", walls: "Tường", countertops: "Mặt bàn bếp", cabinets: "Tủ", ceiling: "Trần",
  "Oak hardwood": "Gỗ sồi", "Walnut hardwood": "Gỗ óc chó", "Herringbone parquet": "Sàn gỗ xương cá", "Polished concrete": "Bê tông mài",
  "Porcelain tile": "Gạch sứ", Marble: "Đá cẩm thạch", Terrazzo: "Đá mài terrazzo", "Natural stone": "Đá tự nhiên", "Luxury vinyl plank": "Sàn vinyl cao cấp",
  "Warm white paint": "Sơn trắng ấm", "Sage green paint": "Sơn xanh xô thơm", "Navy paint": "Sơn xanh navy", "Limewash plaster": "Vữa vôi", "Exposed brick": "Gạch trần",
  "Wood paneling": "Ốp tường gỗ", Wallpaper: "Giấy dán tường", "Zellige tile": "Gạch zellige", Microcement: "Xi măng mịn",
  "White quartz": "Đá thạch anh trắng", "Carrara marble": "Đá Carrara", "Black granite": "Đá granite đen", "Butcher block": "Gỗ ghép dày", Concrete: "Bê tông", Soapstone: "Đá xà phòng",
  "White shaker": "Shaker trắng", "Walnut slab": "Gỗ óc chó nguyên tấm", "Matte black": "Đen nhám", "Sage green": "Xanh xô thơm", "Navy blue": "Xanh navy", "Natural oak": "Gỗ sồi tự nhiên", "Two-tone": "Hai tông màu",
  "White painted": "Sơn trắng", "Wood plank": "Ván gỗ", "Exposed beams": "Dầm lộ", Coffered: "Trần hộp", Shiplap: "Ván ghép", "Tin tile": "Tấm trần thiếc",
  // weather, remove, angles
  "Golden hour": "Giờ vàng", "Clear blue sky": "Trời xanh trong", "Sunset glow": "Hoàng hôn", Overcast: "Trời u ám", Twilight: "Chạng vạng",
  "Fresh snow": "Tuyết mới", "Misty morning": "Sáng sương mù", "Dramatic storm clouds": "Mây bão kịch tính",
  furniture: "Đồ nội thất", clutter: "Đồ lộn xộn", people: "Người", "everything (empty room)": "Tất cả (phòng trống)",
  front: "Mặt trước", side: "Mặt bên", back: "Mặt sau",
  isometric: "Phối cảnh 3D (45°)", "top-down": "Nhìn từ trên xuống",
  // intervention
  "very-low": "Rất thấp", low: "Thấp", medium: "Vừa", high: "Cao", extreme: "Tối đa",
  // paint colors & finishes
  "Warm white": "Trắng ấm", "Soft greige": "Xám be", "Dusty blue": "Xanh xám", Navy: "Xanh navy", Terracotta: "Đất nung",
  Charcoal: "Xám than", "Blush pink": "Hồng phấn", Olive: "Xanh ô liu", "Butter yellow": "Vàng bơ", "Forest green": "Xanh rừng", "Soft black": "Đen dịu",
  matte: "Mờ", eggshell: "Bóng nhẹ", satin: "Bán bóng", gloss: "Bóng",
  // styles (interior, from Excel)
  Scandinavia: "Bắc Âu", "Urban Modern": "Hiện đại đô thị", Eclectic: "Chiết trung", Japandi: "Japandi (Nhật–Bắc Âu)", Industrial: "Công nghiệp",
  Contemporary: "Đương đại", Modern: "Hiện đại", Transitional: "Chuyển tiếp", Mediterranean: "Địa Trung Hải", Ikea: "Phong cách Ikea",
  "Quiet Luxury": "Sang trọng tinh tế", "Kids Room": "Phòng trẻ em", "Shabby Chic": "Shabby Chic (cổ điển nhẹ)", Coastal: "Ven biển", Bauhaus: "Bauhaus (trường phái Đức)",
  Bohemian: "Bohemian (phóng khoáng)", Traditional: "Truyền thống", Rustic: "Mộc mạc", Minimalism: "Tối giản", "Japanese design": "Thiết kế Nhật Bản",
  "Modern Arabic": "Ả Rập hiện đại", "Traditional Arabic": "Ả Rập truyền thống", Bali: "Bali (Indonesia)", Tropical: "Nhiệt đới", "Asian Decor": "Trang trí châu Á",
  Zen: "Thiền (Zen)", "Hollywood Regency": "Hollywood Regency (xa hoa cổ điển)", "Hollywood Glam": "Hollywood lộng lẫy", Minimalist: "Tối giản", Christmas: "Giáng sinh",
  Futuristic: "Tương lai", Luxurious: "Xa hoa", "Midcentury modern": "Hiện đại giữa thế kỷ", Biophilic: "Hòa hợp thiên nhiên", "Cottage Core": "Cottage Core (đồng quê)",
  "French Country": "Đồng quê Pháp", "Art Deco": "Art Deco (trang trí nghệ thuật)", "Art nouveau": "Art Nouveau", "South Western": "Tây Nam Mỹ", "Modern Farm House": "Nhà trang trại hiện đại",
  // styles (interior extras)
  Farmhouse: "Nhà trang trại", "Mid-Century Revival": "Hồi sinh giữa thế kỷ", Glam: "Lộng lẫy", Maximalist: "Tối đa", "Wabi-Sabi": "Wabi-Sabi (vẻ đẹp bất toàn)",
  Hamptons: "Hamptons (nghỉ dưỡng kiểu Mỹ)", Moroccan: "Ma-rốc", Victorian: "Victoria", Gothic: "Gothic (u tối cổ kính)", Cyberpunk: "Cyberpunk (đô thị tương lai)", Nautical: "Hải hành",
  "Southwestern Desert": "Sa mạc Tây Nam", "Mountain Lodge": "Nhà gỗ miền núi", Parisian: "Paris", "Retro 70s": "Retro thập niên 70",
  "Scandi-Boho": "Bắc Âu – Boho", "Coastal Grandmother": "Ven biển nhẹ nhàng", "Organic Modern": "Hiện đại hữu cơ",
  "Japanese Zen Minimal": "Thiền Nhật tối giản", "Luxury Hotel Suite": "Phòng khách sạn sang trọng",
  // styles (exterior)
  Craftsman: "Craftsman (thủ công)", Colonial: "Thuộc địa", Ranch: "Ranch (nhà một tầng)", Cottage: "Nhà tranh", Scandinavian: "Bắc Âu",
  "Spanish Colonial": "Thuộc địa Tây Ban Nha", "Mid-Century Modern": "Hiện đại giữa thế kỷ", Japanese: "Nhật Bản", Tudor: "Tudor (kiểu Anh thế kỷ 16)",
  "Barn-style": "Kiểu nhà kho", Chalet: "Nhà gỗ Alps", Brutalist: "Brutalist (bê tông thô)", "Desert Modern": "Hiện đại sa mạc",
  // styles (garden)
  "Japanese Zen": "Vườn Nhật (Zen)", "English Cottage": "Vườn đồng quê Anh", "Modern Minimalist": "Hiện đại tối giản",
  "Tropical Oasis": "Ốc đảo nhiệt đới", "Desert Xeriscape": "Vườn sa mạc ít nước", "Cottage Vegetable": "Vườn rau đồng quê",
  "Outdoor Entertaining": "Không gian tiếp khách ngoài trời", "Rooftop / Balcony Garden": "Vườn sân thượng / ban công",
  "Formal French": "Vườn Pháp cổ điển", "Wildflower Meadow": "Đồng hoa dại", "Pool Garden": "Vườn hồ bơi",
};

export type Lang = "en" | "vi";
let lang: Lang = "vi";
try { const v = localStorage.getItem("lang"); if (v === "en" || v === "vi") lang = v; } catch { /* storage blocked */ }
const subs = new Set<() => void>();
export const getLang = () => lang;
export const subscribeLang = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem("lang", l); } catch { /* ignore */ }
  document.documentElement.lang = l;
  subs.forEach((f) => f());
}
/** Pick the string for the current language. */
export const t = (en: string, vi: string) => (lang === "vi" ? vi : en);

/** Translate a canonical English label; also splits legacy "English · Tiếng Việt" strings. */
export const bi = (en: string) => {
  if (VI[en]) return lang === "vi" ? VI[en] : en;
  const i = en.indexOf(" · ");
  if (i > 0 && /[^\x00-\x7f]/.test(en)) return lang === "vi" ? en.slice(i + 3) : en.slice(0, i);
  return en;
};
