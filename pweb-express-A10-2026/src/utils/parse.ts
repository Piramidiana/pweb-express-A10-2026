import { HttpError } from "./http-error";

export const parseId = (value: unknown, label = "ID"): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${label} harus berupa bilangan bulat positif`);
  }
  return id;
};
