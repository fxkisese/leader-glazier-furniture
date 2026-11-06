import { crud } from "./access";
import { purchaseFields } from "./schema";

export const { list, create, update, remove } = crud("purchases", "suppliers", purchaseFields);
