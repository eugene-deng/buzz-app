import { useLayoutEffect, useState } from "react";
import { Button } from "../../shared/design-system/ui/Button";
import { BuzzLinkPreview } from "../conversation/BuzzLinkPreview";
import { parseBuzzLink } from "../navigation/buzz-links";
import type { RelaySession } from "../relay/session";
import styles from "./LinkPreviews.module.css";
import { messageViewKey } from "./view-key";
import { FOLD_AFTER } from "./LinkPreviews";
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
 * hover card shows them. A card opens its link as clicking the link does.
 * Past `FOLD_AFTER`, the rest fold behind one button, as web previews do. */
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
  const [open, setOpen] = useState(false);
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
  const shown = open ? cards : cards.slice(0, FOLD_AFTER);
  const hidden = cards.length - shown.length;
  return (
    <div className={styles.previews} data-message-link-cards>
      {shown.map((card) => (
        <MessageLinkCard
          key={messageViewKey(session, scope, card.url)}
          session={session}
          onOpenLink={onOpenLink}
          {...card}
        />
      ))}
      {cards.length > FOLD_AFTER && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          {open
            ? "Show fewer linked messages"
            : `Show ${hidden} more linked ${hidden === 1 ? "message" : "messages"}`}
        </Button>
      )}
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
        {reading ? (
          <BuzzLinkPreview
            session={session}
            channelId={channelId}
            messageId={messageId}
            inline
          />
        ) : (
          // Waiting for a free reader, as a hover card waits for its read.
          <span role="status">Loading message…</span>
        )}
      </a>
      {unavailable && (
        <span role="status">This Buzz link couldn’t be opened here.</span>
      )}
    </>
  );
}
