import type { Project } from "@/types/platform";

export const ROOT_FOLDER_NAME = "만족도조사_통합플랫폼";

export function buildDrivePath(project: Project) {
  return [
    ROOT_FOLDER_NAME,
    String(project.year),
    project.division,
    sanitizeDriveName(project.business),
    sanitizeDriveName(project.subBusiness),
    `${project.round}회차`,
  ];
}

export function buildResponseSheetName(project: Project) {
  return [
    project.year,
    sanitizeFileName(project.subBusiness),
    `${project.round}회차`,
    "응답데이터",
  ].join("_");
}

export function buildReportFileName(project: Project, reportType: "official" | "internal") {
  const suffix = reportType === "official" ? "공식보고용" : "내부분석용";

  return [
    project.year,
    sanitizeFileName(project.subBusiness),
    `${project.round}회차`,
    suffix,
  ].join("_");
}

function sanitizeDriveName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeFileName(value: string) {
  return sanitizeDriveName(value).replace(/\s+/g, "");
}
