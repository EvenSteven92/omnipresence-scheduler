import { dbPath, loadEnvFiles } from "./lib/env.js";
import { initSchema } from "./db/client.js";

loadEnvFiles();
initSchema();
console.log(`SQLite ready at ${dbPath()}`);
