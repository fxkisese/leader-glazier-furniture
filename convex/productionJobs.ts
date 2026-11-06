import { crud } from "./access";
import { jobFields } from "./schema";

export const { list, create, update, remove } = crud("production_jobs", "production", jobFields);
