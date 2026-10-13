import { expect, test } from "bun:test";
import { ConfigProvider, Effect, Option } from "effect";
import { BotConfig } from "../config.ts";

const parseBot = (value: unknown) =>
  Effect.runSync(BotConfig.parse(ConfigProvider.fromUnknown(value)));

test("missing BOT config defaults to no filters", () => {
  const config = parseBot({});
  expect(config.ignoredEmojis).toEqual([]);
  expect(Option.isNone(config.minEmojiLength)).toBe(true);
});

test("parses ignored emojis and min length", () => {
  const config = parseBot({
    BOT: {
      IGNORED_EMOJIS: "ok,e",
      MIN_EMOJI_LENGTH: 3,
    },
  });
  expect(config.ignoredEmojis).toEqual(["ok", "e"]);
  expect(config.minEmojiLength).toEqual(Option.some(3));
});

test("rejects min emoji length below 1", () => {
  expect(() =>
    parseBot({
      BOT: { MIN_EMOJI_LENGTH: 0 },
    }),
  ).toThrow();
});
