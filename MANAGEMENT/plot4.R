library(tidyverse)

# --- 2. Đọc file CSV ---
# Đổi tên file thành đường dẫn thực tế trên máy của bạn nếu cần
file_path <- "~/Downloads/TNLS_BVTN.csv"
df <- read_csv(file_path, show_col_types = FALSE)

# --- 3. Xử lý và chuyển đổi dữ liệu AE/SAE ---
df_events <- df %>%
  rename_all(str_trim) %>%
  # Chuyển đổi dữ liệu số, thay thế NA bằng 0
  mutate(
    AE = as.numeric(gsub(",", "", `Số lượng AE`)),
    SAE = as.numeric(gsub(",", "", `Số lượng SAE`)),
    AE = ifelse(is.na(AE), 0, AE),
    SAE = ifelse(is.na(SAE), 0, SAE),
    Ten_NC = ifelse(!is.na(`Tên viết tắt`), `Tên viết tắt`, `Mã nghiên cứu`)
  ) %>%
  # Chỉ giữ lại các nghiên cứu có ít nhất 1 AE hoặc SAE
  filter(AE > 0 | SAE > 0) %>%
  # Chuyển dữ liệu sang dạng dọc (Long Format) cho ggplot
  pivot_longer(
    cols = c(AE, SAE),
    names_to = "Loai_Bien_Co",
    values_to = "So_Luong"
  ) %>%
  # Sắp xếp thứ tự tên nghiên cứu theo tổng số biến cố
  mutate(Ten_NC = fct_reorder(Ten_NC, So_Luong, .fun = sum))

# --- 4. Vẽ biểu đồ so sánh AE vs SAE bằng ggplot2 ---
p_aesae <- ggplot(df_events, aes(x = Ten_NC, y = So_Luong, fill = Loai_Bien_Co)) +
  geom_col(position = position_dodge(width = 0.8), width = 0.7) +
  # Hiển thị con số trực tiếp trên các cột > 0
  geom_text(
    aes(label = ifelse(So_Luong > 0, So_Luong, "")),
    position = position_dodge(width = 0.8),
    hjust = -0.2,
    size = 3.5,
    fontface = "bold"
  ) +
  coord_flip() +
  scale_y_continuous(limits = c(0, max(df_events$So_Luong) + 15)) +
  scale_fill_manual(
    values = c("AE" = "#3498db", "SAE" = "#e74c3c"),
    labels = c("AE (Biến cố bất lợi)", "SAE (Biến cố nghiêm trọng)")
  ) +
  labs(
    title = "SỐ LƯỢNG BIẾN CỐ BẤT LỢI (AE) VÀ NGHIÊM TRỌNG (SAE)",
    subtitle = "Chỉ hiển thị các nghiên cứu đã phát sinh AE/SAE tại Bệnh viện Thống Nhất",
    x = "Nghiên cứu (Tên viết tắt)",
    y = "Số lượng biến cố",
    fill = "Phân loại",
    caption = "Nguồn: Dữ liệu Thử nghiệm lâm sàng - Bệnh viện Thống Nhất"
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", size = 13, color = "#2c3e50"),
    plot.subtitle = element_text(size = 10, color = "#7f8c8d", margin = margin(b = 12)),
    axis.title = element_text(face = "bold", color = "#2c3e50"),
    axis.text = element_text(color = "#34495e", fontface = "bold"),
    legend.position = "top",
    legend.title = element_blank(),
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank()
  )

# --- 5. Hiển thị & Lưu ảnh ---
print(p_aesae)
ggsave("Phan_Bo_AE_SAE_Theo_Nghien_Cuu.png", plot = p_aesae, width = 10, height = 7, dpi = 300)