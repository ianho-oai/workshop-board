import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".dev.vars")) {
  const template = readFileSync(".dev.vars.example", "utf8");
  writeFileSync(
    ".dev.vars",
    template.replace(
      'ADMIN_PASSWORD=""',
      `ADMIN_PASSWORD="${randomBytes(24).toString("hex")}"`,
    ),
    { mode: 0o600 },
  );
  console.log(
    "Created .dev.vars with a random organiser code. Open it to find your code and add your own API key.",
  );
} else console.log(".dev.vars already exists; left unchanged.");
