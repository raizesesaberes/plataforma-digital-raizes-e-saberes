#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { stdin as input, stdout as output } from "node:process";

const PACKAGE_VERSION = "RS-SCHOOL-V1-DEPLOYMENT-2026-09-01";
const TEMPLATE_VERSION = "RS-SCHOOL-TEMPLATE V1";
const REQUIRED_FILES = {
  classes: "turmas.csv",
  teachers: "professores.csv",
  teacherClasses: "professor_turmas.csv",
  students: "alunos.csv",
  guardians: "responsaveis.csv",
};
const REQUIRED_COLUMNS = {
  classes: ["class_name", "school_year", "status"],
  teachers: ["full_name", "email", "status"],
  teacherClasses: ["teacher_email", "class_name", "school_year", "role", "status"],
  students: ["full_name", "birth_date", "class_name", "school_year", "status"],
  guardians: ["guardian_name", "email", "phone", "relationship", "student_reference", "status", "is_primary"],
};
const VALID_STATUS = new Set(["active", "inactive", "archived"]);
const VALID_GUARDIAN_RELATIONSHIP = new Set(["responsavel", "mae", "pai", "avo", "tutor", "outro"]);
const VALID_TEACHER_ROLE = new Set(["principal", "auxiliar", "especialista", "substituto"]);

const { values } = parseArgs({
  options: {
    dir: { type: "string", default: "deployment/rs-school-v1/templates/csv" },
    "school-name": { type: "string" },
    "school-year": { type: "string" },
    apply: { type: "boolean", default: false },
    email: { type: "string" },
    "report-dir": { type: "string", default: "deployment/rs-school-v1/reports" },
  },
});

const now = new Date().toISOString();
const report = {
  package_version: PACKAGE_VERSION,
  schema_version: TEMPLATE_VERSION,
  mode: values.apply ? "apply" : "dry-run",
  generated_at: now,
  school_name: values["school-name"] || "",
  school_year: values["school-year"] || "",
  files: {},
  counts: {
    lines_read: 0,
    valid: 0,
    invalid: 0,
    duplicated: 0,
    existing: 0,
    created: 0,
    ignored: 0,
    failures: 0,
  },
  existing_records: [],
  created_ids: [],
  errors: [],
  warnings: [],
};

const fail = (message, detail = {}) => {
  report.errors.push({ message, ...detail });
  throw new Error(message);
};

const normalize = (value) => String(value ?? "").trim();
const key = (...parts) => parts.map((part) => normalize(part).toLowerCase()).join("|");
const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(normalize(value));
const boolValue = (value) => ["true", "1", "sim", "yes"].includes(normalize(value).toLowerCase());

const parseCsv = (source) => {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((item) => item.some((cell) => normalize(cell)));
};

const readCsv = async (kind, fileName) => {
  const filePath = path.join(values.dir, fileName);
  const source = await fs.readFile(filePath, "utf8");
  const rows = parseCsv(source);
  if (rows.length === 0) fail(`CSV vazio: ${fileName}`);
  const headers = rows[0].map(normalize);
  const missing = REQUIRED_COLUMNS[kind].filter((column) => !headers.includes(column));
  if (missing.length) fail(`Colunas obrigatorias ausentes em ${fileName}: ${missing.join(", ")}`);
  const data = rows.slice(1).map((cells, index) => {
    const record = {};
    headers.forEach((header, headerIndex) => {
      record[header] = normalize(cells[headerIndex]);
    });
    return { ...record, __line: index + 2 };
  });
  report.files[fileName] = { rows: data.length, columns: headers };
  report.counts.lines_read += data.length;
  return data;
};

const addError = (file, line, message) => {
  report.errors.push({ file, line, message });
  report.counts.invalid += 1;
};

const addDuplicate = (file, line, message) => {
  report.errors.push({ file, line, message });
  report.counts.duplicated += 1;
};

const addExisting = (kind, sourceLine, id, message) => {
  report.existing_records.push({ kind, source_line: sourceLine, id, message });
  report.counts.existing += 1;
};

const validateDataset = ({ classes, teachers, teacherClasses, students, guardians }) => {
  const classKeys = new Set();
  const teacherEmails = new Set();
  const studentKeys = new Set();

  for (const item of classes) {
    if (!item.class_name || !item.school_year || !item.status) addError(REQUIRED_FILES.classes, item.__line, "Turma exige class_name, school_year e status.");
    if (!VALID_STATUS.has(item.status)) addError(REQUIRED_FILES.classes, item.__line, `Status invalido: ${item.status}`);
    const classKey = key(item.class_name, item.school_year);
    if (classKeys.has(classKey)) addDuplicate(REQUIRED_FILES.classes, item.__line, `Turma duplicada: ${item.class_name}/${item.school_year}`);
    classKeys.add(classKey);
  }

  for (const item of teachers) {
    if (!item.full_name || !item.email || !item.status) addError(REQUIRED_FILES.teachers, item.__line, "Professor exige full_name, email e status.");
    if (!item.email.includes("@")) addError(REQUIRED_FILES.teachers, item.__line, `E-mail invalido: ${item.email}`);
    if (!VALID_STATUS.has(item.status)) addError(REQUIRED_FILES.teachers, item.__line, `Status invalido: ${item.status}`);
    const teacherKey = key(item.email);
    if (teacherEmails.has(teacherKey)) addDuplicate(REQUIRED_FILES.teachers, item.__line, `Professor duplicado: ${item.email}`);
    teacherEmails.add(teacherKey);
  }

  for (const item of teacherClasses) {
    if (!teacherEmails.has(key(item.teacher_email))) addError(REQUIRED_FILES.teacherClasses, item.__line, `Professor nao encontrado: ${item.teacher_email}`);
    if (!classKeys.has(key(item.class_name, item.school_year))) addError(REQUIRED_FILES.teacherClasses, item.__line, `Turma nao encontrada: ${item.class_name}/${item.school_year}`);
    if (!VALID_TEACHER_ROLE.has(item.role)) addError(REQUIRED_FILES.teacherClasses, item.__line, `Papel de professor invalido: ${item.role}`);
    if (item.status !== "active") addError(REQUIRED_FILES.teacherClasses, item.__line, "Vinculo professor-turma deve iniciar como active.");
  }

  for (const item of students) {
    if (!item.full_name || !item.birth_date || !item.class_name || !item.school_year || !item.status) addError(REQUIRED_FILES.students, item.__line, "Aluno exige full_name, birth_date, class_name, school_year e status.");
    if (!isIsoDate(item.birth_date)) addError(REQUIRED_FILES.students, item.__line, `birth_date deve usar YYYY-MM-DD: ${item.birth_date}`);
    if (!classKeys.has(key(item.class_name, item.school_year))) addError(REQUIRED_FILES.students, item.__line, `Turma do aluno nao encontrada: ${item.class_name}/${item.school_year}`);
    if (item.status !== "active") addError(REQUIRED_FILES.students, item.__line, "Aluno importado deve iniciar como active.");
    const studentKey = key(item.full_name, item.birth_date);
    if (studentKeys.has(studentKey)) addDuplicate(REQUIRED_FILES.students, item.__line, `Aluno duplicado: ${item.full_name}/${item.birth_date}`);
    studentKeys.add(studentKey);
  }

  for (const item of guardians) {
    if (!item.guardian_name || !item.relationship || !item.student_reference || !item.status) addError(REQUIRED_FILES.guardians, item.__line, "Responsavel exige guardian_name, relationship, student_reference e status.");
    if (!VALID_GUARDIAN_RELATIONSHIP.has(item.relationship)) addError(REQUIRED_FILES.guardians, item.__line, `Relacao invalida: ${item.relationship}`);
    if (!studentKeys.has(key(item.student_reference, students.find((student) => key(student.full_name) === key(item.student_reference))?.birth_date || ""))) {
      const existsByName = students.some((student) => key(student.full_name) === key(item.student_reference));
      if (!existsByName) addError(REQUIRED_FILES.guardians, item.__line, `Aluno do responsavel nao encontrado: ${item.student_reference}`);
    }
    if (item.status !== "active") addError(REQUIRED_FILES.guardians, item.__line, "Responsavel importado deve iniciar como active.");
  }

  const invalidTotal = report.counts.invalid + report.counts.duplicated;
  report.counts.valid = Math.max(0, report.counts.lines_read - invalidTotal);
};

class SupabaseClient {
  constructor({ url, anonKey, accessToken }) {
    this.url = url.replace(/\/$/, "");
    this.anonKey = anonKey;
    this.accessToken = accessToken;
  }

  async rpc(endpoint, body, { preferRepresentation = true } = {}) {
    const response = await fetch(`${this.url}/rest/v1/${endpoint}`, {
      method: "POST",
      headers: {
        apikey: this.anonKey,
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
        ...(preferRepresentation ? { prefer: "return=representation" } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${endpoint} failed: ${response.status} ${text}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async get(endpoint) {
    const response = await fetch(`${this.url}/rest/v1/${endpoint}`, {
      method: "GET",
      headers: {
        apikey: this.anonKey,
        authorization: `Bearer ${this.accessToken}`,
        accept: "application/json",
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${endpoint} failed: ${response.status} ${text}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
}

const promptPassword = async () => new Promise((resolve, reject) => {
  const chars = [];
  const wasRaw = Boolean(input.isRaw);
  const cleanup = () => {
    input.off("data", onData);
    if (input.isTTY) input.setRawMode(wasRaw);
    input.pause();
    output.write("\n");
  };
  const onData = (chunk) => {
    for (const byte of chunk) {
      if (byte === 3) {
        cleanup();
        reject(new Error("password prompt cancelled"));
        return;
      }
      if (byte === 10 || byte === 13) {
        cleanup();
        resolve(Buffer.from(chars).toString("utf8"));
        return;
      }
      if (byte === 8 || byte === 127) {
        chars.pop();
        continue;
      }
      chars.push(byte);
    }
  };
  output.write("Supabase admin password: ");
  input.resume();
  if (input.isTTY) input.setRawMode(true);
  input.on("data", onData);
});

const signIn = async ({ url, anonKey, email }) => {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (accessToken) return accessToken;
  if (!email) fail("--apply exige SUPABASE_ACCESS_TOKEN ou --email para login tecnico.");
  const password = await promptPassword();
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`auth failed: ${response.status} ${text}`);
  }
  const json = await response.json();
  return json.access_token;
};

const createRemoteClient = async () => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) fail("Operacao remota exige SUPABASE_URL e SUPABASE_ANON_KEY ou SUPABASE_PUBLISHABLE_KEY.");
  const accessToken = await signIn({ url, anonKey, email: values.email });
  if (!process.env.RS_SCHOOL_ID) fail("--apply exige RS_SCHOOL_ID para criar turmas no escopo correto.");
  return new SupabaseClient({ url, anonKey, accessToken });
};

const loadRemoteState = async (client) => {
  const schoolId = process.env.RS_SCHOOL_ID;
  const [
    profiles,
    classes,
    teachers,
    teacherLinks,
    students,
    enrollments,
    guardians,
    guardianLinks,
  ] = await Promise.all([
    client.get("profiles?select=id,display_name,platform_role,status"),
    client.rpc("rpc/secretaria_list_classes", {}),
    client.rpc("rpc/secretaria_list_teachers", {}),
    client.rpc("rpc/secretaria_list_class_teacher_memberships", {}),
    client.rpc("rpc/secretaria_list_students", {}),
    client.rpc("rpc/secretaria_list_enrollments", {}),
    client.get("guardians?select=id,school_id,full_name,email,phone,status"),
    client.get("student_guardian_links?select=id,student_id,guardian_id,relationship,status"),
  ]);
  const profileById = new Map((profiles || []).map((item) => [item.id, item]));
  const classByKey = new Map((classes || [])
    .filter((item) => item.school_id === schoolId && item.status !== "archived")
    .map((item) => [key(item.nome, item.school_year), item]));
  const teacherByName = new Map((teachers || [])
    .filter((item) => item.school_id === schoolId && item.status !== "archived")
    .map((item) => [key(item.full_name || profileById.get(item.profile_id)?.display_name), item]));
  const studentByName = new Map((students || [])
    .filter((item) => item.school_id === schoolId && item.status !== "archived")
    .map((item) => [key(item.nome), item]));
  const activeEnrollmentByStudent = new Map((enrollments || [])
    .filter((item) => item.school_id === schoolId && item.status === "active" && !item.ended_at)
    .map((item) => [item.student_id, item]));
  const guardianByName = new Map((guardians || [])
    .filter((item) => item.school_id === schoolId && item.status !== "archived")
    .map((item) => [key(item.full_name), item]));
  return {
    profiles: profiles || [],
    classes: classes || [],
    teachers: teachers || [],
    teacherLinks: teacherLinks || [],
    students: students || [],
    enrollments: enrollments || [],
    guardians: guardians || [],
    guardianLinks: guardianLinks || [],
    profileById,
    classByKey,
    teacherByName,
    studentByName,
    activeEnrollmentByStudent,
    guardianByName,
  };
};

const markRemoteExisting = (dataset, remoteState) => {
  for (const item of dataset.classes) {
    const existing = remoteState.classByKey.get(key(item.class_name, item.school_year));
    if (existing) addExisting("class", item.__line, existing.id, `${item.class_name}/${item.school_year}`);
  }
  for (const item of dataset.teachers) {
    const existing = remoteState.teacherByName.get(key(item.full_name));
    if (existing) addExisting("teacher", item.__line, existing.id, item.full_name);
  }
  for (const item of dataset.students) {
    const existing = remoteState.studentByName.get(key(item.full_name));
    if (existing) addExisting("student", item.__line, existing.id, item.full_name);
  }
  for (const item of dataset.guardians) {
    const existingGuardian = remoteState.guardianByName.get(key(item.guardian_name));
    const existingStudent = remoteState.studentByName.get(key(item.student_reference));
    const existingLink = existingGuardian && existingStudent
      ? remoteState.guardianLinks.find((link) => link.guardian_id === existingGuardian.id && link.student_id === existingStudent.id && link.status === "active")
      : null;
    if (existingGuardian) addExisting("guardian", item.__line, existingGuardian.id, item.guardian_name);
    if (existingLink) addExisting("guardian_link", item.__line, existingLink.id, `${item.guardian_name} -> ${item.student_reference}`);
  }
  for (const item of dataset.teacherClasses) {
    const teacher = remoteState.teacherByName.get(key(dataset.teachers.find((candidate) => key(candidate.email) === key(item.teacher_email))?.full_name));
    const classItem = remoteState.classByKey.get(key(item.class_name, item.school_year));
    const existingLink = teacher && classItem
      ? remoteState.teacherLinks.find((link) => link.teacher_id === teacher.id && link.class_id === classItem.id && link.status === "active")
      : null;
    if (existingLink) addExisting("teacher_class_link", item.__line, existingLink.id, `${item.teacher_email} -> ${item.class_name}`);
  }
};

const applyDataset = async (dataset) => {
  const client = await createRemoteClient();
  const classIds = new Map();
  const teacherIds = new Map();
  const studentIds = new Map();
  const remoteState = await loadRemoteState(client);
  const teacherNameByEmail = new Map(dataset.teachers.map((item) => [key(item.email), item.full_name]));

  for (const item of dataset.classes) {
    const existing = remoteState.classByKey.get(key(item.class_name, item.school_year));
    if (existing) {
      classIds.set(key(item.class_name, item.school_year), existing.id);
      addExisting("class", item.__line, existing.id, `${item.class_name}/${item.school_year}`);
      continue;
    }
    const created = await client.rpc("rpc/secretaria_create_class", {
      p_school_id: process.env.RS_SCHOOL_ID,
      p_nome: item.class_name,
      p_school_year: item.school_year,
      p_status: item.status,
      p_age_group: item.age_group || null,
      p_turno: item.shift || null,
      p_ano_escolar: item.grade || null,
      p_reason: "importacao inicial rs-school-v1",
    });
    classIds.set(key(item.class_name, item.school_year), created?.class_id);
    report.created_ids.push({ kind: "class", source_line: item.__line, id: created?.class_id });
    report.counts.created += 1;
  }

  for (const item of dataset.teachers) {
    const existing = remoteState.teacherByName.get(key(item.full_name));
    if (existing) {
      teacherIds.set(key(item.email), existing.id);
      addExisting("teacher", item.__line, existing.id, item.full_name);
      continue;
    }
    const created = await client.rpc("rpc/secretaria_create_teacher", {
      p_school_id: process.env.RS_SCHOOL_ID,
      p_full_name: item.full_name,
      p_status: item.status,
      p_disciplina: item.disciplina || null,
    });
    teacherIds.set(key(item.email), created?.teacher_id);
    report.created_ids.push({ kind: "teacher", source_line: item.__line, id: created?.teacher_id, profile_id: created?.profile_id, membership_id: created?.membership_id });
    report.counts.created += 1;
  }

  for (const item of dataset.teacherClasses) {
    const teacherId = teacherIds.get(key(item.teacher_email));
    const classId = classIds.get(key(item.class_name, item.school_year));
    if (!teacherId || !classId) fail(`Vinculo professor-turma sem origem criada: ${item.teacher_email} -> ${item.class_name}`);
    const existingLink = remoteState.teacherLinks.find((link) => link.teacher_id === teacherId && link.class_id === classId && link.status === "active");
    if (existingLink) {
      addExisting("teacher_class_link", item.__line, existingLink.id, `${item.teacher_email} -> ${item.class_name}`);
      continue;
    }
    const created = await client.rpc("rpc/secretaria_link_teacher_to_class", {
      p_teacher_id: teacherId,
      p_class_id: classId,
      p_role: item.role || "principal",
      p_reason: "importacao inicial rs-school-v1",
    });
    report.created_ids.push({ kind: "teacher_class_link", source_line: item.__line, id: created?.membership_id, teacher_id: teacherId, class_id: classId });
    report.counts.created += 1;
  }

  for (const item of dataset.students) {
    const existing = remoteState.studentByName.get(key(item.full_name));
    if (existing) {
      studentIds.set(key(item.full_name), existing.id);
      addExisting("student", item.__line, existing.id, item.full_name);
      const enrollment = remoteState.activeEnrollmentByStudent.get(existing.id);
      if (enrollment) addExisting("enrollment", item.__line, enrollment.id, item.full_name);
      continue;
    }
    const classId = classIds.get(key(item.class_name, item.school_year));
    if (!classId) fail(`Turma nao criada para aluno: ${item.full_name}`);
    const created = await client.rpc("rpc/secretaria_create_student_enrollment", {
      p_nome: item.full_name,
      p_data_nascimento: item.birth_date,
      p_class_id: classId,
      p_school_year: item.school_year,
      p_status: item.status,
    });
    studentIds.set(key(item.full_name), created?.student_id);
    report.created_ids.push({ kind: "student", source_line: item.__line, id: created?.student_id, enrollment_id: created?.enrollment_id });
    report.counts.created += 2;
  }

  for (const item of dataset.guardians) {
    const studentId = studentIds.get(key(item.student_reference));
    if (!studentId) fail(`Aluno nao criado para responsavel: ${item.student_reference}`);
    const existingGuardian = remoteState.guardianByName.get(key(item.guardian_name));
    const existingLink = existingGuardian
      ? remoteState.guardianLinks.find((link) => link.guardian_id === existingGuardian.id && link.student_id === studentId && link.relationship === item.relationship && link.status === "active")
      : null;
    if (existingLink) {
      addExisting("guardian", item.__line, existingGuardian.id, item.guardian_name);
      addExisting("guardian_link", item.__line, existingLink.id, `${item.guardian_name} -> ${item.student_reference}`);
      continue;
    }
    const created = await client.rpc("rpc/secretaria_create_guardian_link", {
      p_student_id: studentId,
      p_full_name: item.guardian_name,
      p_relationship: item.relationship,
      p_phone: item.phone || null,
      p_email: item.email || null,
      p_status: item.status,
      p_is_primary: boolValue(item.is_primary),
      p_guardian_id: null,
    });
    report.created_ids.push({ kind: "guardian_link", source_line: item.__line, guardian_id: created?.guardian_id, link_id: created?.link_id });
    report.counts.created += 2;
  }
};

const writeReports = async () => {
  await fs.mkdir(values["report-dir"], { recursive: true });
  const stamp = now.replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const jsonPath = path.join(values["report-dir"], `rs-school-v1-import-${stamp}.json`);
  const mdPath = path.join(values["report-dir"], `rs-school-v1-import-${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, [
    `# Relatorio De Importacao RS-SCHOOL V1`,
    ``,
    `- Modo: ${report.mode}`,
    `- Escola: ${report.school_name || "nao informada"}`,
    `- Ano letivo: ${report.school_year || "nao informado"}`,
    `- Linhas lidas: ${report.counts.lines_read}`,
    `- Validas: ${report.counts.valid}`,
    `- Invalidas: ${report.counts.invalid}`,
    `- Duplicadas: ${report.counts.duplicated}`,
    `- Criadas: ${report.counts.created}`,
    `- Ignoradas: ${report.counts.ignored}`,
    `- Falhas: ${report.counts.failures}`,
    ``,
    `## Avisos`,
    ...(report.warnings.length ? report.warnings.map((item) => `- ${item}`) : ["- Nenhum."]),
    ``,
    `## Existentes`,
    ...(report.existing_records.length ? report.existing_records.map((item) => `- ${JSON.stringify(item)}`) : ["- Nenhum."]),
    ``,
    `## Erros`,
    ...(report.errors.length ? report.errors.map((item) => `- ${item.file || "runtime"}:${item.line || "-"} ${item.message}`) : ["- Nenhum."]),
    ``,
    `## IDs Criados`,
    ...(report.created_ids.length ? report.created_ids.map((item) => `- ${JSON.stringify(item)}`) : ["- Nenhum."]),
    ``,
  ].join("\n"));
  report.report_files = { json: jsonPath, markdown: mdPath };
};

try {
  if (!values["school-name"]) fail("--school-name e obrigatorio.");
  if (!values["school-year"]) fail("--school-year e obrigatorio.");

  const dataset = {
    classes: await readCsv("classes", REQUIRED_FILES.classes),
    teachers: await readCsv("teachers", REQUIRED_FILES.teachers),
    teacherClasses: await readCsv("teacherClasses", REQUIRED_FILES.teacherClasses),
    students: await readCsv("students", REQUIRED_FILES.students),
    guardians: await readCsv("guardians", REQUIRED_FILES.guardians),
  };
  validateDataset(dataset);

  if (report.errors.length) {
    report.counts.failures = report.errors.length;
  } else if (values.apply) {
    await applyDataset(dataset);
  } else {
    if (process.env.RS_SCHOOL_ID && process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)) {
      const client = await createRemoteClient();
      const remoteState = await loadRemoteState(client);
      markRemoteExisting(dataset, remoteState);
    }
    report.counts.ignored = Math.max(0, report.counts.valid - report.counts.existing);
  }
} catch (error) {
  report.counts.failures += 1;
  if (!report.errors.some((item) => item.message === error.message)) {
    report.errors.push({ message: error.message });
  }
} finally {
  await writeReports();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.errors.length ? 1 : 0);
}
