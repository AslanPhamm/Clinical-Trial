library(tidyverse)

# --- 2. Đọc file CSV ---
# Đổi tên file thành đường dẫn thực tế trên máy của bạn nếu cần
file_path <- "~/Downloads/TNLS_BVTN.csv"
df <- read_csv(file_path, show_col_types = FALSE)

# --- 3. Làm sạch dữ liệu & Tính tổng số nghiên cứu ---
# Loại bỏ khoảng trắng thừa ở tên cột
df <- df %>% rename_all(str_trim)

# Tính tổng số nghiên cứu
tong_so_nc <- nrow(df)
cat(">>> TỔNG SỐ NGHIÊN CỨU TẠI BỆNH VIỆN THỐNG NHẤT:", tong_so_nc, "nghiên cứu.\n\n")

# Thống kê phân bố theo Tình trạng nghiên cứu
df_status <- df %>%
  mutate(Tinh_Trang = str_trim(`Tình trạng nghiên cứu`)) %>%
  count(Tinh_Trang, name = "So_Luong") %>%
  mutate(
    Ty_Le = round((So_Luong / sum(So_Luong)) * 100, 1),
    Nhan_Hien_Thi = paste0(So_Luong, " (", Ty_Le, "%)"),
    Tinh_Trang = fct_reorder(Tinh_Trang, So_Luong) # Sắp xếp cột từ thấp đến cao
  )

# In bảng thống kê ra màn hình R Console
print(df_status)

# --- 4. Vẽ biểu đồ phân bố bằng ggplot2 ---
p_status <- ggplot(df_status, aes(x = Tinh_Trang, y = So_Luong, fill = Tinh_Trang)) +
  geom_col(width = 0.6, show.legend = FALSE) +
  # Nhãn hiển thị Số lượng và Phần trăm bên cạnh mỗi cột
  geom_text(
    aes(label = Nhan_Hien_Thi),
    hjust = -0.15,
    size = 4,
    fontface = "bold",
    color = "#1a252f"
  ) +
  coord_flip() + # Quay ngang biểu đồ để nhãn chữ không bị chồng lấn
  scale_y_continuous(limits = c(0, max(df_status$So_Luong) + 3), breaks = seq(0, 15, by = 2)) +
  scale_fill_brewer(palette = "Set2") +
  labs(
    title = "PHÂN BỐ NGHIÊN CỨU THEO TÌNH TRẠNG THỰC HIỆN",
    subtitle = paste0("Bệnh viện Thống Nhất (Tổng số: ", tong_so_nc, " nghiên cứu)"),
    x = "Tình trạng nghiên cứu",
    y = "Số lượng nghiên cứu",
    caption = "Nguồn: Dữ liệu Thử nghiệm lâm sàng - Bệnh viện Thống Nhất"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 13, color = "#2c3e50", hjust = 0),
    plot.subtitle = element_text(size = 11, color = "#7f8c8d", margin = margin(b = 15)),
    axis.title.x = element_text(face = "bold", size = 10, color = "#2c3e50", margin = margin(t = 10)),
    axis.title.y = element_text(face = "bold", size = 10, color = "#2c3e50"),
    axis.text = element_text(color = "#34495e", fontface = "bold"),
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank()
  )

# --- 5. Hiển thị & Lưu hình ảnh ---
print(p_status)
ggsave("Phan_Bo_Tinh_Trang_Nghien_Cuu.png", plot = p_status, width = 8.5, height = 4.5, dpi = 300)