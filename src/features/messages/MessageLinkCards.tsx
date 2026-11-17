import { useLayoutEffect, useState } from "react";
import { BuzzLinkPreview } from "../conversation/BuzzLinkPreview";
import { parseBuzzLink } from "../navigation/buzz-links";
import type { RelaySession } from "../relay/session";
import styles from "./LinkPreviews.module.css";
import { messageViewKey } from "./view-key";

/** A message shows cards for this many of its Buzz message links. */
export const MESSAGE_CARDS = 3;
/** Live readers all inline cards may hold at once, out of the session's 64,
 * so a channel full of message links never stops a thread from opening. */
export const CARD_READERS = 16;

const pools = new WeakMap<RelaySession, ReturnType<typeof pool>>();

function pool() {
  let held = 0;
  const waiting = new Set<() => void>();
  return {
    /** Calls `granted` once a reader is free; the returned release frees it,
     * or stops waiting. */
    hold(granted: () => void) {
      let holding = false;
      const take = () => {
        if (holding || held >= CARD_READERS) return;
        held++;
        holding = true;
        waiting.delete(take);
        granted();
      };
      waiting.add(take);
      take();
      return () => {
        waiting.delete(take);
        if (!holding) return;
        holding = false;
        held--;
        for (const next of [...waiting]) next();
      };
    },
  };
}

function readers(session: RelaySession) {
  const owner = pools.get(session) ?? pool();
  pools.set(session, owner);
  return owner;
}

/** Cards below a message for the Buzz messages it links to, as the link's
 * hover card shows them. A card opens its link as clicking the link does. */
export function MessageLinkCards({
  urls,
  session,
  scope,
  onOpenLink,
}: {
  urls: readonly string[];
  session: RelaySession;
  scope: string | undefined;
  onOpenLink(url: string): boolean;
}) {
  // Links spelled differently can name one message; it gets one card.
  const seen = new Set<string>();
  const cards = urls.flatMap((url) => {
    const link = parseBuzzLink(url);
    if (link?.format !== "legacy" || !link.messageId) return [];
    const key = `${link.channelId}:${link.messageId}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ url, channelId: link.channelId, messageId: link.messageId }];
  });
  if (!cards.length) return null;
  return (
    <div className={styles.previews} data-message-link-cards>
      {cards.slice(0, MESSAGE_CARDS).map((card) => (
        <MessageLinkCard
          key={messageViewKey(session, scope, card.url)}
          session={session}
          onOpenLink={onOpenLink}
          {...card}
        />
      ))}
    </div>
  );
}

function MessageLinkCard({
  url,
  channelId,
  messageId,
  session,
  onOpenLink,
}: {
  url: string;
  channelId: string;
  messageId: string;
  session: RelaySession;
  onOpenLink(url: string): boolean;
}) {
  const [reading, setReading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // Before paint, so a free reader never shows the row without its card.
  useLayoutEffect(() => {
    const release = readers(session).hold(() => setReading(true));
    return () => {
      release();
      setReading(false);
    };
  }, [session]);
  if (!reading) return null;
  const openCard = () => setUnavailable(!onOpenLink(url));
  return (
    <>
      <a
        className={styles.messageCard}
        href={url}
        onClick={(event) => {
          event.preventDefault();
          openCard();
        }}
        onAuxClick={(event) => {
          if (event.button !== 1) return;
          event.preventDefault();
          openCard();
        }}
      >
        <BuzzLinkPreview
          session={session}
          channelId={channelId}
          messageId={messageId}
          priority="background"
        />
      </a>
      {unavailable && (
        <span role="status">This Buzz link couldn’t be opened here.</span>
      )}
    </>
  );
}
