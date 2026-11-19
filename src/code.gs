/**
 * CLINICAL TRIAL RESEARCH TASK MANAGER
 */

// ==================== CẤU HÌNH ====================
const CONFIG = {
  SPREADSHEET_ID: '1dtAC0Y-Do-A7dSQCANnGoHC47BcqhEzohLAmrsNoe4w',
  DATABASE_SHEET: 'DATABASE',
  TASK_SHEET: 'TASK',
  FEEDBACK_SHEET: 'FEEDBACK',
  GCP_SHEET: 'GCP',
  INDEX_SHEET: 'Index',
  DRIVE_FOLDER_ID: '1wTVk8hrCYfYhB4l6o31_ArpvRbOdy4OF',
  FEEDBACK_FOLDER_NAME: 'GOP_Y',
  GCP_FOLDER_NAME: 'CHUNG_CHI_GCP'
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

  // Nới lưới nếu sheet hẹp hơn số cột cần dùng
  if (taskSheet.getMaxColumns() < TASK_HEADERS.length) {
    taskSheet.insertColumnsAfter(taskSheet.getMaxColumns(), TASK_HEADERS.length - taskSheet.getMaxColumns());
  }

  // Bổ sung tiêu đề các cột mới (J, K, L) cho sheet đã tạo từ phiên bản trước
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
    if (!taskSheet) {
      return { success: false, message: 'Không tìm thấy sheet "' + CONFIG.TASK_SHEET + '"' };
    }

    const lastRow = taskSheet.getLastRow();
    if (lastRow < 2) return { success: true, data: [], total: 0 };

    // Chỉ đọc trong phạm vi lưới thật của sheet (sheet cũ có thể hẹp hơn 12 cột)
    const colCount = Math.min(
      Math.max(taskSheet.getLastColumn(), TASK_HEADERS.length),
      taskSheet.getMaxColumns()
    );
    const data = taskSheet.getRange(2, 1, lastRow - 1, colCount).getValues();
    const tz = Session.getScriptTimeZone();

    const tasks = [];
    data.forEach(function (row, index) {
      const abbr = String(row[0] == null ? '' : row[0]).trim();
      const name = String(row[2] == null ? '' : row[2]).trim();
      if (!abbr && !name) return; // bỏ qua dòng trống

      let startDate = row[3];
      if (startDate instanceof Date) {
        startDate = Utilities.formatDate(startDate, tz, 'dd/MM/yyyy');
      } else {
        startDate = String(startDate == null ? '' : startDate).trim();
      }

      const rawStatus = String(row[9] == null ? '' : row[9]).trim();

      tasks.push({
        stt: index + 1,
        row: index + 2,               // số dòng thật trên sheet
        tenVietTat: abbr,
        maNghienCuu: String(row[1] == null ? '' : row[1]).trim(),
        name: name,
        startDate: startDate,
        provider: String(row[4] == null ? '' : row[4]).trim(),
        status: String(row[5] == null ? '' : row[5]).trim(),   // Ưu tiên (Low/Medium/High)
        progress: row[6] == null ? '' : row[6],                // Số lượng tài liệu
        // Link folder chỉ lưu ở cột H của sheet, không gửi xuống trình duyệt (bảo mật)
        hasFiles: String(row[7] == null ? '' : row[7]).trim() !== '',
        note: String(row[8] == null ? '' : row[8]).trim(),
        taskStatus: TASK_STATUSES.indexOf(rawStatus) !== -1 ? rawStatus : DEFAULT_TASK_STATUS,
        cancelReason: String(row[10] == null ? '' : row[10]).trim(),
        signer: String(row[11] == null ? '' : row[11]).trim()
      });
    });

    tasks.reverse();
    return { success: true, data: tasks, total: tasks.length };
  } catch (error) {
    return { success: false, message: 'Lỗi khi đọc sheet TASK: ' + error.message };
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

// ==================== CHI TIẾT NGHIÊN CỨU (sheet DATABASE) ====================
// Các cột định danh: chỉ đọc trên giao diện, muốn sửa thì sửa thẳng trên sheet
const DB_READONLY_FIELDS = [
  'Tên nghiên cứu', 'Tên viết tắt', 'Mã nghiên cứu',
  'Nghiên cứu viên chính', 'Khoa thực hiện', 'Nhà tài trợ'
];

function normalizeHeader_(h) {
  return String(h == null ? '' : h).replace(/\s+/g, ' ').trim();
}

function cellToString_(value, tz) {
  if (value == null) return '';
  if (value instanceof Date) return Utilities.formatDate(value, tz, 'dd/MM/yyyy');
  if (value === true) return 'TRUE';
  if (value === false) return 'FALSE';
  return String(value).trim();
}

/**
 * Đọc toàn bộ thông tin một nghiên cứu từ sheet DATABASE.
 * key: tên viết tắt hoặc mã nghiên cứu.
 */
function getResearchDetail(key) {
  try {
    const needle = String(key || '').trim().toLowerCase();
    if (!needle) return { success: false, message: 'Chưa chọn nghiên cứu' };

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const dbSheet = ss.getSheetByName(CONFIG.DATABASE_SHEET);
    if (!dbSheet) return { success: false, message: 'Không tìm thấy sheet "' + CONFIG.DATABASE_SHEET + '"' };

    const lastRow = dbSheet.getLastRow();
    const lastCol = dbSheet.getLastColumn();
    if (lastRow < 2) return { success: false, message: 'Sheet DATABASE chưa có dữ liệu' };

    const data = dbSheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = data[0].map(normalizeHeader_);
    const abbrIdx = headers.indexOf('Tên viết tắt');
    const codeIdx = headers.indexOf('Mã nghiên cứu');
    const tz = Session.getScriptTimeZone();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const abbr = abbrIdx !== -1 ? cellToString_(row[abbrIdx], tz) : '';
      const code = codeIdx !== -1 ? cellToString_(row[codeIdx], tz) : '';
      if (abbr.toLowerCase() === needle || code.toLowerCase() === needle) {
        const values = {};
        headers.forEach(function (h, idx) {
          if (h) values[h] = cellToString_(row[idx], tz);
        });
        return {
          success: true,
          data: {
            row: i + 1,
            abbr: abbr,
            code: code,
            headers: headers.filter(function (h) { return !!h; }),
            readonlyFields: DB_READONLY_FIELDS,
            values: values
          }
        };
      }
    }
    return { success: false, message: 'Không tìm thấy nghiên cứu: ' + key };
  } catch (error) {
    return { success: false, message: 'Lỗi khi đọc sheet DATABASE: ' + error.message };
  }
}

/**
 * Ghi cập nhật định kỳ thẳng vào dòng tương ứng của sheet DATABASE.
 * payload = { row, abbr, values: { '<tên cột>': '<giá trị>' } }
 */
function updateResearch(payload) {
  try {
    const row = parseInt(payload && payload.row, 10);
    const values = (payload && payload.values) || {};
    if (!row || row < 2) return { success: false, message: 'Dòng nghiên cứu không hợp lệ' };

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const dbSheet = ss.getSheetByName(CONFIG.DATABASE_SHEET);
    if (!dbSheet) return { success: false, message: 'Không tìm thấy sheet "' + CONFIG.DATABASE_SHEET + '"' };
    if (row > dbSheet.getLastRow()) return { success: false, message: 'Không tìm thấy dòng nghiên cứu' };

    const lastCol = dbSheet.getLastColumn();
    const headers = dbSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(normalizeHeader_);
    const abbrIdx = headers.indexOf('Tên viết tắt');

    // Kiểm tra đúng dòng trước khi ghi, tránh ghi nhầm khi sheet bị chèn/xóa dòng
    const current = dbSheet.getRange(row, 1, 1, lastCol).getValues()[0];
    if (payload.abbr && abbrIdx !== -1) {
      const currentAbbr = normalizeHeader_(current[abbrIdx]);
      if (currentAbbr !== normalizeHeader_(payload.abbr)) {
        return {
          success: false,
          message: 'Dòng ' + row + ' hiện là "' + currentAbbr + '" chứ không phải "' + payload.abbr +
                   '". Sheet có thể vừa thay đổi, hãy tải lại trang rồi cập nhật lại.'
        };
      }
    }

    const updated = [];
    const skipped = [];
    Object.keys(values).forEach(function (key) {
      const header = normalizeHeader_(key);
      if (DB_READONLY_FIELDS.indexOf(header) !== -1) { skipped.push(header); return; }
      const idx = headers.indexOf(header);
      if (idx === -1) { skipped.push(header); return; }
      const newValue = values[key] == null ? '' : values[key];
      if (cellToString_(current[idx], Session.getScriptTimeZone()) !== String(newValue).trim()) {
        current[idx] = newValue;
        updated.push(header);
      }
    });

    if (updated.length) {
      dbSheet.getRange(row, 1, 1, lastCol).setValues([current]);
    }

    return {
      success: true,
      message: updated.length
        ? 'Đã cập nhật ' + updated.length + ' trường vào sheet DATABASE'
        : 'Không có trường nào thay đổi',
      data: { row: row, updated: updated, skipped: skipped }
    };
  } catch (error) {
    return { success: false, message: 'Lỗi khi ghi sheet DATABASE: ' + error.message };
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
        hasImage: String(row[5] || '').trim() !== '',   // link ảnh chỉ nằm trong sheet
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
// ==================== CHỨNG CHỈ GCP ====================
// Sheet GCP: STT | Họ và tên | Khoa | Ngày cấp chứng chỉ | Ngày hết hạn dự kiến
//            | Link chứng chỉ | Tình trạng
// Vị trí cột được dò theo tiêu đề ở dòng 1, nên thêm/bớt cột trong sheet
// không làm hỏng giao diện.
const GCP_COL_ALIASES = {
  stt: ['stt'],
  name: ['ho va ten', 'ho ten', 'ten'],
  khoa: ['khoa', 'khoa lam viec'],
  cap: ['ngay cap chung chi', 'ngay cap'],
  han: ['ngay het han du kien', 'ngay het han'],
  link: ['link chung chi', 'link'],
  status: ['tinh trang']
};

const GCP_VALID_MONTHS = 36;   // chứng chỉ có hiệu lực 3 năm kể từ ngày cấp
const GCP_SOON_DAYS = 90;      // dưới 90 ngày thì coi là sắp hết hạn

function gcpNormKey_(value) {
  return String(value == null ? '' : value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function gcpColumns_(headers) {
  const keys = Object.keys(GCP_COL_ALIASES);
  const cols = {};
  for (let i = 0; i < headers.length; i++) {
    const key = gcpNormKey_(headers[i]);
    if (!key) continue;
    for (let k = 0; k < keys.length; k++) {
      const field = keys[k];
      if (cols[field] === undefined && GCP_COL_ALIASES[field].indexOf(key) >= 0) cols[field] = i;
    }
  }
  const missing = keys.filter(function (k) { return cols[k] === undefined; });
  if (missing.length) return { ok: false, missing: missing };

  let width = headers.length;
  keys.forEach(function (k) { if (cols[k] + 1 > width) width = cols[k] + 1; });
  return { ok: true, cols: cols, width: width };
}

function gcpToDate_(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const text = String(value == null ? '' : value).trim();
  const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(text);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return dt;
}

function gcpAddMonths_(date, months) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function gcpToday_() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function gcpStatus_(han) {
  if (!han) return { key: 'unknown', label: 'Chưa rõ hạn', days: null };
  const days = Math.round((han.getTime() - gcpToday_().getTime()) / 86400000);
  if (days < 0) return { key: 'expired', label: 'Đã hết hạn', days: days };
  if (days <= GCP_SOON_DAYS) return { key: 'soon', label: 'Sắp hết hạn', days: days };
  return { key: 'valid', label: 'Còn hạn', days: days };
}

function getKhoaList_(ss) {
  try {
    const sheet = ss.getSheetByName(CONFIG.INDEX_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    const seen = {};
    const list = [];
    for (let i = 0; i < values.length; i++) {
      const name = normalizeHeader_(values[i][0]);
      if (name && !seen[name]) { seen[name] = true; list.push(name); }
    }
    return list;
  } catch (error) {
    return [];
  }
}

/**
 * Danh sách chứng chỉ GCP để tra cứu.
 * Không trả link bản scan ra giao diện vì web app mở công khai —
 * link chỉ nằm trong sheet (cột "Link chứng chỉ").
 */
function getGcpList() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const tz = ss.getSpreadsheetTimeZone();
    const sheet = ss.getSheetByName(CONFIG.GCP_SHEET);
    if (!sheet) {
      return { success: false, message: 'Không tìm thấy sheet "' + CONFIG.GCP_SHEET + '"' };
    }

    const khoaList = getKhoaList_(ss);
    const lastRow = sheet.getLastRow();
    const counts = { total: 0, valid: 0, soon: 0, expired: 0 };
    if (lastRow < 2) return { success: true, data: [], counts: counts, khoaList: khoaList };

    const values = sheet.getRange(1, 1, lastRow, Math.max(sheet.getLastColumn(), 1)).getValues();
    const map = gcpColumns_(values[0]);
    if (!map.ok) {
      return {
        success: false,
        message: 'Sheet GCP thiếu cột: ' + map.missing.join(', ') + '. Kiểm tra dòng tiêu đề của sheet.'
      };
    }

    const cols = map.cols;
    const items = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const name = normalizeHeader_(row[cols.name]);
      if (!name) continue;

      const cap = gcpToDate_(row[cols.cap]);
      let han = gcpToDate_(row[cols.han]);
      if (!han && cap) han = gcpAddMonths_(cap, GCP_VALID_MONTHS);
      const status = gcpStatus_(han);

      counts.total++;
      if (status.key === 'expired') counts.expired++;
      else if (status.key === 'soon') counts.soon++;
      else if (status.key === 'valid') counts.valid++;

      items.push({
        row: i + 1,
        stt: cellToString_(row[cols.stt], tz),
        name: name,
        khoa: normalizeHeader_(row[cols.khoa]),
        cap: cap ? Utilities.formatDate(cap, tz, 'dd/MM/yyyy') : cellToString_(row[cols.cap], tz),
        han: han ? Utilities.formatDate(han, tz, 'dd/MM/yyyy') : '',
        status: status.label,
        statusKey: status.key,
        days: status.days,
        link: cellToString_(row[cols.link], tz),
        hasScan: cellToString_(row[cols.link], tz) !== ''
      });
    }

    return { success: true, data: items, counts: counts, khoaList: khoaList };
  } catch (error) {
    return { success: false, message: 'Lỗi: ' + error.message };
  }
}

function uploadCertificateFile_(file, baseName) {
  const parentFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  let targetFolder = null;
  const folders = parentFolder.getFolders();
  while (folders.hasNext()) {
    const f = folders.next();
    if (f.getName() === CONFIG.GCP_FOLDER_NAME) { targetFolder = f; break; }
  }
  if (!targetFolder) targetFolder = parentFolder.createFolder(CONFIG.GCP_FOLDER_NAME);

  const parts = String(file.name || '').split('.');
  const ext = parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, baseName + ext);
  return targetFolder.createFile(blob).getUrl();
}

/**
 * Ghi một chứng chỉ GCP mới vào sheet GCP và tải bản scan lên Drive.
 * payload: { name, khoa, capDate (yyyy-MM-dd), files: [{ name, type, data }] }
 */
function createGcpCertificate(payload) {
  try {
    const data = payload || {};
    const name = sanitizeFolderName_(data.name);
    const khoa = normalizeHeader_(data.khoa);
    const capText = String(data.capDate || '').trim();
    const files = data.files || [];

    if (!name) return { success: false, message: 'Vui lòng nhập họ và tên người được cấp chứng chỉ' };
    if (!khoa) return { success: false, message: 'Vui lòng chọn khoa làm việc' };

    const parts = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(capText);
    if (!parts) return { success: false, message: 'Vui lòng chọn ngày được cấp chứng chỉ' };
    const cap = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    if (cap.getTime() > gcpToday_().getTime()) {
      return { success: false, message: 'Ngày cấp chứng chỉ không thể ở tương lai' };
    }
    if (!files.length) return { success: false, message: 'Vui lòng tải lên bản scan chứng chỉ' };

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const tz = ss.getSpreadsheetTimeZone();
    const sheet = ss.getSheetByName(CONFIG.GCP_SHEET);
    if (!sheet) return { success: false, message: 'Không tìm thấy sheet "' + CONFIG.GCP_SHEET + '"' };

    const lastRow = sheet.getLastRow();
    const headerWidth = Math.max(sheet.getLastColumn(), 1);
    const map = gcpColumns_(sheet.getRange(1, 1, 1, headerWidth).getValues()[0]);
    if (!map.ok) {
      return { success: false, message: 'Sheet GCP thiếu cột: ' + map.missing.join(', ') };
    }
    const cols = map.cols;

    // Số thứ tự kế tiếp
    let nextStt = 1;
    if (lastRow > 1) {
      const sttValues = sheet.getRange(2, cols.stt + 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < sttValues.length; i++) {
        const n = parseInt(sttValues[i][0], 10);
        if (!isNaN(n) && n >= nextStt) nextStt = n + 1;
      }
    }

    const han = gcpAddMonths_(cap, GCP_VALID_MONTHS);
    const status = gcpStatus_(han);

    let link = '';
    try {
      link = uploadCertificateFile_(files[0], sanitizeFolderName_(name + '_' + khoa));
    } catch (driveError) {
      return { success: false, message: 'Không tải được bản scan lên Drive: ' + driveError.message };
    }

    const rowValues = [];
    for (let i = 0; i < map.width; i++) rowValues.push('');
    rowValues[cols.stt] = nextStt;
    rowValues[cols.name] = name;
    rowValues[cols.khoa] = khoa;
    rowValues[cols.cap] = cap;
    rowValues[cols.han] = han;
    rowValues[cols.link] = link;
    rowValues[cols.status] = status.label;

    try {
      sheet.appendRow(rowValues);
    } catch (sheetError) {
      return {
        success: false,
        message: 'Bản scan đã lên Drive nhưng chưa ghi được dòng vào sheet: ' + sheetError.message
      };
    }

    return {
      success: true,
      message: 'Đã ghi chứng chỉ của ' + name + ' vào sổ',
      data: {
        name: name,
        khoa: khoa,
        cap: Utilities.formatDate(cap, tz, 'dd/MM/yyyy'),
        han: Utilities.formatDate(han, tz, 'dd/MM/yyyy'),
        status: status.label
      }
    };
  } catch (error) {
    return { success: false, message: 'Lỗi: ' + error.message };
  }
}

function testConnection() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    return { success: true, spreadsheet: ss.getName(), folderName: folder.getName() };
  } catch (error) {
    return { success: false, message: 'Lỗi: ' + error.message };
  }
}
