/**
 * CLINICAL RESEARCH TASK MANAGER
 */

// ==================== CẤU HÌNH ====================
const CONFIG = {
  SPREADSHEET_ID: '1dtAC0Y-Do-A7dSQCANnGoHC47BcqhEzohLAmrsNoe4w',
  DATABASE_SHEET: 'DATABASE',
  TASK_SHEET: 'TASK',
  DRIVE_FOLDER_ID: '1wTVk8hrCYfYhB4l6o31_ArpvRbOdy4OF'
};

// ==================== KHỞI TẠO WEB APP ====================
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Clinical Research Task Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ==================== XỬ LÝ DATABASE ====================
function getResearchList() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const dbSheet = ss.getSheetByName(CONFIG.DATABASE_SHEET);
    if (!dbSheet) return { success: false, message: 'Không tìm thấy sheet "DATABASE"' };

    const lastRow = dbSheet.getLastRow();
    const lastCol = dbSheet.getLastColumn();
    const data = dbSheet.getRange(1, 1, lastRow, lastCol).getValues();
    if (data.length < 2) return { success: false, message: 'Không có dữ liệu' };

    const headers = data[0];
    const nameIndex = headers.indexOf('Tên nghiên cứu');
    const abbrIndex = headers.indexOf('Tên viết tắt');
    const codeIndex = headers.indexOf('Mã nghiên cứu');
    const piIndex = headers.indexOf('Nghiên cứu viên chính');
    const statusIndex = headers.indexOf('Tình trạng nghiên cứu');
    if (nameIndex === -1 || abbrIndex === -1 || codeIndex === -1) {
      return { success: false, message: 'Không tìm thấy các cột cần thiết' };
    }

    const researchList = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[nameIndex] || row[abbrIndex] || row[codeIndex]) {
        researchList.push({
          tenNghienCuu: String(row[nameIndex] || '').trim(),
          tenVietTat: String(row[abbrIndex] || '').trim(),
          maNghienCuu: String(row[codeIndex] || '').trim(),
          nghienCuuVienChinh: piIndex !== -1 ? String(row[piIndex] || '').trim() : '',
          tinhTrang: statusIndex !== -1 ? String(row[statusIndex] || '').trim() : ''
        });
      }
    }
    return { success: true, data: researchList, total: researchList.length };
  } catch (error) {
    return { success: false, message: 'Lỗi: ' + error.message };
  }
}

function getResearchByAbbreviation(tenVietTat) {
  const result = getResearchList();
  if (result.success) {
    const research = result.data.find(r => r.tenVietTat === tenVietTat);
    return research || null;
  }
  return null;
}

// ==================== XỬ LÝ TASK ====================
function createTask(taskData) {
  try {
    // THÊM documentCount vào destructuring
    const { tenVietTat, taskName, note, documentCount, provider, status, files } = taskData;
    if (!tenVietTat || !taskName) {
      return { success: false, message: 'Vui lòng chọn nghiên cứu và nhập tên công việc' };
    }

    const research = getResearchByAbbreviation(tenVietTat);
    if (!research) return { success: false, message: 'Không tìm thấy nghiên cứu: ' + tenVietTat };

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let taskSheet = ss.getSheetByName(CONFIG.TASK_SHEET);

    // Tạo TASK sheet nếu chưa có - CẤU TRÚC MỚI THEO YÊU CẦU
    // A: Tên viết tắt | B: Mã nghiên cứu | C: Tên công việc | D: Ngày
    // E: Người giao | F: Ưu tiên | G: Số lượng | H: Link folder | I: Ghi chú
    if (!taskSheet) {
      taskSheet = ss.insertSheet(CONFIG.TASK_SHEET);
      const headers = ['Tên viết tắt', 'Mã nghiên cứu', 'Tên công việc', 'Ngày', 'Người giao', 'Ưu tiên', 'Số lượng', 'Link folder', 'Ghi chú'];
      const headerRange = taskSheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#e3f2fd');
      taskSheet.setFrozenRows(1);
    }

    // Xử lý upload file lên Drive - TÊN NGẮN: tenVietTat + taskName
    // CHỈ LƯU LINK FOLDER, không lưu từng link file riêng lẻ
    let folderUrl = '';
    let folderName = research.tenVietTat + '_' + taskName;

    if (files && files.length > 0) {
      try {
        const parentFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
        let taskFolder = null;
        const folders = parentFolder.getFolders();
        while (folders.hasNext()) {
          const f = folders.next();
          if (f.getName() === folderName) { taskFolder = f; break; }
        }
        if (!taskFolder) taskFolder = parentFolder.createFolder(folderName);

        // Upload file vào folder
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, file.name);
          taskFolder.createFile(blob);
        }
        // CHỈ LƯU LINK CỦA FOLDER
        folderUrl = taskFolder.getUrl();
      } catch (driveError) {
        folderUrl = '(Lỗi upload file)';
      }
    }

    const total = taskSheet.getLastRow();
    const startDate = new Date();
    const startDateStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    let providerName = provider || Session.getActiveUser().getEmail() || 'Unknown';

    // CẤU TRÚC MỚI THEO YÊU CẦU:
    // A: Tên viết tắt | B: Mã nghiên cứu | C: Tên công việc | D: Ngày
    // E: Người giao | F: Ưu tiên | G: Số lượng | H: Link folder | I: Ghi chú
    const newRow = [
      research.tenVietTat,    // A: Tên viết tắt
      research.maNghienCuu,  // B: Mã nghiên cứu
      taskName,              // C: Tên công việc
      startDateStr,          // D: Ngày
      providerName,          // E: Người giao
      status || 'Medium',    // F: Ưu tiên
      documentCount || 0,    // G: Số lượng (từ form web)
      folderUrl || '',       // H: Link folder chứa tài liệu
      note || ''            // I: Ghi chú
    ];
    taskSheet.appendRow(newRow);

    return {
      success: true,
      message: 'Công việc đã được tạo thành công!',
      data: { taskName, project: research.tenNghienCuu, maNghienCuu: research.maNghienCuu, tenVietTat: research.tenVietTat, total, folderName }
    };
  } catch (error) {
    return { success: false, message: 'Lỗi: ' + error.message };
  }
}

function getTaskList() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const taskSheet = ss.getSheetByName(CONFIG.TASK_SHEET);
    if (!taskSheet || taskSheet.getLastRow() < 2) return { success: true, data: [] };

    const lastRow = taskSheet.getLastRow();
    // Đọc 9 cột: A-Tên viết tắt | B-Mã | C-Tên công việc | D-Ngày | E-Người giao | F-Ưu tiên | G-Số lượng | H-Link folder | I-Ghi chú
    const data = taskSheet.getRange(2, 1, lastRow - 1, 9).getValues();

    const tasks = data.map((row, index) => ({
      stt: index + 1,
      tenVietTat: row[0],    // A: Tên viết tắt
      maNghienCuu: row[1],  // B: Mã nghiên cứu
      name: row[2],           // C: Tên công việc
      startDate: row[3],     // D: Ngày
      provider: row[4],     // E: Người giao
      status: row[5],       // F: Ưu tiên
      progress: row[6],     // G: Số lượng
      files: row[7],        // H: Link folder chứa tài liệu
      note: row[8]          // I: Ghi chú
    }));
    return { success: true, data: tasks.reverse() };
  } catch (error) {
    return { success: false, message: 'Lỗi: ' + error.message };
  }
}

// ==================== TIỆN ÍCH ====================
function testConnection() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    return { success: true, spreadsheet: ss.getName(), folderName: folder.getName() };
  } catch (error) {
    return { success: false, message: 'Lỗi: ' + error.message };
  }
}
