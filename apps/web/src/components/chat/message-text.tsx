"use client";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const MENTION_PATTERN = /(@[\w-]+(?:\s[\w-]+)?)/g;

/** Renders a message body with bare URLs turned into links and `@Name`
 *  tokens highlighted. Mention resolution is purely textual (matching
 *  against known display names at send time — see use-room-chat.ts's
 *  `sendMessage` caller in chat-input.tsx) rather than rich-text spans, to
 *  keep the input a plain textarea. */
export function MessageText({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.match(URL_PATTERN)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand-600 underline underline-offset-2"
            >
              {part}
            </a>
          );
        }

        return part.split(MENTION_PATTERN).map((chunk, chunkIndex) =>
          chunk.match(MENTION_PATTERN) ? (
            <span key={`${index}-${chunkIndex}`} className="font-medium text-brand-700">
              {chunk}
            </span>
          ) : (
            <span key={`${index}-${chunkIndex}`}>{chunk}</span>
          )
        );
      })}
    </span>
  );
}
