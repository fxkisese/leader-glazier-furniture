import { crud } from "./access";
import { payEntryFields } from "./schema";

export const { list, create, update, remove } = crud("pay_entries", "hr", payEntryFields);
