library(tidyverse)

# --- 2. Đọc file CSV ---
# Đổi tên file thành đường dẫn thực tế trên máy của bạn nếu cần
file_path <- "~/Downloads/TNLS_BVTN.csv"
df <- read_csv(file_path, show_col_types = FALSE)

# --- 3. Làm sạch dữ liệu & Chuẩn hóa tên Nhà tài trợ ---
df_sponsor <- df %>%
  # Xóa khoảng trắng thừa trong tên cột
  rename_all(str_trim) %>%
  # Chuẩn hóa tên nhà tài trợ
  mutate(
    Sponsor_Clean = str_trim(`Nhà tài trợ`),
    Sponsor_Clean = case_when(
      str_detect(Sponsor_Clean, "(?i)AstraZeneca") ~ "AstraZeneca",
      str_detect(Sponsor_Clean, "(?i)Boehringer") ~ "Boehringer Ingelheim",
      str_detect(Sponsor_Clean, "(?i)Novartis") ~ "Novartis",
      str_detect(Sponsor_Clean, "(?i)MSD|Merck") ~ "MSD (Merck)",
      str_detect(Sponsor_Clean, "(?i)Corxel") ~ "Corxel Pharmaceuticals",
      str_detect(Sponsor_Clean, "(?i)Janssen") ~ "Janssen R&D",
      str_detect(Sponsor_Clean, "(?i)Geogre|George") ~ "Viện George / JHU",
      TRUE ~ Sponsor_Clean
    )
  ) %>%
  # Đếm số lượng nghiên cứu theo nhà tài trợ
  count(Sponsor_Clean, name = "So_Luong") %>%
  # Sắp xếp thứ tự tăng dần để khi vẽ lên biểu đồ cột ngang sẽ hiển thị từ lớn đến nhỏ
  mutate(Sponsor_Clean = fct_reorder(Sponsor_Clean, So_Luong))

# --- 4. Vẽ biểu đồ bằng ggplot2 ---
p <- ggplot(df_sponsor, aes(x = Sponsor_Clean, y = So_Luong, fill = Sponsor_Clean)) +
  geom_col(show.legend = FALSE, width = 0.7) +
  # Hiển thị số liệu trực tiếp trên đầu/bên cạnh mỗi cột
  geom_text(aes(label = So_Luong), hjust = -0.3, size = 4, fontface = "bold", color = "#2c3e50") +
  # Quay ngang biểu đồ để dễ đọc tên nhà tài trợ
  coord_flip() +
  # Mở rộng giới hạn trục y để số liệu không bị đè viền
  scale_y_continuous(limits = c(0, max(df_sponsor$So_Luong) + 3), breaks = seq(0, 20, by = 2)) +
  # Bảng màu chuyên nghiệp
  scale_fill_brewer(palette = "Blues") +
  # Tùy chỉnh Tiêu đề và Nhãn
  labs(
    title = "SỐ LƯỢNG NGHIÊN CỨU LÂM SÀNG THEO NHÀ TÀI TRỢ",
    subtitle = "Bệnh viện Thống Nhất (Tổng số: 31 nghiên cứu)",
    x = "Nhà tài trợ",
    y = "Số lượng nghiên cứu",
    caption = "Nguồn: Dữ liệu Thử nghiệm lâm sàng - Bệnh viện Thống Nhất"
  ) +
  # Giao diện tối giản, sạch sẻ
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14, color = "#1a252f", hjust = 0),
    plot.subtitle = element_text(size = 11, color = "#7f8c8d", margin = margin(b = 15)),
    axis.title.x = element_text(face = "bold", size = 10, color = "#34495e", margin = margin(t = 10)),
    axis.title.y = element_text(face = "bold", size = 10, color = "#34495e"),
    axis.text = element_text(color = "#2c3e50"),
    panel.grid.major.y = element_blank(), # Bỏ lưới ngang
    panel.grid.minor = element_blank()
  )

# --- 5. Hiển thị và Lưu biểu đồ ---
print(p)

# Lưu thành file ảnh chất lượng cao PNG
ggsave("So_Luong_Nghien_Cuu_Theo_Nha_Tai_Tro.png", plot = p, width = 9, height = 5.5, dpi = 300)
