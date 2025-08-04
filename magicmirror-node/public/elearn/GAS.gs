const SHEET_PREFIX = 'EL_';

function doGet(e) {
  if (e.parameter.email) {
    return getUserByEmail(e.parameter.email);
  }

  const tab = e.parameter.tab;
  if (!tab || !tab.startsWith(SHEET_PREFIX)) {
    return ContentService.createTextOutput('❌ Invalid or missing tab').setMimeType(ContentService.MimeType.TEXT);
  }
  const uid = e.parameter.uid;

  const sheet = SpreadsheetApp.getActive().getSheetByName(tab);
  if (!sheet) {
    return ContentService.createTextOutput('❌ Tab not found').setMimeType(ContentService.MimeType.TEXT);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const json = data.map(row => {
    const obj = {};
    headers.forEach((key, i) => obj[key] = row[i]);
    return obj;
  });

  let filteredData = json;
  if (uid) {
    const uidKey = headers.find(h => h.toLowerCase().includes('uid'));
    if (uidKey) {
      filteredData = json.filter(row => row[uidKey] === uid);
    }
  }

  return ContentService.createTextOutput(JSON.stringify(filteredData)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const tab = e.parameter.tab;
    const action = e.parameter.action;

    if (action !== 'mirrorData' && action !== 'mirrorAllData' && (!tab || !tab.startsWith(SHEET_PREFIX))) {
      const response = ContentService.createTextOutput('❌ Invalid or missing tab');
      response.setMimeType(ContentService.MimeType.TEXT);
      return response;
    }

    if (action === 'syncProgress') {
      const payloadArray = JSON.parse(e.postData.contents); // array of progress data
      const result = writeBatchToSheet(tab, payloadArray);
      const response = ContentService.createTextOutput(JSON.stringify({ status: '✅ Synced', result }));
      response.setMimeType(ContentService.MimeType.JSON);
      return response;
    }

    if (action === 'selesaikanLesson') {
      const payload = JSON.parse(e.postData.contents);
      const result = simpanLessonSelesai(payload);
      const response = ContentService.createTextOutput(JSON.stringify({ status: '✅ Lesson selesai', result }));
      response.setMimeType(ContentService.MimeType.JSON);
      return response;
    }

    if (action === 'mirrorData') {
      const payload = JSON.parse(e.postData.contents);
      if (!payload.tab || !payload.data || !Array.isArray(payload.data)) {
        const response = ContentService.createTextOutput('❌ Invalid payload for mirrorData');
        response.setMimeType(ContentService.MimeType.TEXT);
        return response;
      }
      const result = mirrorToSheet(payload.tab, payload.data);
      const response = ContentService.createTextOutput(JSON.stringify({ status: '✅ Data mirrored', result }));
      response.setMimeType(ContentService.MimeType.JSON);
      return response;
    }

    if (action === 'mirrorAllData') {
      const payload = JSON.parse(e.postData.contents);
      if (!payload.datasets || !Array.isArray(payload.datasets)) {
        const response = ContentService.createTextOutput('❌ Invalid payload for mirrorAllData');
        response.setMimeType(ContentService.MimeType.TEXT);
        return response;
      }
      const results = payload.datasets.map(dataset => {
        if (!dataset.tab || !dataset.data || !Array.isArray(dataset.data)) {
          return { tab: dataset.tab || null, status: '❌ Invalid dataset format' };
        }
        try {
          const res = mirrorToSheet(dataset.tab, dataset.data);
          return { tab: dataset.tab, status: '✅ Data mirrored', result: res };
        } catch (error) {
          return { tab: dataset.tab, status: `❌ Error: ${error.message}` };
        }
      });
      const response = ContentService.createTextOutput(JSON.stringify(results));
      response.setMimeType(ContentService.MimeType.JSON);
      return response;
    }

    const payload = JSON.parse(e.postData.contents);
    const result = writeToSheet(tab, payload);
    const response = ContentService.createTextOutput(JSON.stringify({ status: '✅ Success', result }));
    response.setMimeType(ContentService.MimeType.JSON);
    return response;
  } catch (err) {
    const response = ContentService.createTextOutput('❌ Error: ' + err.message);
    response.setMimeType(ContentService.MimeType.TEXT);
    return response;
  }
}

function writeToSheet(tab, payload) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(tab);
  if (!sheet) {
    sheet = ss.insertSheet(tab);
  }

  let headers = [];
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    headers = Object.keys(payload);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  const newRow = headers.map(key => payload[key] || '');

  sheet.appendRow(newRow);
  return newRow;
}

function getUserByEmail(email) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('EL_MASTER_USER');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailIndex = headers.findIndex(h => h.toLowerCase().trim() === 'email');

  if (emailIndex === -1) {
    return ContentService.createTextOutput('❌ Kolom Email tidak ditemukan').setMimeType(ContentService.MimeType.TEXT);
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailIndex] && data[i][emailIndex].toLowerCase().trim() === email.toLowerCase().trim()) {
      const userData = {};
      headers.forEach((key, j) => {
        userData[key.trim()] = data[i][j];
      });
      return ContentService.createTextOutput(JSON.stringify(userData)).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput('❌ User not found').setMimeType(ContentService.MimeType.TEXT);
}

function writeBatchToSheet(tab, payloadArray) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(tab);
  if (!sheet) {
    sheet = ss.insertSheet(tab);
  }

  let headers = [];
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    headers = Object.keys(payloadArray[0]);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  const rows = payloadArray.map(data => headers.map(key => data[key] || ''));

  payloadArray.forEach(data => {
    if (data['cid'] && data['modul_id'] && data['step']) {
      updateStepTerakhir(data['cid'], data['modul_id'], parseInt(data['step']));
    }
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  return `${rows.length} rows added`;
}

function updateStepTerakhir(cid, modul_id, step) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('EL_PROGRESS_MURID');
  if (!sheet) {
    sheet = ss.insertSheet('EL_PROGRESS_MURID');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const cidIndex = lowerHeaders.indexOf('cid');
  const modulIndex = lowerHeaders.indexOf('modul_id');
  const stepIndex = lowerHeaders.indexOf('step_terakhir');

  if (cidIndex === -1 || modulIndex === -1 || stepIndex === -1) {
    throw new Error('Required columns not found in EL_PROGRESS_MURID');
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][cidIndex] === cid && data[i][modulIndex] === modul_id) {
      // Update step_terakhir jika step baru lebih besar
      const currentStep = parseInt(data[i][stepIndex], 10) || 0;
      if (step > currentStep) {
        sheet.getRange(i + 1, stepIndex + 1).setValue(step);
      }
      return;
    }
  }

  // Jika belum ada baris progress untuk modul ini, buat baru
  const newRow = [];
  newRow[headers.indexOf('Timestamp')] = new Date();
  newRow[cidIndex] = cid;
  newRow[modulIndex] = modul_id;
  newRow[stepIndex] = step;
  sheet.appendRow(headers.map((h, i) => newRow[i] || ''));
}

function simpanLessonSelesai(payload) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('EL_LESSON_LOG');
  if (!sheet) {
    sheet = ss.insertSheet('EL_LESSON_LOG');
  }

  let headers = [];
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    headers = Object.keys(payload);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  const newRow = headers.map(key => {
    if (key === 'Timestamp') return new Date();
    return payload[key] || '';
  });

  sheet.appendRow(newRow);
  return newRow;
}

function mirrorToSheet(tab, dataArray) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(tab);
  if (!sheet) {
    sheet = ss.insertSheet(tab);
  }

  // Clear all contents
  sheet.clearContents();

  if (dataArray.length === 0) return 'No data to write';

  let headers = [];
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    headers = Object.keys(dataArray[0]);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  // Get headers from keys of first object if headers empty after clearContents
  if (headers.length === 0) {
    headers = Object.keys(dataArray[0]);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // Prepare rows
  const rows = dataArray.map(item => headers.map(key => item[key] || ''));

  // Write data rows
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  return `${rows.length} rows mirrored to ${tab}`;
}
