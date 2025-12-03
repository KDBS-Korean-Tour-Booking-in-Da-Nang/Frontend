// 🌏 Danh sách city chính trong khu vực miền Trung Việt Nam
export const CITIES = {
    "da-nang": ["đà nẵng", "da nang", "danang", "dn"],
    "hoi-an": ["hội an", "hoi an", "hoian"],
    "hue": ["huế", "hue", "thừa thiên huế", "thua thien hue"],
    "quang-nam": ["quảng nam", "quang nam", "tam ky", "tam kỳ"],
    "quang-binh": ["quảng bình", "quang binh", "dong hoi", "đồng hới"],
    "quang-ngai": ["quảng ngãi", "quang ngai"],
    "ly-son": ["lý sơn", "ly son", "đảo lý sơn", "ly son island"],
  };
  
  // 🏞️ Danh sách điểm du lịch (POI) — mapping về từng thành phố
  export const POIS = [
    // 🌆 ĐÀ NẴNG
    { key: "ba-na", labels: ["bà nà hills", "ba na hills", "bana hill"], city: "da-nang" },
    { key: "golden-bridge", labels: ["cầu vàng", "golden bridge"], city: "da-nang" },
    { key: "dragon-bridge", labels: ["cầu rồng", "dragon bridge"], city: "da-nang" },
    { key: "han-river", labels: ["sông hàn", "han river"], city: "da-nang" },
    { key: "my-khe", labels: ["biển mỹ khê", "my khe beach"], city: "da-nang" },
    { key: "marble-mountains", labels: ["ngũ hành sơn", "marble mountains"], city: "da-nang" },
    { key: "son-tra", labels: ["sơn trà", "bán đảo sơn trà", "son tra peninsula"], city: "da-nang" },
    { key: "linh-ung", labels: ["chùa linh ứng", "linh ung pagoda"], city: "da-nang" },
    { key: "asia-park", labels: ["asia park", "sun world da nang wonders"], city: "da-nang" },
    { key: "love-bridge", labels: ["cầu tình yêu", "love bridge"], city: "da-nang" },
    { key: "museum-cham", labels: ["bảo tàng điêu khắc chăm", "cham museum"], city: "da-nang" },
    { key: "sun-wheel", labels: ["sun wheel", "vòng quay mặt trời"], city: "da-nang" },
    { key: "pink-church", labels: ["nhà thờ chính tòa", "cathedral", "pink church"], city: "da-nang" },
    { key: "son-tra-lighthouse", labels: ["hải đăng sơn trà", "son tra lighthouse"], city: "da-nang" },
    { key: "tien-sa", labels: ["tiên sa", "tien sa port", "tien sa beach"], city: "da-nang" },
  
    // 🏮 HỘI AN (Quảng Nam)
    { key: "ancient-town", labels: ["phố cổ hội an", "hoi an ancient town", "old town"], city: "hoi-an" },
    { key: "an-bang", labels: ["biển an bàng", "an bang beach"], city: "hoi-an" },
    { key: "cua-dai", labels: ["biển cửa đại", "cua dai beach"], city: "hoi-an" },
    { key: "chua-cau", labels: ["chùa cầu", "japanese covered bridge"], city: "hoi-an" },
    { key: "tra-que", labels: ["làng rau trà quế", "tra que village"], city: "hoi-an" },
    { key: "cam-thanh", labels: ["làng dừa bảy mẫu", "bay mau coconut village", "cam thanh"], city: "hoi-an" },
    { key: "night-market", labels: ["chợ đêm hội an", "hoi an night market"], city: "hoi-an" },
    { key: "lantern", labels: ["đèn lồng", "lanterns"], city: "hoi-an" },
    { key: "hoi-an-river", labels: ["sông thu bồn", "thu bon river"], city: "hoi-an" },
  
    // 🏯 HUẾ
    { key: "imperial", labels: ["đại nội", "hoàng thành huế", "imperial city", "citadel"], city: "hue" },
    { key: "thien-mu", labels: ["chùa thiên mụ", "thien mu pagoda"], city: "hue" },
    { key: "perfume-river", labels: ["sông hương", "perfume river"], city: "hue" },
    { key: "lang-co", labels: ["lăng cô", "lang co beach"], city: "hue" },
    { key: "tomb-minh-mang", labels: ["lăng minh mạng", "minh mang tomb"], city: "hue" },
    { key: "tomb-khai-dinh", labels: ["lăng khai định", "khai dinh tomb"], city: "hue" },
    { key: "tomb-tu-duc", labels: ["lăng tự đức", "tu duc tomb"], city: "hue" },
    { key: "truong-tien", labels: ["cầu trường tiền", "truong tien bridge"], city: "hue" },
    { key: "dong-ba", labels: ["chợ đông ba", "dong ba market"], city: "hue" },
    { key: "thuan-an", labels: ["biển thuận an", "thuan an beach"], city: "hue" },
    { key: "bach-ma", labels: ["vườn quốc gia bạch mã", "bach ma national park"], city: "hue" },
  
    // 🗿 QUẢNG NAM
    { key: "my-son", labels: ["mỹ sơn", "my son sanctuary"], city: "quang-nam" },
    { key: "tam-ky", labels: ["tam kỳ", "tam ky"], city: "quang-nam" },
    { key: "phu-ninh", labels: ["hồ phú ninh", "phu ninh lake"], city: "quang-nam" },
    { key: "cham-island", labels: ["cù lao chàm", "cham island"], city: "quang-nam" },
    { key: "thanh-ha", labels: ["làng gốm thanh hà", "thanh ha pottery village"], city: "quang-nam" },
    { key: "ha-my", labels: ["biển hà my", "ha my beach"], city: "quang-nam" },
    { key: "bang-an", labels: ["tháp bàng an", "bang an tower"], city: "quang-nam" },
  
    // 🌄 QUẢNG BÌNH
    { key: "phong-nha", labels: ["phong nha", "phong nha-ke bang", "phong nha ke bang national park"], city: "quang-binh" },
    { key: "son-doong", labels: ["hang sơn đoòng", "son doong cave"], city: "quang-binh" },
    { key: "paradise-cave", labels: ["động thiên đường", "paradise cave"], city: "quang-binh" },
    { key: "hang-en", labels: ["hang én", "hang en cave"], city: "quang-binh" },
    { key: "dong-hoi", labels: ["đồng hới", "dong hoi city"], city: "quang-binh" },
    { key: "mooc", labels: ["suối nước mọoc", "mooc spring"], city: "quang-binh" },
    { key: "chay-river", labels: ["sông chày", "chay river"], city: "quang-binh" },
    { key: "nhat-le", labels: ["biển nhật lệ", "nhat le beach"], city: "quang-binh" },
  
    // 🌅 QUẢNG NGÃI & LÝ SƠN
    { key: "ly-son", labels: ["lý sơn", "ly son island", "đảo lý sơn"], city: "ly-son" },
    { key: "hang-cau", labels: ["hang câu", "hang cau"], city: "ly-son" },
    { key: "to-vo", labels: ["cổng tò vò", "to vo gate"], city: "ly-son" },
    { key: "thoi-loi", labels: ["núi thới lới", "thoi loi mountain"], city: "ly-son" },
    { key: "my-khe-quang-ngai", labels: ["biển mỹ khê quảng ngãi", "my khe quang ngai beach"], city: "quang-ngai" },
    { key: "sa-huynh", labels: ["sa huỳnh", "sa huynh beach"], city: "quang-ngai" },
    { key: "truong-luu", labels: ["thành cổ trường lưu", "truong luu citadel"], city: "quang-ngai" },
  ];