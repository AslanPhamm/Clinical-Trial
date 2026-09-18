library(tidyverse)

# --- 2. Đọc file CSV ---
# Đổi tên file thành đường dẫn thực tế trên máy của bạn nếu cần
file_path <- "~/Downloads/TNLS_BVTN.csv"
df <- read_csv(file_path, show_col_types = FALSE)

# --- 3. Trích xuất Năm từ cột 'Thời gian bắt đầu thu tuyển' ---
df_year <- df %>%
  # Bỏ khoảng trắng thừa ở tên cột
  rename_all(str_trim) %>%
  # Trích xuất 4 chữ số năm (dạng 20xx) bằng Regex
  mutate(
    Nam_Bat_Dau = str_extract(`Thời gian bắt đầu thu tuyển`, "20\\d{2}"),
    Nam_Bat_Dau = ifelse(is.na(Nam_Bat_Dau), "Chưa xác định", Nam_Bat_Dau)
  ) %>%
  # Thống kê số lượng theo năm
  count(Nam_Bat_Dau, name = "So_Luong")

# --- 4. Vẽ biểu đồ phân bố theo Năm bằng ggplot2 ---
p_year <- ggplot(df_year, aes(x = Nam_Bat_Dau, y = So_Luong, fill = Nam_Bat_Dau)) +
  geom_col(width = 0.6, show.legend = FALSE) +
  # Nhãn hiển thị số lượng trên đỉnh mỗi cột
  geom_text(aes(label = So_Luong), vjust = -0.5, size = 4.5, fontface = "bold", color = "#1b4965") +
  # Bảng màu
  scale_fill_brewer(palette = "Spectral") +
  # Điều chỉnh giới hạn trục Y
  scale_y_continuous(limits = c(0, max(df_year$So_Luong) + 3), breaks = seq(0, 15, by = 2)) +
  # Nhãn tiêu đề và các trục
  labs(
    title = "PHÂN BỐ SỐ LƯỢNG NGHIÊN CỨU THEO NĂM BẮT ĐẦU THU TUYỂN",
    subtitle = "Bệnh viện Thống Nhất (Dựa trên cột 'Thời gian bắt đầu thu tuyển')",
    x = "Năm bắt đầu thu tuyển",
    y = "Số lượng nghiên cứu",
    caption = "Nguồn: Bệnh viện Thống Nhất"
  ) +
  # Tùy chỉnh giao diện
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14, color = "#0d1b2a", hjust = 0.5),
    plot.subtitle = element_text(size = 11, color = "#415a77", hjust = 0.5, margin = margin(b = 15)),
    axis.title.x = element_text(face = "bold", size = 11, color = "#1b4965", margin = margin(t = 10)),
    axis.title.y = element_text(face = "bold", size = 11, color = "#1b4965"),
    axis.text = element_text(color = "#0d1b2a", size = 10, face = "bold"),
    panel.grid.major.x = element_blank(), # Bỏ đường lưới dọc
    panel.grid.minor = element_blank()
  )

# --- 5. Hiển thị và lưu file ---
print(p_year)

# Lưu hình ảnh PNG
ggsave("Phan_Bo_Nam_Bat_Dau_Thu_Tuyen.png", plot = p_year, width = 8.5, height = 5, dpi = 300)