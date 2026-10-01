/** Escapes `%`, `_` and `\` so user text is matched literally by LIKE. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
