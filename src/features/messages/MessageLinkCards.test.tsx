// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { RelaySession } from "../relay/session";
import type { ThreadSnapshot, ThreadView } from "../relay/threads";
import type { ChannelMessage } from "../relay/contracts";
import {
  CARD_READERS,
  MESSAGE_CARDS,
  MessageLinkCards,
} from "./MessageLinkCards";

afterEach(cleanup);

const id = (n: number) => n.toString(16).padStart(64, "a");
const link = (n: number) => `buzz://message?channel=general&id=${id(n)}`;
const message = (messageId: string): ChannelMessage => ({
  id: messageId,
  channelId: "general",
  authorId: "b".repeat(64),
  content: `linked body ${messageId.slice(-2)}`,
  createdAt: 1,
  mentions: [],
  participants: [],
  attachments: [],
  reactions: [],
  replyCount: 0,
});

/** A session whose exact reads find each linked message at once. */
function fakeSession() {
  const open = new Set<string>();
  const thread = vi.fn(
    (_channelId: string, messageId: string, _options?: unknown) => {
      open.add(messageId);
      const snapshot: ThreadSnapshot = {
        status: "ready",
        root: message(messageId),
        replies: [],
        error: undefined,
        canLoadMore: false,
        limited: false,
      };
      return {
        snapshot: () => snapshot,
        subscribe: () => () => {},
        refresh: vi.fn(async () => {}),
        loadMore: vi.fn(async () => {}),
        retarget: vi.fn<ThreadView["retarget"]>(async () => "selected"),
        dispose: vi.fn(() => open.delete(messageId)),
      } satisfies ThreadView;
    },
  );
  const list = {
    status: "ready",
    channels: [{ id: "general", name: "General" }],
  };
  const profiles = new Map([["b".repeat(64), { name: "Avery" }]]);
  const session = {
    thread,
    profiles: {
      subscribe: () => () => {},
      snapshot: () => profiles,
      ensure: vi.fn(async () => {}),
    },
    channels: { subscribeList: () => () => {}, list: () => list },
    media: (url: string) => url,
  } as unknown as RelaySession;
  return { session, thread, open };
}

it("shows each linked message as a card that opens its link", () => {
  const { session, thread } = fakeSession();
  const onOpenLink = vi.fn(() => true);
  render(
    <MessageLinkCards
      urls={[link(1)]}
      session={session}
      scope="community"
      onOpenLink={onOpenLink}
    />,
  );
  const card = screen.getByRole("link");
  expect(card.textContent).toContain("Avery");
  expect(card.textContent).toContain("General");
  expect(card.textContent).toContain(`linked body ${id(1).slice(-2)}`);
  expect(thread).toHaveBeenCalledWith("general", id(1), {
    exact: true,
    priority: "background",
  });
  const click = fireEvent.click(card);
  expect(click).toBe(false);
  expect(onOpenLink).toHaveBeenCalledWith(link(1));
});

it(`shows at most ${MESSAGE_CARDS} cards for one message`, () => {
  const { session } = fakeSession();
  render(
    <MessageLinkCards
      urls={[1, 2, 3, 4].map(link)}
      session={session}
      scope="community"
      onOpenLink={() => true}
    />,
  );
  expect(screen.getAllByRole("link")).toHaveLength(MESSAGE_CARDS);
});

it(`holds at most ${CARD_READERS} readers, and a waiting card reads once one frees`, () => {
  const { session, open } = fakeSession();
  const rows = Array.from({ length: CARD_READERS + 1 }, (_, n) => (
    <MessageLinkCards
      key={link(n + 1)}
      urls={[link(n + 1)]}
      session={session}
      scope="community"
      onOpenLink={() => true}
    />
  ));
  const { rerender } = render(<>{rows}</>);
  expect(open.size).toBe(CARD_READERS);
  expect(screen.getAllByRole("link")).toHaveLength(CARD_READERS);
  expect(open.has(id(CARD_READERS + 1))).toBe(false);
  rerender(<>{rows.slice(1)}</>);
  expect(open.has(id(1))).toBe(false);
  expect(open.has(id(CARD_READERS + 1))).toBe(true);
  expect(screen.getAllByRole("link")).toHaveLength(CARD_READERS);
});

it("shows one card for links naming the same message, and says when a card can't open", () => {
  const { session } = fakeSession();
  render(
    <MessageLinkCards
      urls={[link(1), link(1).replace(id(1), id(1).toUpperCase())]}
      session={session}
      scope="community"
      onOpenLink={() => false}
    />,
  );
  const cards = screen.getAllByRole("link");
  expect(cards).toHaveLength(1);
  fireEvent.click(cards[0] as HTMLElement);
  expect(
    screen.getByText("This Buzz link couldn’t be opened here."),
  ).toBeTruthy();
});
