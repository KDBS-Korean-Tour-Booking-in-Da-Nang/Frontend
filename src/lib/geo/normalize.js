// 🔤 Hàm loại bỏ dấu tiếng Việt để dễ so khớp từ khoá địa danh
export const noAccent = (s = "") =>
    s.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase();