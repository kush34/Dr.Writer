export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** Adds a tag typed by the user. Returns the new list, or an error message explaining why it was refused. */
export const addTag = (tags: string[], input: string): { tags: string[] } | { error: string } => {
  const tag = input.trim();
  if (!tag) return { error: "Type a tag first." };
  if (tag.length > MAX_TAG_LENGTH) return { error: `Tags can be at most ${MAX_TAG_LENGTH} characters.` };
  if (tags.some((existing) => same(existing, tag))) return { error: `"${tag}" is already added.` };
  if (tags.length >= MAX_TAGS) return { error: `A document can have at most ${MAX_TAGS} tags.` };
  return { tags: [...tags, tag] };
};

/** Every distinct tag used across the files, sorted, keeping the first spelling seen. */
export const collectTags = (files: { tags?: string[] }[]): string[] => {
  const seen = new Map<string, string>();
  for (const file of files) for (const tag of file.tags ?? []) if (!seen.has(tag.toLocaleLowerCase())) seen.set(tag.toLocaleLowerCase(), tag);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
};

export const filterByTag = <T extends { tags?: string[] }>(files: T[], tag: string | null): T[] =>
  tag === null ? files : files.filter((file) => (file.tags ?? []).some((candidate) => same(candidate, tag)));
