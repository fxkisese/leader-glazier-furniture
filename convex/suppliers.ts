import { crud } from "./access";
import { supplierFields } from "./schema";

export const { list, create, update, remove } = crud("suppliers", "suppliers", supplierFields);
