#!/usr/bin/env node
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "school-name": { type: "string" },
    "school-code": { type: "string" },
    "school-year": { type: "string" },
    "admin-user-id": { type: "string" },
    "admin-display-name": { type: "string" },
    "deployment-mode": { type: "string", default: "production" },
    "admin-membership-role": { type: "string", default: "admin" },
  },
});

const required = ["school-name", "school-code", "school-year", "admin-user-id", "admin-display-name"];
const missing = required.filter((key) => !values[key]);
if (missing.length) {
  console.error(`Missing required options: ${missing.join(", ")}`);
  process.exit(1);
}

const quote = (value) => `'${String(value).replaceAll("'", "'\\''")}'`;

console.log("Run from a trusted terminal with the target database connection already selected.");
console.log("Do not paste passwords into this command.");
console.log("");
console.log([
  "psql",
  "-v ON_ERROR_STOP=1",
  `-v school_name=${quote(values["school-name"])}`,
  `-v school_code=${quote(values["school-code"])}`,
  `-v school_year=${quote(values["school-year"])}`,
  `-v admin_user_id=${quote(values["admin-user-id"])}`,
  `-v admin_display_name=${quote(values["admin-display-name"])}`,
  `-v deployment_mode=${quote(values["deployment-mode"])}`,
  `-v admin_membership_role=${quote(values["admin-membership-role"])}`,
  "-f supabase/template/bootstrap/rs_school_template_bootstrap.sql",
].join(" \\\n  "));

