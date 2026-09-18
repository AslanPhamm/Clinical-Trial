library(tidyverse)

# --- 2. Đọc file CSV ---
# Đổi tên file thành đường dẫn thực tế trên máy của bạn nếu cần
file_path <- "~/Downloads/TNLS_BVTN.csv"
df <- read_csv(file_path, show_col_types = FALSE)

# --- 3. Làm sạch tên cột & Chuẩn hóa đơn vị CRO ---
df_cro <- df %>%
  rename_all(str_trim) %>%
  # Tìm cột CRO chính xác trong file
  rename(CRO_Raw = contains("CRO")) %>%
  mutate(
    CRO_Clean = str_trim(CRO_Raw),
    CRO_Clean = case_when(
      is.na(CRO_Clean) ~ "Chưa ghi nhận CRO",
      str_detect(CRO_Clean, "(?i)IQVIA") ~ "IQVIA RDS Việt Nam",
      str_detect(CRO_Clean, "(?i)Astra") ~ "AstraZeneca",
      str_detect(CRO_Clean, "(?i)MSD") ~ "MSD Việt Nam",
      str_detect(CRO_Clean, "(?i)Novartis") ~ "Novartis Việt Nam",
      str_detect(CRO_Clean, "(?i)Big Leap") ~ "Big Leap",
      str_detect(CRO_Clean, "(?i)SMART") ~ "SMART Research Corp",
      TRUE ~ CRO_Clean
    )
  ) %>%
  count(CRO_Clean, name = "So_Luong") %>%
  mutate(
    Ty_Le = round((So_Luong / sum(So_Luong)) * 100, 1),
    Nhan_Hien_Thi = paste0(So_Luong, " (", Ty_Le, "%)"),
    CRO_Clean = fct_reorder(CRO_Clean, So_Luong)
  )

# In số lượng các CRO/Đơn vị điều phối ra màn hình console
cat("Tổng số đơn vị/CRO ghi nhận:", nrow(df_cro), "\n")
print(df_cro)

# --- 4. Vẽ biểu đồ ggplot2 ---
p_cro <- ggplot(df_cro, aes(x = CRO_Clean, y = So_Luong, fill = CRO_Clean)) +
  geom_col(width = 0.65, show.legend = FALSE) +
  geom_text(
    aes(label = Nhan_Hien_Thi),
    hjust = -0.15,
    size = 3.8,
    fontface = "bold",
    color = "#2c3e50"
  ) +
  coord_flip() +
  scale_y_continuous(limits = c(0, max(df_cro$So_Luong) + 3), breaks = seq(0, 15, by = 2)) +
  scale_fill_brewer(palette = "Set3") +
  labs(
    title = "SỐ LƯỢNG NGHIÊN CỨU THEO CRO / ĐƠN VỊ ĐIỀU PHỐI",
    subtitle = "Bệnh viện Thống Nhất (Tổng số: 31 nghiên cứu)",
    x = "CRO / Đơn vị điều phối",
    y = "Số lượng nghiên cứu",
    caption = "Nguồn: Bệnh viện Thống Nhất"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 13, color = "#2c3e50", hjust = 0),
    plot.subtitle = element_text(size = 10, color = "#7f8c8d", margin = margin(b = 15)),
    axis.title = element_text(face = "bold", color = "#2c3e50"),
    axis.text = element_text(color = "#34495e", fontface = "bold"),
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank()
  )

# --- 5. Hiển thị & Lưu kết quả ---
print(p_cro)
ggsave("Phan_Bo_Nghien_Cuu_Theo_CRO.png", plot = p_cro, width = 9, height = 5, dpi = 300)