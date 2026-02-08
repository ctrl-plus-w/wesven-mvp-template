/**
 * Stringify an array by putting "," and a "and" between each element.
 * @param arr The array to stringify
 * @returns A stringified version of the array
 */
export const arrayToString = (arr: string[]): string => {
  if (arr.length === 1) return arr[0];
  return `${arr.slice(0, arr.length - 1).join(', ')} and ${arr[arr.length - 1]}`;
};

/**
 * Convert a value or an array of values to an array
 * @param value The value or array of values
 */
export const toArray = <T>(value: T | T[]): T[] => {
  if (Array.isArray(value)) return value;
  return [value];
};

/**
 * Get the unique values of an array
 * @param array The array to get the unique values from
 */
export const unique = <T>(array: T[]): T[] => [...new Set(array)];

/**
 * Get the unique values of an array by id
 * @param array The array to get the unique values from
 */
export const uniqueById = <T extends { id: string }>(array: T[]): T[] =>
  array.filter((item, index, self) => index === self.findIndex((t) => t.id === item.id));

/**
 * Type guard to check if a value is defined (not null or undefined)
 * @param value The value to check
 */
export const isDefined = <T>(value: T | undefined | null): value is T => value !== undefined && value !== null;

export type DiffResult<TPrev, TNext = TPrev> = {
  added: TNext[];
  updated: (TNext & TPrev)[];
  removed: TPrev[];
  notUpdated: (TPrev & TNext)[];
};

/**
 * Helper to diff two arrays
 * @param getAreIdsEqual function to check if two items are the same (by id)
 * @param areEquals function to check if two items are equal (by value)
 */
export const diffHelper = <TPrev, TNext = TPrev>(
  getAreIdsEqual: (prevItem: TPrev, nextItem: TNext) => boolean,
  areEquals: (prevItem: TPrev, nextItem: TNext) => boolean,
) => {
  return (prev: TPrev[], next: TNext[]): DiffResult<TPrev, TNext> => {
    const added = next.filter((nextItem) => !prev.some((prevItem) => getAreIdsEqual(prevItem, nextItem)));

    const removed = prev.filter((prevItem, index) => {
      const nextItem = next.find((nextItem) => getAreIdsEqual(prevItem, nextItem));
      if (!nextItem) return true;

      return prev.findIndex((prevItem) => getAreIdsEqual(prevItem, nextItem)) !== index;
    });

    const updated = next
      .map((nextItem) => {
        const item = prev.find((prevItem) => getAreIdsEqual(prevItem, nextItem));
        if (item && !areEquals(item, nextItem)) return { ...item, ...nextItem };
      })
      .filter(isDefined);

    const notUpdated = next
      .map((nextItem) => {
        const item = prev.find((prevItem) => getAreIdsEqual(prevItem, nextItem));
        if (item && areEquals(item, nextItem)) return { ...nextItem, ...item };
      })
      .filter(isDefined);

    return { added, removed, updated, notUpdated };
  };
};

/**
 * Search an array of items by a query and a predicate function
 * @param arr The array to search
 * @param query The search query
 * @param predicate The predicate function to get the string to search in
 * @param limit The maximum number of results to return
 */
export const searchArray = <T extends Record<string, unknown>>(
  arr: T[],
  query: string,
  predicate: (item: T) => string,
  limit = 10,
) => {
  if (!query.length) return arr;

  return arr
    .filter((item) => predicate(item).toLowerCase().includes(query.toLowerCase()))
    .toSorted((a, b) => query.length / predicate(b).length - query.length / predicate(a).length)
    .slice(0, limit);
};
