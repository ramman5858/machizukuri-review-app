const STATE_SHEET_NAME = "State";
const SCORES_SHEET_NAME = "Scores";
const PASSCODE_PROPERTY_NAME = "REVIEW_PASSCODE";

const DIVISIONS = {
  start: "スタート部門",
  general: "一般部門",
  collab: "団体連携部門"
};

const DEFAULT_CRITERIA = {
  start: ["公益性", "実現性", "発展性", "将来性", "事業費"],
  general: ["公益性", "協働性", "実現性", "発展性", "創造性", "費用対効果"],
  collab: ["公益性", "協働性", "実現性", "発展性", "創造性", "費用対効果"]
};

function doGet(e) {
  const callback = e && e.parameter ? e.parameter.callback : "";
  const authError = validatePasscode_(e && e.parameter ? e.parameter.passcode : "");
  if (authError) {
    return respond_(callback, { error: authError });
  }

  const state = readState_();
  return respond_(callback, state);
}

function doPost(e) {
  const authError = validatePasscode_(e && e.parameter ? e.parameter.passcode : "");
  if (authError) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: authError }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = e.parameter.payload || (e.postData ? e.postData.contents : "{}");
    const state = normalizeState_(JSON.parse(payload || "{}"));
    writeState_(state);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function respond_(callback, data) {
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(data)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function validatePasscode_(inputPasscode) {
  const savedPasscode = PropertiesService.getScriptProperties().getProperty(PASSCODE_PROPERTY_NAME);
  if (!savedPasscode) return "Apps Script側のパスコードが未設定です。";
  if (String(inputPasscode || "") !== savedPasscode) return "パスコードが違います。";
  return "";
}

function setReviewPasscode() {
  PropertiesService.getScriptProperties().setProperty(PASSCODE_PROPERTY_NAME, "ここに本番用パスコードを入れる");
}

function defaultState_() {
  return {
    judges: ["審査員1", "審査員2", "審査員3", "審査員4", "審査員5"],
    criteria: JSON.parse(JSON.stringify(DEFAULT_CRITERIA)),
    groups: Array.from({ length: 17 }, (_, i) => ({
      id: `group-${i + 1}`,
      name: `団体${i + 1}`,
      division: i < 6 ? "start" : i < 12 ? "general" : "collab"
    })),
    scores: {},
    memos: {}
  };
}

function normalizeState_(rawState) {
  const fallback = defaultState_();
  const source = rawState && typeof rawState === "object" ? rawState : {};

  return {
    judges: Array.isArray(source.judges) && source.judges.length ? source.judges : fallback.judges,
    criteria: Object.assign({}, fallback.criteria, source.criteria || {}),
    groups: Array.isArray(source.groups) && source.groups.length ? source.groups : fallback.groups,
    scores: source.scores && typeof source.scores === "object" ? source.scores : {},
    memos: source.memos && typeof source.memos === "object" ? source.memos : {}
  };
}

function readState_() {
  const sheet = getOrCreateSheet_(STATE_SHEET_NAME);
  const raw = sheet.getRange("A1").getValue();
  if (!raw) {
    const initialState = defaultState_();
    writeState_(initialState);
    return initialState;
  }

  try {
    return normalizeState_(JSON.parse(raw));
  } catch (error) {
    return defaultState_();
  }
}

function writeState_(state) {
  const normalized = normalizeState_(state);
  const sheet = getOrCreateSheet_(STATE_SHEET_NAME);
  sheet.clear();
  sheet.getRange("A1").setValue(JSON.stringify(normalized));
  sheet.getRange("B1").setValue(new Date());
  rebuildScoresSheet_(normalized);
}

function rebuildScoresSheet_(state) {
  const sheet = getOrCreateSheet_(SCORES_SHEET_NAME);
  const header = [
    "updated_at",
    "judge",
    "group_id",
    "group_name",
    "division",
    "score_1",
    "score_2",
    "score_3",
    "score_4",
    "score_5",
    "score_6",
    "total",
    "memo"
  ];

  const rows = [];
  const updatedAt = new Date();

  state.groups.forEach((group) => {
    state.judges.forEach((judge) => {
      const key = `${group.id}::${judge}`;
      const scores = state.scores[key] || [];
      const memo = state.memos[key] || "";
      if (!scores.length && !memo) return;

      const filledScores = Array.from({ length: 6 }, (_, i) => scores[i] || "");
      const total = scores.reduce((sum, score) => sum + Number(score || 0), 0);
      rows.push([
        updatedAt,
        judge,
        group.id,
        group.name,
        DIVISIONS[group.division] || group.division,
        ...filledScores,
        total,
        memo
      ]);
    });
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
}

function getOrCreateSheet_(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}
