/**
 * CLINICAL TRIAL RESEARCH TASK MANAGER
 */

// ==================== CẤU HÌNH ====================
const CONFIG = {
  SPREADSHEET_ID: '1dtAC0Y-Do-A7dSQCANnGoHC47BcqhEzohLAmrsNoe4w',
  DATABASE_SHEET: 'DATABASE',
  TASK_SHEET: 'TASK',
  FEEDBACK_SHEET: 'FEEDBACK',
  DRIVE_FOLDER_ID: '1wTVk8hrCYfYhB4l6o31_ArpvRbOdy4OF',
  FEEDBACK_FOLDER_NAME: 'GOP_Y'
};

// Trạng thái công việc dùng chung cho giao diện và sheet
const TASK_STATUSES = ['Chờ xử lý', 'Đang thực hiện', 'Hoàn thành', 'Đã hủy'];
const DEFAULT_TASK_STATUS = 'Đang thực hiện';

// A: Tên viết tắt | B: Mã nghiên cứu | C: Tên công việc | D: Ngày | E: Người giao
// F: Ưu tiên | G: Số lượng | H: Link folder | I: Ghi chú
// J: Trạng thái | K: Lý do hủy | L: Người ký
const TASK_HEADERS = [
  'Tên viết tắt', 'Mã nghiên cứu', 'Tên công việc', 'Ngày', 'Người giao',
  'Ưu tiên', 'Số lượng', 'Link folder', 'Ghi chú',
  'Trạng thái', 'Lý do hủy', 'Người ký'
];

// Danh sách người ký (khớp danh sách trong Google Sheet)
const SIGNERS = ['PGS.Thanh', 'PGS.Toàn', 'PGS.Quế', 'ThS.Vinh'];

// A: Ngày | B: Loại góp ý | C: Màn hình | D: Nghiên cứu | E: Nội dung
// F: Link ảnh | G: Người gửi | H: Liên hệ | I: Trạng thái | J: Ghi chú xử lý
const FEEDBACK_HEADERS = [
  'Ngày', 'Loại góp ý', 'Màn hình', 'Nghiên cứu', 'Nội dung',
  'Link ảnh', 'Người gửi', 'Liên hệ', 'Trạng thái', 'Ghi chú xử lý'
];

// ==================== KHỞI TẠO WEB APP ====================
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Clinical Trial Research Task Manager')
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
    const deptIndex = headers.indexOf('Khoa thực hiện');
    const sponsorIndex = headers.indexOf('Nhà tài trợ');
    if (nameIndex === -1 || abbrIndex === -1 || codeIndex === -1) {
      return { success: false, message: 'Không tìm thấy các cột cần thiết' };
    }

    const pick = (row, idx) => (idx !== -1 ? String(row[idx] || '').trim() : '');

    const researchList = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[nameIndex] || row[abbrIndex] || row[codeIndex]) {
        researchList.push({
          tenNghienCuu: String(row[nameIndex] || '').trim(),
          tenVietTat: String(row[abbrIndex] || '').trim(),
          maNghienCuu: String(row[codeIndex] || '').trim(),
          nghienCuuVienChinh: pick(row, piIndex),
          tinhTrang: pick(row, statusIndex),
          khoa: pick(row, deptIndex),
          nhaTaiTro: pick(row, sponsorIndex)
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
function getTaskSheet_(ss) {
  let taskSheet = ss.getSheetByName(CONFIG.TASK_SHEET);
  if (!taskSheet) {
    taskSheet = ss.insertSheet(CONFIG.TASK_SHEET);
    const headerRange = taskSheet.getRange(1, 1, 1, TASK_HEADERS.length);
    headerRange.setValues([TASK_HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#e3f2fd');
    taskSheet.setFrozenRows(1);
    return taskSheet;
  }

  // Bổ sung các cột mới (J, K, L) cho sheet đã tạo từ phiên bản trước
  if (taskSheet.getLastColumn() < TASK_HEADERS.length) {
    const start = taskSheet.getLastColumn() + 1;
    const missing = TASK_HEADERS.slice(start - 1);
    const range = taskSheet.getRange(1, start, 1, missing.length);
    range.setValues([missing]);
    range.setFontWeight('bold');
    range.setBackground('#e3f2fd');
  }
  return taskSheet;
}

function sanitizeFolderName_(name) {
  return String(name || '').replace(/[\/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
}

function uploadFilesToFolder_(parentFolderId, folderName, files) {
  if (!files || !files.length) return '';
  try {
    const parentFolder = DriveApp.getFolderById(parentFolderId);
    let targetFolder = null;
    const folders = parentFolder.getFolders();
    while (folders.hasNext()) {
      const f = folders.next();
      if (f.getName() === folderName) { targetFolder = f; break; }
    }
    if (!targetFolder) targetFolder = parentFolder.createFolder(folderName);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, file.name);
      targetFolder.createFile(blob);
    }
    return targetFolder.getUrl();
  } catch (driveError) {
    return '(Lỗi upload file)';
  }
}

function createTask(taskData) {
  try {
    const { tenVietTat, taskName, note, documentCount, provider, status, signer, files } = taskData;
    if (!tenVietTat || !taskName) {
      return { success: false, message: 'Vui lòng chọn nghiên cứu và nhập tên công việc' };
    }

    const research = getResearchByAbbreviation(tenVietTat);
    if (!research) return { success: false, message: 'Không tìm thấy nghiên cứu: ' + tenVietTat };

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const taskSheet = getTaskSheet_(ss);

    const folderName = sanitizeFolderName_(research.tenVietTat + '_' + taskName);
    const folderUrl = uploadFilesToFolder_(CONFIG.DRIVE_FOLDER_ID, folderName, files);

    const total = taskSheet.getLastRow();
    const startDateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    const providerName = provider || Session.getActiveUser().getEmail() || 'Không rõ';

    const newRow = [
      research.tenVietTat,          // A: Tên viết tắt
      research.maNghienCuu,         // B: Mã nghiên cứu
      taskName,                     // C: Tên công việc
      startDateStr,                 // D: Ngày
      providerName,                 // E: Người giao
      status || 'Medium',           // F: Ưu tiên
      documentCount || 0,           // G: Số lượng
      folderUrl || '',              // H: Link folder
      note || '',                   // I: Ghi chú
      DEFAULT_TASK_STATUS,          // J: Trạng thái
      '',                           // K: Lý do hủy
      SIGNERS.indexOf(signer) !== -1 ? signer : ''   // L: Người ký
    ];
    taskSheet.appendRow(newRow);

    return {
      success: true,
      message: 'Công việc đã được tạo thành công!',
      data: {
        taskName: taskName,
        project: research.tenNghienCuu,
        maNghienCuu: research.maNghienCuu,
        tenVietTat: research.tenVietTat,
        total: total,
        folderName: folderName,
        folderUrl: folderUrl
      }
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
    const colCount = Math.max(taskSheet.getLastColumn(), TASK_HEADERS.length);
    const data = taskSheet.getRange(2, 1, lastRow - 1, colCount).getValues();

    const tasks = data.map(function (row, index) {
      const rawStatus = String(row[9] || '').trim();
      return {
        stt: index + 1,
        row: index + 2,               // số dòng thật trên sheet
        tenVietTat: row[0],
        maNghienCuu: row[1],
        name: row[2],
        startDate: row[3],
        provider: row[4],
        status: row[5],               // Ưu tiên (Low/Medium/High)
        progress: row[6],             // Số lượng tài liệu
        files: row[7],                // Link folder
        note: row[8],
        taskStatus: TASK_STATUSES.indexOf(rawStatus) !== -1 ? rawStatus : DEFAULT_TASK_STATUS,
        cancelReason: String(row[10] || '').trim(),
        signer: String(row[11] || '').trim()
      };
    });
    return { success: true, data: tasks.reverse() };
  } catch (error) {
    return { success: false, message: 'Lỗi: ' + error.message };
  }
}

function updateTaskStatus(rowNumber, newStatus, cancelReason) {
  try {
    const row = parseInt(rowNumber, 10);
    if (!row || row < 2) return { success: false, message: 'Dòng công việc không hợp lệ' };
    if (TASK_STATUSES.indexOf(newStatus) === -1) {
      return { success: false, message: 'Trạng thái không hợp lệ: ' + newStatus };
    }

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const taskSheet = getTaskSheet_(ss);
    if (row > taskSheet.getLastRow()) return { success: false, message: 'Không tìm thấy công việc' };

    taskSheet.getRange(row, 10).setValue(newStatus);
    taskSheet.getRange(row, 11).setValue(newStatus === 'Đã hủy' ? (cancelReason || '') : '');

    return { success: true, message: 'Đã cập nhật trạng thái', data: { row: row, taskStatus: newStatus } };
  } catch (error) {
    return { success: false, message: 'Lỗi: ' + error.message };
  }
}

// ==================== XỬ LÝ GÓP Ý ====================
function getFeedbackSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.FEEDBACK_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.FEEDBACK_SHEET);
    const headerRange = sheet.getRange(1, 1, 1, FEEDBACK_HEADERS.length);
    headerRange.setValues([FEEDBACK_HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#e8f5e9');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function createFeedback(feedbackData) {
  try {
    const { kind, screen, research, content, sender, contact, files } = feedbackData;
    if (!content || !String(content).trim()) {
      return { success: false, message: 'Vui lòng nhập nội dung góp ý' };
    }

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = getFeedbackSheet_(ss);

    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const folderName = sanitizeFolderName_(CONFIG.FEEDBACK_FOLDER_NAME + '_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMM'));
    const folderUrl = uploadFilesToFolder_(CONFIG.DRIVE_FOLDER_ID, folderName, files);

    sheet.appendRow([
      dateStr,                        // A: Ngày
      kind || 'Khác',                 // B: Loại góp ý
      screen || '',                   // C: Màn hình
      research || '',                 // D: Nghiên cứu
      String(content).trim(),         // E: Nội dung
      folderUrl || '',                // F: Link ảnh
      sender || '',                   // G: Người gửi
      contact || '',                  // H: Liên hệ
      'Mới',                          // I: Trạng thái
      ''                              // J: Ghi chú xử lý
    ]);

    return { success: true, message: 'Cảm ơn bạn, góp ý đã được ghi nhận!' };
  } catch (error) {
    return { success: false, message: 'Lỗi: ' + error.message };
  }
}

function getFeedbackList() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.FEEDBACK_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [] };

    const lastRow = sheet.getLastRow();
    const colCount = Math.max(sheet.getLastColumn(), FEEDBACK_HEADERS.length);
    const data = sheet.getRange(2, 1, lastRow - 1, colCount).getValues();

    const items = data.map(function (row, index) {
      let dateStr = row[0];
      if (dateStr instanceof Date) {
        dateStr = Utilities.formatDate(dateStr, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
      }
      return {
        row: index + 2,
        date: String(dateStr || ''),
        kind: String(row[1] || ''),
        screen: String(row[2] || ''),
        research: String(row[3] || ''),
        content: String(row[4] || ''),
        imageUrl: String(row[5] || ''),
        sender: String(row[6] || ''),
        contact: String(row[7] || ''),
        status: String(row[8] || 'Mới'),
        handledNote: String(row[9] || '')
      };
    });
    return { success: true, data: items.reverse() };
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
