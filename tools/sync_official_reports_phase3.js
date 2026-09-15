const fs = require("fs");
const path = require("path");

const sourceRoot = "/Users/danielhenrique/.codex/worktrees/2b61/plataforma digital raizes e saberes";
const targetRoot = "/Users/danielhenrique/Documents/plataforma digital raizes e saberes";
const sourceApp = path.join(sourceRoot, "app-pages.js");
const targetApp = path.join(targetRoot, "app-pages.js");

let source = fs.readFileSync(sourceApp, "utf8");
let target = fs.readFileSync(targetApp, "utf8");

const region = (text, start, end) => {
  const from = text.indexOf(start);
  if (from < 0) throw new Error(`Missing start marker: ${start}`);
  const to = text.indexOf(end, from);
  if (to < 0) throw new Error(`Missing end marker: ${end}`);
  return text.slice(from, to);
};

const replaceRegion = (start, end) => {
  const current = region(target, start, end);
  const next = region(source, start, end);
  target = target.replace(current, next);
};

[
  ["const teacherWorkspaceNav = [", "const normalizeTeacherWorkspaceView ="],
  ["const officialReportsState = {", "const studentInstitutionalState ="],
  ["const officialReportsService = (() => {", "const renderOfficialReportSummary ="],
  ["const renderOfficialReportPreview = ", "const municipalNetworkAllowedRoles ="],
  ["const renderMunicipalNetworkReadyView = () => {", "const renderMunicipalNetworkDashboard ="],
  ["const initMunicipalNetworkDashboard = () => {", "const renderTeacherAssessmentsView ="],
  ["const ensureSecretariaOfficialReport = async", "const ensureSecretariaInstitutionalData ="],
].forEach(([start, end]) => replaceRegion(start, end));

[
  ['professor.html?view=relatórios', 'professor.html?view=relatorios'],
  ['view: "relatórios"', 'view: "relatorios"'],
  ['value="relatórios"', 'value="relatorios"'],
  ['relatórios: `', 'relatorios: `'],
  ['"relatórios", "formação"', '"relatorios", "formação"'],
  ['normalizedView === "relatórios"', 'normalizedView === "relatorios"'],
  ['activeTeacherView === "relatórios"', 'activeTeacherView === "relatorios"'],
  ['renderTeacherWorkspaceView("relatórios")', 'renderTeacherWorkspaceView("relatorios")'],
].forEach(([from, to]) => {
  target = target.split(from).join(to);
});

const printListener = `    workspace.querySelectorAll("[data-report-print]").forEach((button) => {
      button.addEventListener("click", () => window.print());
    });`;
target = target.replace(printListener, `    bindOfficialReportControls(workspace, "teacher");`);

const teacherReportBlockStart = `    if (normalizedView === "relatorios") {`;
const teacherReportBlockEnd = `  };

  const rerenderTeacherClassPage = () => {`;
const targetBlock = region(target, teacherReportBlockStart, teacherReportBlockEnd);
const sourceBlock = region(source, teacherReportBlockStart, teacherReportBlockEnd);
target = target.replace(targetBlock, sourceBlock);

const secretariaPrintListener = `  area.querySelectorAll("[data-report-print]").forEach((button) => {
    button.addEventListener("click", () => window.print());
  });`;
target = target.replace(secretariaPrintListener, `  bindOfficialReportControls(area, "secretaria");`);

const secretariaReportsBlockStart = `  if (secretariaInstitutionalState.status === "ready" && getSecretariaCurrentView() === "relatorios") {`;
const secretariaReportsBlockEnd = `  }
};

const questionBankFallbackStore = {`;
const targetSecretariaBlock = region(target, secretariaReportsBlockStart, secretariaReportsBlockEnd);
const sourceSecretariaBlock = region(source, secretariaReportsBlockStart, secretariaReportsBlockEnd);
target = target.replace(targetSecretariaBlock, sourceSecretariaBlock);

fs.writeFileSync(targetApp, target);

[
  "supabase/template/migrations/202609130001_rs_school_template_v1_official_reports_exports.sql",
  "supabase/functions/official-report-export/index.ts",
].forEach((relative) => {
  const from = path.join(sourceRoot, relative);
  const to = path.join(targetRoot, relative);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
});
