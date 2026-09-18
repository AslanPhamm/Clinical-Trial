library(tidyverse)

# --- 2. Đọc file CSV ---
# Đổi tên file thành đường dẫn thực tế trên máy của bạn nếu cần
file_path <- "~/Downloads/TNLS_BVTN.csv"
df <- read_csv(file_path, show_col_types = FALSE)

df_dept_ae <- df %>%
  rename_all(str_trim) %>%
  mutate(
    Khoa = str_trim(`Khoa thực hiện`),
    AE = as.numeric(gsub(",", "", `Số lượng AE`)),
    SAE = as.numeric(gsub(",", "", `Số lượng SAE`)),
    AE = ifelse(is.na(AE), 0, AE),
    SAE = ifelse(is.na(SAE), 0, SAE)
  ) %>%
  group_by(Khoa) %>%
  summarise(
    AE = sum(AE),
    SAE = sum(SAE),
    Tong_Bien_Co = AE + SAE,
    .groups = "drop"
  ) %>%
  filter(Tong_Bien_Co > 0) %>%
  pivot_longer(
    cols = c(AE, SAE),
    names_to = "Loai_Bien_Co",
    values_to = "So_Luong"
  ) %>%
  mutate(Khoa = fct_reorder(Khoa, So_Luong, .fun = sum))

# --- 3. Vẽ biểu đồ ghép nhóm song song ---
p_dept_corr <- ggplot(df_dept_ae, aes(x = Khoa, y = So_Luong, fill = Loai_Bien_Co)) +
  geom_col(position = position_dodge(width = 0.8), width = 0.7) +
  geom_text(
    aes(label = So_Luong),
    position = position_dodge(width = 0.8),
    hjust = -0.2,
    size = 3.8,
    fontface = "bold"
  ) +
  coord_flip() +
  scale_y_continuous(limits = c(0, max(df_dept_ae$So_Luong) + 15)) +
  scale_fill_manual(
    values = c("AE" = "#3498db", "SAE" = "#e74c3c"),
    labels = c("AE (Biến cố bất lợi)", "SAE (Biến cố nghiêm trọng)")
  ) +
  labs(
    title = "TƯƠNG QUAN SỐ LƯỢNG AE VÀ SAE THEO KHOA THỰC HIỆN",
    subtitle = "Bệnh viện Thống Nhất",
    x = "Khoa thực hiện",
    y = "Số lượng biến cố ghi nhận",
    fill = "Loại biến cố",
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

# --- 4. Hiển thị & Lưu kết quả ---
print(p_dept_corr)
ggsave("Tuong_Quan_AE_SAE_Theo_Khoa.png", plot = p_dept_corr, width = 9, height = 5.5, dpi = 300)