import { HttpError } from "./http-error";

export const parseId = (value: unknown, label = "ID"): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${label} harus berupa bilangan bulat positif`);
  }
  return id;
};

const parsePositiveQueryInteger = (
  value: unknown,
  fallback: number,
  label: string,
): number => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new HttpError(400, `${label} harus berupa bilangan bulat positif`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${label} harus berupa bilangan bulat positif`);
  }

  return parsed;
};

export const parsePagination = (
  page: unknown,
  limit: unknown,
): { currentPage: number; limit: number; skip: number } => {
  const currentPage = parsePositiveQueryInteger(page, 1, "Page");
  const parsedLimit = parsePositiveQueryInteger(limit, 10, "Limit");
  const skip = (currentPage - 1) * parsedLimit;

  if (!Number.isSafeInteger(skip)) {
    throw new HttpError(400, "Kombinasi page dan limit terlalu besar");
  }

  return { currentPage, limit: parsedLimit, skip };
};
