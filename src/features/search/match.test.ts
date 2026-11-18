import { expect, it } from "vitest";
import {
  MatchRank,
  matchedPositions,
  matchName,
  matchRank,
  rankTerms,
  searchTerms,
  TERMS_APART,
} from "./match";
import { matchPerson } from "./person-match";

/** One name's rule, as channel and direct message rows use it. */
const nameRank = (name: string, needle: string) =>
  rankTerms(needle, (text) => matchRank(name, text));

it("splits typed text into its words", () => {
  expect(searchTerms("community buzz")).toEqual(["community", "buzz"]);
  expect(searchTerms("  dark \t settings\n")).toEqual(["dark", "settings"]);
  expect(searchTerms("alice")).toEqual(["alice"]);
  expect(searchTerms("   ")).toEqual([]);
});

it("ranks one word exactly as the row's own rule ranks it", () => {
  const names = [
    "alice",
    "Alice Fixture",
    "Carol Fixture",
    "buzz-community",
    "team-launch-planning",
    "debounce-tags",
    "Show live and recent agent work alongside conversations.",
  ];
  const words = ["alice", "alce", "tlp", "beta", "bc", "wes", "mute", "x"];
  for (const name of names)
    for (const word of words) {
      expect(nameRank(name, word)).toBe(matchRank(name, word));
      expect(matchedPositions(name, word)).toEqual(
        matchName(name, word)?.positions,
      );
    }
  // Spaces around one word do not make it several.
  expect(nameRank("Alice Fixture", "fixture ")).toBe(
    matchRank("Alice Fixture", "fixture "),
  );
  // A word the rule misses is a miss, whichever way the rule says so.
  expect(rankTerms("alice", () => undefined)).toBeUndefined();
  expect(rankTerms("alice", () => Infinity)).toBeUndefined();
});

it("keeps the whole text's rank when the whole text matches", () => {
  // A phrase in the name, and the looser ranks that ignore the space.
  expect(nameRank("Alice Fixture", "alice fixture")).toBe(MatchRank.exact);
  expect(nameRank("Alice Fixture, Bob Fixture", "alice fixture")).toBe(
    MatchRank.prefix,
  );
  expect(nameRank("buzz-community", "buzz community")).toBe(MatchRank.wordRuns);
  expect(nameRank("big-plans", "b gp")).toBe(MatchRank.inOrder);
});

it("matches several words apart, in any order, by the weakest word", () => {
  // "community" starts a later word (2); "buzz" starts the name (1).
  expect(nameRank("buzz-community", "community buzz")).toBe(
    TERMS_APART + MatchRank.wordStart,
  );
  expect(nameRank("Alice Fixture", "fixture alice")).toBe(
    TERMS_APART + MatchRank.wordStart,
  );
  // Each word keeps the name rule's loose ranks: "alce" is letters in order.
  expect(nameRank("Alice Fixture", "fixture alce")).toBe(
    TERMS_APART + MatchRank.inOrder,
  );
  // Every word must match.
  expect(nameRank("buzz-community", "community fuzz")).toBeUndefined();
  expect(nameRank("Alice Fixture", "fixture alice bob")).toBeUndefined();
});

it("ranks a row found only word by word after every whole-text match", () => {
  const loosest = MatchRank.inOrder + 2; // the loosest rank plus a penalty
  expect(nameRank("buzz-community", "community buzz")).toBeGreaterThan(loosest);
  // A phrase in one name leads a name that holds the words apart.
  const names = ["notes-for-voice", "my voice notes", "Voice Notes"];
  expect(
    names
      .map((name) => ({ name, rank: nameRank(name, "voice notes") }))
      .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
      .map(({ name }) => name),
  ).toEqual(["Voice Notes", "my voice notes", "notes-for-voice"]);
});

it("lets each word match a different field, with that field's cap and penalty", () => {
  // A plugin row: its name, then its description by contiguous text only,
  // two steps behind.
  const row =
    (name: string, description: string) =>
    (text: string): number => {
      const sentence = matchRank(`plugins ${description}`, text);
      return Math.min(
        matchRank(name, text) ?? Infinity,
        sentence !== undefined && sentence <= MatchRank.substring
          ? sentence + 2
          : Infinity,
      );
    };
  const huddles = row("Huddles", "Start audio conversations in your channels.");
  // Name (1), and description word start (2) plus its penalty.
  expect(rankTerms("huddles audio", huddles)).toBe(TERMS_APART + 4);
  expect(rankTerms("audio huddles", huddles)).toBe(TERMS_APART + 4);
  // Both words in the description.
  expect(rankTerms("audio channels", huddles)).toBe(TERMS_APART + 4);
  // The cap still holds for each word: "ado" is in the description only as
  // letters in order.
  expect(rankTerms("huddles ado", huddles)).toBeUndefined();
  // One word is never split, so the cap holds for it as before.
  expect(rankTerms("alice", huddles)).toBeUndefined();
});

it("underlines the whole text's match, or failing that each word's", () => {
  const marked = (label: string, needle: string) => {
    const positions = new Set(matchedPositions(label, needle));
    return [...label]
      .map((char, index) => (positions.has(index) ? char.toUpperCase() : "."))
      .join("");
  };
  // The whole text: as `matchName` underlines it, the space included.
  expect(marked("alice fixture", "alice fix")).toBe("ALICE FIX....");
  expect(matchedPositions("buzz-community", "buzz community")).toEqual(
    matchName("buzz-community", "buzz community")?.positions,
  );
  // Words apart: every word, in the label's order.
  expect(marked("alice fixture", "fixture alice")).toBe("ALICE.FIXTURE");
  expect(marked("buzz-community", "comm buzz")).toBe("BUZZ.COMM.....");
  // A word the row holds in another field underlines nothing here.
  expect(marked("huddles", "audio hud")).toBe("HUD....");
  expect(matchedPositions("huddles", "audio channels")).toBeUndefined();
  // The label's own rule decides: a person's name matches at word starts.
  expect(
    matchedPositions("Alice Fixture", "fixture alice", matchPerson),
  ).toEqual([0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12]);
  expect(
    matchedPositions("Alice Fixture", "ixture alice", matchPerson),
  ).toEqual([0, 1, 2, 3, 4]);
});
