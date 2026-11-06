import { crud } from "./access";
import { customerFields } from "./schema";

export const { list, create, update, remove } = crud("customers", ["customers", "sales"], customerFields);
