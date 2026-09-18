# Clinical Trial Management

Repository chứa code Google Apps Script để quản lý nghiên cứu lâm sàng.

## Cấu trúc

- `src/` - Chứa các file code Apps Script
  - `code.gs` - Logic chính
  - `index.html` - Giao diện web app
- `appsscript.json` - File cấu hình project
- `.github/workflows/auto-push.yml` - CI/CD workflow

## Auto-Deploy

Mỗi khi push code lên branch `main`, GitHub Actions sẽ tự động:

1. Tạo branch mới với timestamp
2. Push code lên branch mới
3. Tạo Pull Request

Kiểm tra workflow: [Actions](https://github.com/AslanPhamm/Clinical-Trial/actions)
