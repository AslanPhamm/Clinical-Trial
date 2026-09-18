library(tidyverse)

# --- 2. Đọc file CSV ---
# Đổi tên file thành đường dẫn thực tế trên máy của bạn nếu cần
file_path <- "~/Downloads/TNLS_BVTN.csv"
df <- read_csv(file_path, show_col_types = FALSE)

# --- 3. Làm sạch & Thống kê theo Khoa thực hiện ---
df_dept <- df %>%
  rename_all(str_trim) %>%
  mutate(Khoa = str_trim(`Khoa thực hiện`)) %>%
  count(Khoa, name = "So_Luong") %>%
  # Sắp xếp thứ tự cột từ cao đến thấp trên biểu đồ ngang
  mutate(Khoa = fct_reorder(Khoa, So_Luong))

# --- 4. Vẽ biểu đồ ggplot2 ---
p_dept <- ggplot(df_dept, aes(x = Khoa, y = So_Luong, fill = Khoa)) +
  geom_col(show.legend = FALSE, width = 0.65) +
  # Hiển thị số lượng trực tiếp bên cạnh mỗi cột
  geom_text(aes(label = So_Luong), hjust = -0.3, size = 4.2, fontface = "bold", color = "#1e3d59") +
  coord_flip() +
  scale_y_continuous(limits = c(0, max(df_dept$So_Luong) + 1.5), breaks = seq(0, 10, by = 1)) +
  scale_fill_brewer(palette = "Set2") +
  labs(
    title = "SỐ LƯỢNG NGHIÊN CỨU LÂM SÀNG THEO KHOA THỰC HIỆN",
    subtitle = "Bệnh viện Thống Nhất (Tổng số: 31 nghiên cứu)",
    x = "Khoa thực hiện",
    y = "Số lượng nghiên cứu",
    caption = "Nguồn: Dữ liệu Thử nghiệm lâm sàng - Bệnh viện Thống Nhất"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 13, color = "#17252a", hjust = 0),
    plot.subtitle = element_text(size = 10, color = "#3a6073", margin = margin(b = 12)),
    axis.title.x = element_text(face = "bold", size = 10, color = "#17252a", margin = margin(t = 10)),
    axis.title.y = element_text(face = "bold", size = 10, color = "#17252a"),
    axis.text = element_text(color = "#2b7a78", face = "bold"),
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank()
  )

# --- 5. Hiển thị & Lưu ảnh ---
print(p_dept)
ggsave("Phan_Bo_Nghien_Cuu_Theo_Khoa.png", plot = p_dept, width = 8.5, height = 5, dpi = 300)