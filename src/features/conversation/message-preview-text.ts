import { preparedMarkdown } from "../messages/markdown-preparation";

/** A compact excerpt: stop before an empty paragraph rather than clamping a blank line. */
export function messagePreviewText(content: string): string {
  const text = content.trim();
  const paragraphBreak = /\r?\n[^\S\r\n]*\r?\n/.exec(text);
  return paragraphBreak
    ? `${text.slice(0, paragraphBreak.index).trimEnd()}…`
    : text;
}

/** `content` with each spoiler, paired as the renderer pairs them, shown as
 * "[Spoiler]". Text too long to pair hides everything from its first `||`. */
export function hideSpoilers(content: string): string {
  if (!content.includes("||")) return content;
  const prepared = preparedMarkdown(content);
  if (prepared.kind === "plain")
    return `${content.slice(0, content.indexOf("||"))}[Spoiler]`;
  const at = prepared.spoilerDelimiters;
  let text = prepared.content;
  for (let i = at.length - (at.length % 2) - 2; i >= 0; i -= 2)
    text = `${text.slice(0, at[i])}[Spoiler]${text.slice((at[i + 1] ?? 0) + 2)}`;
  return text;
}
