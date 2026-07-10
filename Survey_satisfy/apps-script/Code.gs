const ROOT_FOLDER_NAME = "만족도조사_통합플랫폼";

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload || {};

    if (action === "createProjectRound") {
      return jsonResponse({ ok: true, result: createProjectRound(payload.project, payload.surveyId, payload.questions || []) });
    }

    if (action === "submitResponse") {
      return jsonResponse({ ok: true, result: submitResponse(payload.response, payload.project, payload.questions || []) });
    }

    if (action === "findResponse") {
      return jsonResponse({ ok: true, result: findResponse(payload.surveyId, payload.phoneLast4) });
    }

    if (action === "generateReport") {
      return jsonResponse({ ok: true, result: generateReport(payload.projectId, payload.reportType) });
    }

    if (action === "getDashboardData") {
      return jsonResponse({ ok: true, result: getDashboardData(payload.surveyId) });
    }

    return jsonResponse({ ok: false, error: "Unknown action: " + action });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function createProjectRound(project, surveyId, questions) {
  ensureMasterWorkbook(project, questions);
  const folder = ensureProjectFolder(project);
  const sheetName = buildResponseSheetName(project);
  const files = folder.getFilesByName(sheetName);

  if (files.hasNext()) {
    const existing = files.next();
    const spreadsheet = SpreadsheetApp.openById(existing.getId());
    ensureWorkbook(spreadsheet, project, questions);
    upsertIndex(surveyId || project.id, existing.getId(), existing.getUrl());
    return {
      folderPath: buildDrivePath(project),
      sheetId: existing.getId(),
      sheetUrl: existing.getUrl(),
    };
  }

  const spreadsheet = SpreadsheetApp.create(sheetName);
  const file = DriveApp.getFileById(spreadsheet.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  const sheet = spreadsheet.getActiveSheet();
  sheet.setName("응답원본");
  sheet.appendRow(buildResponseHeaders());
  ensureWorkbook(spreadsheet, project, questions);
  upsertIndex(surveyId || project.id, spreadsheet.getId(), spreadsheet.getUrl());

  return {
    folderPath: buildDrivePath(project),
    sheetId: spreadsheet.getId(),
    sheetUrl: spreadsheet.getUrl(),
  };
}

function submitResponse(response, project, questions) {
  const indexSheet = getOrCreateIndexSheet();
  const row = findIndexRow(indexSheet, response.surveyId);

  if (!row) {
    throw new Error("surveyId에 연결된 응답 Sheet가 없습니다. 먼저 createProjectRound를 실행하세요.");
  }

  const sheetId = indexSheet.getRange(row, 2).getValue();
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  ensureWorkbook(spreadsheet, project, questions);
  const sheet = spreadsheet.getSheetByName("응답원본");
  ensureResponseHeader(sheet);
  const values = sheet.getDataRange().getValues();
  const existingRowIndex = values.findIndex((item, index) => index > 0 && item[0] === response.surveyId && String(item[1]) === String(response.phoneLast4));
  const rowData = buildResponseRow(response);

  if (existingRowIndex >= 0) {
    sheet.getRange(existingRowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
    upsertOpinion(spreadsheet, response);
    upsertActionItems(spreadsheet, response, questions, project);
    updateSummary(spreadsheet, project);
    return { updated: true, submittedAt: response.submittedAt };
  }

  sheet.appendRow(rowData);
  upsertOpinion(spreadsheet, response);
  upsertActionItems(spreadsheet, response, questions, project);
  updateSummary(spreadsheet, project);
  return { updated: false, submittedAt: response.submittedAt };
}

function findResponse(surveyId, phoneLast4) {
  const indexSheet = getOrCreateIndexSheet();
  const row = findIndexRow(indexSheet, surveyId);

  if (!row) {
    return { exists: false };
  }

  const sheetId = indexSheet.getRange(row, 2).getValue();
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet = spreadsheet.getSheetByName("응답원본");
  ensureResponseHeader(sheet);
  const values = sheet.getDataRange().getValues();
  const rowData = values.find((item, index) => index > 0 && item[0] === surveyId && String(item[1]) === String(phoneLast4));

  if (!rowData) {
    return { exists: false };
  }

  return {
    exists: true,
    response: {
      surveyId: rowData[0],
      phoneLast4: rowData[1],
      submittedAt: rowData[2],
      answers: JSON.parse(rowData[rowData.length - 1] || "[]"),
    },
  };
}

function generateReport(projectId, reportType) {
  const context = getReportContext(projectId);
  const spreadsheet = context.spreadsheet;
  const folder = context.folder;
  const project = readProjectInfo(spreadsheet);
  const summaryRows = readSheetRows(spreadsheet, "집계결과");
  const questionRows = readSheetRows(spreadsheet, "문항정보");
  const opinionRows = readSheetRows(spreadsheet, "주관식의견").slice(0, 20);
  const actionRows = readSheetRows(spreadsheet, "개선과제").slice(0, 30);
  const responseRows = readSheetRows(spreadsheet, "응답원본");
  const reportLabel = reportType === "official" ? "공식 보고용" : "내부 분석용";
  const fileName = buildReportFileName(project, reportLabel);
  const doc = DocumentApp.create(fileName);
  const body = doc.getBody();

  body.clear();
  body.appendParagraph(reportLabel + " 만족도 조사 결과보고서").setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph("생성일시: " + formatKoreanDate(new Date().toISOString()));
  body.appendParagraph("");

  appendSection(body, "1. 사업 개요");
  appendKeyValueTable(body, [
    ["연도", project.year || ""],
    ["본부", project.division || ""],
    ["사업", project.business || ""],
    ["세부사업", project.subBusiness || ""],
    ["회차", project.round ? project.round + "회차" : ""],
    ["사업유형", project.type || ""],
    ["담당자", project.manager || ""],
  ]);

  appendSection(body, "2. 핵심 지표");
  appendRowsAsTable(body, summaryRows, ["지표", "값"]);

  appendSection(body, "3. 주요 해석");
  body.appendParagraph(buildReportNarrative(summaryRows, reportType));

  if (reportType === "internal") {
    appendSection(body, "4. 문항 정보");
    appendRowsAsTable(body, questionRows, ["문항ID", "구분", "약칭", "문항명", "척도", "필수여부", "KPI포함"]);

    appendSection(body, "5. 주관식 의견");
    appendRowsAsTable(body, opinionRows, ["제출일시", "휴대폰뒤4자리", "개선의견"]);

    appendSection(body, "6. 개선과제");
    appendRowsAsTable(body, actionRows, ["과제명", "출처", "담당자", "기한", "상태", "관련문항", "메모"]);

    appendSection(body, "7. 응답 원본 요약");
    body.appendParagraph("총 " + responseRows.length + "건의 응답이 저장되어 있습니다. 상세 원본은 회차별 Google Sheet의 '응답원본' 탭에서 확인합니다.");
  } else {
    appendSection(body, "4. 주요 개선 의견");
    appendRowsAsTable(body, opinionRows.slice(0, 5), ["제출일시", "휴대폰뒤4자리", "개선의견"]);

    appendSection(body, "5. 개선과제 요약");
    appendRowsAsTable(body, actionRows.slice(0, 8), ["과제명", "출처", "담당자", "기한", "상태", "관련문항", "메모"]);
  }

  doc.saveAndClose();

  const docFile = DriveApp.getFileById(doc.getId());
  folder.addFile(docFile);
  DriveApp.getRootFolder().removeFile(docFile);

  const pdfBlob = docFile.getAs(MimeType.PDF).setName(fileName + ".pdf");
  const pdfFile = folder.createFile(pdfBlob);

  return {
    fileId: pdfFile.getId(),
    url: pdfFile.getUrl(),
    docUrl: docFile.getUrl(),
    message: reportLabel + " PDF 생성 완료",
  };
}

function getDashboardData(surveyId) {
  const context = getReportContext(surveyId);
  const spreadsheet = context.spreadsheet;
  const project = readProjectInfo(spreadsheet);
  const summaryRows = readSheetRows(spreadsheet, "집계결과");
  const actionRows = readSheetRows(spreadsheet, "개선과제");
  const opinionRows = readSheetRows(spreadsheet, "주관식의견");
  const responseRows = readSheetRows(spreadsheet, "응답원본");

  return {
    project: project,
    summary: rowsToObject(summaryRows),
    actionItems: actionRows.map(function (row) {
      return {
        title: row[0],
        source: row[1],
        owner: row[2],
        dueDate: row[3],
        status: row[4],
        question: row[5],
        memo: row[6],
      };
    }),
    opinions: opinionRows.map(function (row) {
      return {
        submittedAt: row[0],
        phoneLast4: row[1],
        opinion: row[2],
      };
    }),
    responseCount: responseRows.length,
  };
}

function ensureWorkbook(spreadsheet, project, questions) {
  const responseSheet = getOrCreateSheet(spreadsheet, "응답원본");
  ensureResponseHeader(responseSheet);
  updateProjectInfo(spreadsheet, project);
  updateQuestionInfo(spreadsheet, questions);
  ensureSummarySheet(spreadsheet);
  ensureOpinionSheet(spreadsheet);
  ensureActionItemSheet(spreadsheet, project);
}

function getOrCreateSheet(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function updateProjectInfo(spreadsheet, project) {
  const sheet = getOrCreateSheet(spreadsheet, "사업정보");
  sheet.clear();
  sheet.appendRow(["항목", "값"]);
  sheet.appendRow(["연도", project && project.year ? project.year : ""]);
  sheet.appendRow(["본부", project && project.division ? project.division : ""]);
  sheet.appendRow(["사업", project && project.business ? project.business : ""]);
  sheet.appendRow(["세부사업", project && project.subBusiness ? project.subBusiness : ""]);
  sheet.appendRow(["회차", project && project.round ? project.round : ""]);
  sheet.appendRow(["사업유형", project && project.type ? project.type : ""]);
  sheet.appendRow(["담당자", project && project.manager ? project.manager : ""]);
  sheet.appendRow(["목표응답수", project && project.targetResponses ? project.targetResponses : ""]);
  sheet.autoResizeColumns(1, 2);
}

function readProjectInfo(spreadsheet) {
  const sheet = spreadsheet.getSheetByName("사업정보");
  const fallback = {
    year: "",
    division: "",
    business: "",
    subBusiness: spreadsheet.getName().replace("_응답데이터", ""),
    round: "",
    type: "",
    manager: "",
  };

  if (!sheet) {
    return fallback;
  }

  const values = sheet.getDataRange().getValues().slice(1);
  return values.reduce(function (acc, row) {
    if (row[0] === "연도") acc.year = row[1];
    if (row[0] === "본부") acc.division = row[1];
    if (row[0] === "사업") acc.business = row[1];
    if (row[0] === "세부사업") acc.subBusiness = row[1];
    if (row[0] === "회차") acc.round = row[1];
    if (row[0] === "사업유형") acc.type = row[1];
    if (row[0] === "담당자") acc.manager = row[1];
    if (row[0] === "목표응답수") acc.targetResponses = row[1];
    return acc;
  }, fallback);
}

function getReportContext(projectId) {
  const indexSheet = getOrCreateIndexSheet();
  const row = findIndexRow(indexSheet, projectId);

  if (!row) {
    throw new Error("보고서를 생성할 설문ID를 찾을 수 없습니다: " + projectId);
  }

  const sheetId = indexSheet.getRange(row, 2).getValue();
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const file = DriveApp.getFileById(sheetId);
  const parents = file.getParents();
  const folder = parents.hasNext() ? parents.next() : ensureRootFolder();

  return {
    spreadsheet: spreadsheet,
    folder: folder,
  };
}

function readSheetRows(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  return sheet.getDataRange().getValues().slice(1).filter(function (row) {
    return row.some(function (cell) {
      return cell !== "";
    });
  });
}

function rowsToObject(rows) {
  return rows.reduce(function (acc, row) {
    acc[row[0]] = row[1];
    return acc;
  }, {});
}

function appendSection(body, title) {
  body.appendParagraph("");
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
}

function appendKeyValueTable(body, rows) {
  const table = body.appendTable(rows);
  formatTable(table);
}

function appendRowsAsTable(body, rows, headers) {
  const emptyRow = headers.map(function (_, index) {
    return index === 0 ? "해당 없음" : "";
  });
  const tableRows = [headers].concat(rows && rows.length > 0 ? rows : [emptyRow]);
  const table = body.appendTable(tableRows.map(function (row) {
    return row.map(function (cell) {
      return String(cell === undefined || cell === null ? "" : cell);
    });
  }));
  formatTable(table);
}

function formatTable(table) {
  for (var rowIndex = 0; rowIndex < table.getNumRows(); rowIndex += 1) {
    const row = table.getRow(rowIndex);
    for (var cellIndex = 0; cellIndex < row.getNumCells(); cellIndex += 1) {
      const cell = row.getCell(cellIndex);
      cell.setPaddingTop(4);
      cell.setPaddingBottom(4);
      cell.setPaddingLeft(6);
      cell.setPaddingRight(6);
      if (rowIndex === 0) {
        cell.setBackgroundColor("#eeeeee");
      }
    }
  }
}

function buildReportNarrative(summaryRows, reportType) {
  const summary = summaryRows.reduce(function (acc, row) {
    acc[row[0]] = row[1];
    return acc;
  }, {});
  const responseCount = summary["응답수"] || "0";
  const responseRate = summary["응답률"] || "미설정";
  const satisfaction = summary["만족도(긍정응답률)"] || "0%";
  const nps = summary["NPS"] || "0";

  if (reportType === "internal") {
    return "총 " + responseCount + "건의 응답을 기준으로 만족도는 " + satisfaction + ", 응답률은 " + responseRate + ", NPS는 " + nps + "입니다. 내부 분석용 보고서는 문항별 결과, 주관식 의견, 개선과제를 함께 검토하여 차년도 사업 개선에 활용합니다.";
  }

  return "본 만족도 조사는 총 " + responseCount + "건의 응답을 기준으로 집계되었습니다. 전체 만족도는 " + satisfaction + "이며, 응답률은 " + responseRate + ", NPS는 " + nps + "입니다. 주요 개선 의견과 과제는 후속 조치 계획에 반영합니다.";
}

function updateQuestionInfo(spreadsheet, questions) {
  const sheet = getOrCreateSheet(spreadsheet, "문항정보");
  const headers = ["문항ID", "구분", "약칭", "문항명", "척도", "필수여부", "KPI포함"];
  sheet.clear();
  sheet.appendRow(headers);

  if (!questions || questions.length === 0) {
    return;
  }

  const rows = questions.map(function (question) {
    return [
      question.id,
      question.group || "",
      shortQuestionName(question.id),
      question.label,
      scaleName(question.scale),
      question.required ? "필수" : "선택",
      question.kpiIncluded ? "포함" : "제외",
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
}

function ensureSummarySheet(spreadsheet) {
  const sheet = getOrCreateSheet(spreadsheet, "집계결과");
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== "지표") {
    sheet.clear();
    sheet.appendRow(["지표", "값"]);
  }
}

function ensureOpinionSheet(spreadsheet) {
  const sheet = getOrCreateSheet(spreadsheet, "주관식의견");
  const headers = ["제출일시", "휴대폰뒤4자리", "개선의견"];
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== "제출일시") {
    sheet.clear();
    sheet.appendRow(headers);
  }
}

function ensureActionItemSheet(spreadsheet, project) {
  const sheet = getOrCreateSheet(spreadsheet, "개선과제");
  const headers = ["과제명", "출처", "담당자", "기한", "상태", "관련문항", "메모"];
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== "과제명") {
    sheet.clear();
    sheet.appendRow(headers);
    sheet.appendRow([
      "만족도 하위항목 검토",
      "기본점검",
      project && project.manager ? project.manager : "사업담당자",
      "",
      "대기",
      "공통",
      "응답 누적 후 낮은 점수 문항을 확인합니다.",
    ]);
  }
}

function buildResponseHeaders() {
  return [
    "설문ID",
    "휴대폰뒤4자리",
    "제출일시",
    "전반만족",
    "절차편의",
    "담당응대",
    "기대부합",
    "성장도움",
    "재참여",
    "추천점수",
    "개선의견",
    "운영시간",
    "시간배분",
    "강의자료",
    "내용구성",
    "강사설명",
    "참여유도",
    "운영체계",
    "자기계발",
    "지원규모",
    "정산편의",
    "멘토품질",
    "마케팅성",
    "시설장비",
    "이용편의",
    "네트워킹",
    "심사공정",
    "서비스효과",
    "응답JSON",
  ];
}

function shortQuestionName(questionId) {
  const names = {
    common_satisfaction: "전반만족",
    common_process: "절차편의",
    common_manager: "담당응대",
    common_fit: "기대부합",
    common_growth: "성장도움",
    common_rejoin: "재참여",
    common_nps: "추천점수",
    common_opinion: "개선의견",
    edu_time_keep: "운영시간",
    edu_time_fit: "시간배분",
    edu_material: "강의자료",
    edu_content: "내용구성",
    edu_method: "강사설명",
    edu_participation: "참여유도",
    edu_operation: "운영체계",
    edu_effect: "자기계발",
    prod_1: "지원규모",
    prod_2: "정산편의",
    prod_3: "멘토품질",
    market_1: "지원규모",
    market_2: "마케팅성",
    market_3: "정산편의",
    infra_1: "시설장비",
    infra_2: "이용편의",
    infra_3: "입주지원",
    event_1: "행사구성",
    event_2: "네트워킹",
    event_3: "참여성과",
    contest_1: "접수편의",
    contest_2: "심사공정",
    contest_3: "후속지원",
    living_1: "서비스효과",
    living_2: "접근편의",
    living_3: "의견수렴",
  };

  return names[questionId] || String(questionId).slice(0, 5);
}

function scaleName(scale) {
  const names = {
    likert5: "5점척도",
    nps: "추천지수",
    text: "주관식",
    single: "단일선택",
  };

  return names[scale] || scale || "";
}

function buildResponseRow(response) {
  const map = answerMap(response.answers);

  return [
    response.surveyId,
    response.phoneLast4,
    formatKoreanDate(response.submittedAt),
    valueOf(map, "common_satisfaction"),
    valueOf(map, "common_process"),
    valueOf(map, "common_manager"),
    valueOf(map, "common_fit"),
    valueOf(map, "common_growth"),
    valueOf(map, "common_rejoin"),
    valueOf(map, "common_nps"),
    valueOf(map, "common_opinion"),
    valueOf(map, "edu_time_keep"),
    valueOf(map, "edu_time_fit"),
    valueOf(map, "edu_material"),
    valueOf(map, "edu_content"),
    valueOf(map, "edu_method"),
    valueOf(map, "edu_participation"),
    valueOf(map, "edu_operation"),
    valueOf(map, "edu_effect"),
    firstValueOf(map, ["prod_1", "market_1"]),
    firstValueOf(map, ["prod_2", "market_3"]),
    firstValueOf(map, ["prod_3"]),
    firstValueOf(map, ["market_2"]),
    firstValueOf(map, ["infra_1"]),
    firstValueOf(map, ["infra_2"]),
    firstValueOf(map, ["event_2"]),
    firstValueOf(map, ["contest_2"]),
    firstValueOf(map, ["living_1"]),
    JSON.stringify(response.answers),
  ];
}

function ensureResponseHeader(sheet) {
  const headers = buildResponseHeaders();
  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];

  if (current[0] !== "설문ID" || current[3] !== "전반만족") {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function answerMap(answers) {
  return (answers || []).reduce(function (acc, answer) {
    acc[answer.questionId] = answer.value;
    return acc;
  }, {});
}

function valueOf(map, key) {
  const value = map[key];
  return value === undefined || value === null ? "" : value;
}

function firstValueOf(map, keys) {
  for (var i = 0; i < keys.length; i += 1) {
    var value = valueOf(map, keys[i]);
    if (value !== "") {
      return value;
    }
  }

  return "";
}

function upsertOpinion(spreadsheet, response) {
  const opinion = valueOf(answerMap(response.answers), "common_opinion");
  const sheet = spreadsheet.getSheetByName("주관식의견") || spreadsheet.insertSheet("주관식의견");
  const headers = ["제출일시", "휴대폰뒤4자리", "개선의견"];

  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== "제출일시") {
    sheet.clear();
    sheet.appendRow(headers);
  }

  const values = sheet.getDataRange().getValues();
  const existingRowIndex = values.findIndex(function (item, index) {
    return index > 0 && String(item[1]) === String(response.phoneLast4);
  });
  const rowData = [formatKoreanDate(response.submittedAt), response.phoneLast4, opinion];

  if (existingRowIndex >= 0) {
    sheet.getRange(existingRowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
  } else if (opinion !== "") {
    sheet.appendRow(rowData);
  }
}

function upsertActionItems(spreadsheet, response, questions, project) {
  const sheet = getOrCreateSheet(spreadsheet, "개선과제");
  ensureActionItemSheet(spreadsheet, project);

  const map = answerMap(response.answers);
  const existingKeys = getActionItemKeys(sheet);
  const dueDate = defaultDueDate();
  const owner = project && project.manager ? project.manager : "사업담당자";
  const rows = [];

  (questions || []).forEach(function (question) {
    if (question.scale !== "likert5") {
      return;
    }

    const value = Number(map[question.id]);
    if (!isNaN(value) && value > 0 && value <= 3) {
      const title = shortQuestionName(question.id) + " 개선";
      const relatedQuestion = shortQuestionName(question.id);
      const key = title + "|" + relatedQuestion;
      if (!existingKeys[key]) {
        rows.push([
          title,
          "낮은만족도",
          owner,
          dueDate,
          "대기",
          relatedQuestion,
          "해당 문항 점수 " + value + "점 응답이 접수되었습니다.",
        ]);
      }
    }
  });

  const opinion = String(valueOf(map, "common_opinion") || "").trim();
  if (opinion !== "") {
    const title = "주관식의견 검토";
    const relatedQuestion = "개선의견(" + response.phoneLast4 + ")";
    const key = title + "|" + relatedQuestion;
    if (!existingKeys[key]) {
      rows.push([
        title,
        "주관식의견",
        owner,
        dueDate,
        "대기",
        relatedQuestion,
        truncateText(opinion, 120),
      ]);
    }
  }

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  }
}

function getActionItemKeys(sheet) {
  const values = sheet.getDataRange().getValues();
  return values.slice(1).reduce(function (acc, row) {
    acc[String(row[0]) + "|" + String(row[5] || row[1])] = true;
    return acc;
  }, {});
}

function updateSummary(spreadsheet, project) {
  const responseSheet = spreadsheet.getSheetByName("응답원본");
  const summarySheet = spreadsheet.getSheetByName("집계결과") || spreadsheet.insertSheet("집계결과");
  const values = responseSheet.getDataRange().getValues();
  const rows = values.slice(1).filter(function (row) {
    return row[0] !== "";
  });

  const satisfactionColumns = [3, 4, 5, 6, 7, 8];
  const positiveRate = calculatePositiveRate(rows, satisfactionColumns);
  const nps = calculateNpsFromRows(rows, 9);
  const targetResponses = project && project.targetResponses ? Number(project.targetResponses) : 0;
  const responseRate = targetResponses > 0 ? Math.round((rows.length / targetResponses) * 1000) / 10 : 0;

  summarySheet.clear();
  summarySheet.appendRow(["지표", "값"]);
  summarySheet.appendRow(["응답수", rows.length]);
  summarySheet.appendRow(["목표응답수", targetResponses || "미설정"]);
  summarySheet.appendRow(["응답률", targetResponses > 0 ? responseRate + "%" : "미설정"]);
  summarySheet.appendRow(["만족도(긍정응답률)", positiveRate + "%"]);
  summarySheet.appendRow(["NPS", nps]);
  summarySheet.appendRow(["마지막집계", formatKoreanDate(new Date().toISOString())]);
}

function calculatePositiveRate(rows, columns) {
  var total = 0;
  var positive = 0;

  rows.forEach(function (row) {
    columns.forEach(function (columnIndex) {
      var value = Number(row[columnIndex]);
      if (!isNaN(value) && value > 0) {
        total += 1;
        if (value >= 4) {
          positive += 1;
        }
      }
    });
  });

  if (total === 0) {
    return 0;
  }

  return Math.round((positive / total) * 1000) / 10;
}

function calculateNpsFromRows(rows, columnIndex) {
  var total = 0;
  var promoters = 0;
  var detractors = 0;

  rows.forEach(function (row) {
    var value = Number(row[columnIndex]);
    if (!isNaN(value)) {
      total += 1;
      if (value >= 9) {
        promoters += 1;
      } else if (value <= 6) {
        detractors += 1;
      }
    }
  });

  if (total === 0) {
    return 0;
  }

  return Math.round(((promoters - detractors) / total) * 100);
}

function formatKoreanDate(value) {
  const date = new Date(value);
  return Utilities.formatDate(date, "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
}

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return Utilities.formatDate(date, "Asia/Seoul", "yyyy-MM-dd");
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + "...";
}

function getOrCreateIndexSheet() {
  const root = ensureRootFolder();
  const fileName = "00_공통관리_설문인덱스";
  const files = root.getFilesByName(fileName);

  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId()).getActiveSheet();
  }

  const spreadsheet = SpreadsheetApp.create(fileName);
  const file = DriveApp.getFileById(spreadsheet.getId());
  root.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName("index");
  sheet.appendRow(["surveyId", "sheetId", "sheetUrl", "createdAt"]);
  return sheet;
}

function ensureMasterWorkbook(project, questions) {
  const root = ensureRootFolder();
  const fileName = "00_공통관리_마스터";
  const files = root.getFilesByName(fileName);
  const exists = files.hasNext();
  const spreadsheet = exists ? SpreadsheetApp.openById(files.next().getId()) : SpreadsheetApp.create(fileName);

  if (!exists) {
    const file = DriveApp.getFileById(spreadsheet.getId());
    root.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  }

  updateProjectMaster(spreadsheet, project);
  updateQuestionMaster(spreadsheet, questions);
  ensurePermissionMaster(spreadsheet);
}

function updateProjectMaster(spreadsheet, project) {
  const sheet = getOrCreateSheet(spreadsheet, "사업목록");
  const headers = ["연도", "본부", "사업", "세부사업", "회차", "사업유형", "담당자", "목표응답수", "수정일시"];

  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== "연도") {
    sheet.clear();
    sheet.appendRow(headers);
  }

  const values = sheet.getDataRange().getValues();
  const key = [project.year, project.division, project.business, project.subBusiness, project.round].join("|");
  const rowIndex = values.findIndex(function (row, index) {
    return index > 0 && [row[0], row[1], row[2], row[3], row[4]].join("|") === key;
  });
  const rowData = [
    project.year,
    project.division,
    project.business,
    project.subBusiness,
    project.round,
    project.type,
    project.manager,
    project.targetResponses,
    formatKoreanDate(new Date().toISOString()),
  ];

  if (rowIndex >= 0) {
    sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function updateQuestionMaster(spreadsheet, questions) {
  const sheet = getOrCreateSheet(spreadsheet, "문항은행");
  const headers = ["문항ID", "구분", "약칭", "문항명", "척도", "필수여부", "KPI포함"];

  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== "문항ID") {
    sheet.clear();
    sheet.appendRow(headers);
  }

  const values = sheet.getDataRange().getValues();
  const existingIds = values.slice(1).reduce(function (acc, row) {
    acc[row[0]] = true;
    return acc;
  }, {});
  const rows = (questions || []).filter(function (question) {
    return !existingIds[question.id];
  }).map(function (question) {
    return [
      question.id,
      question.group || "",
      shortQuestionName(question.id),
      question.label,
      scaleName(question.scale),
      question.required ? "필수" : "선택",
      question.kpiIncluded ? "포함" : "제외",
    ];
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  }
}

function ensurePermissionMaster(spreadsheet) {
  const sheet = getOrCreateSheet(spreadsheet, "권한관리");
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== "이메일") {
    sheet.clear();
    sheet.appendRow(["이메일", "이름", "권한", "본부", "담당사업", "상태"]);
    sheet.appendRow(["", "관리자", "총괄관리자", "전체", "전체", "사용"]);
  }
}

function findIndexRow(sheet, surveyId) {
  const values = sheet.getDataRange().getValues();
  const index = values.findIndex((item, rowIndex) => rowIndex > 0 && item[0] === surveyId);
  return index >= 0 ? index + 1 : null;
}

function upsertIndex(surveyId, sheetId, sheetUrl) {
  const indexSheet = getOrCreateIndexSheet();
  const row = findIndexRow(indexSheet, surveyId);
  const rowData = [surveyId, sheetId, sheetUrl, new Date().toISOString()];

  if (row) {
    indexSheet.getRange(row, 1, 1, rowData.length).setValues([rowData]);
  } else {
    indexSheet.appendRow(rowData);
  }
}

function ensureProjectFolder(project) {
  return buildDrivePath(project).reduce((parent, name) => ensureChildFolder(parent, name), ensureRootFolder());
}

function ensureRootFolder() {
  const folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);
}

function ensureChildFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function buildDrivePath(project) {
  return [
    String(project.year),
    project.division,
    sanitizeName(project.business),
    sanitizeName(project.subBusiness),
    project.round + "회차",
  ];
}

function buildResponseSheetName(project) {
  return [project.year, sanitizeName(project.subBusiness).replace(/\s/g, ""), project.round + "회차", "응답데이터"].join("_");
}

function buildReportFileName(project, reportLabel) {
  const year = project && project.year ? project.year : "연도미상";
  const subBusiness = project && project.subBusiness ? project.subBusiness : "만족도조사";
  const round = project && project.round ? project.round + "회차" : "회차미상";
  const timestamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd_HHmm");
  return [year, sanitizeName(subBusiness).replace(/\s/g, ""), round, reportLabel, timestamp].join("_");
}

function sanitizeName(value) {
  return String(value).replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
