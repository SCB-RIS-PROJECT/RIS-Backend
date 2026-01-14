#!/usr/bin/env bun
import db from "../src/database/db";
import { modalityTable } from "../src/database/schemas/schema-modality";

const modalities = await db.select().from(modalityTable);
console.log(JSON.stringify(modalities, null, 2));
process.exit(0);
