import { expect, test } from "bun:test";
import { ConfigProvider, Effect, Layer, Ref } from "effect";
import { TestClock } from "effect/testing";
import { EmojiCatalog } from "../emoji-catalog.ts";
import { SlackApi, SlackApiError } from "../slack-api.ts";

const botConfig = ConfigProvider.layer(
  ConfigProvider.fromUnknown({
    BOT: {
      IGNORED_EMOJIS: "ok",
      MIN_EMOJI_LENGTH: 2,
    },
  }),
);

const slackApiLayer = (list: Ref.Ref<ReadonlyArray<Effect.Effect<ReadonlyArray<string>, SlackApiError>>>) =>
  Layer.effect(
    SlackApi.Service,
    Effect.gen(function* () {
      return {
        listEmojis: Effect.fn("SlackApi.Test.listEmojis")(function* () {
          const remaining = yield* Ref.get(list);
          const [next, ...rest] = remaining;
          if (next === undefined) {
            return yield* new SlackApiError({
              operation: "listEmojis",
              message: "no more stubbed emoji lists",
            });
          }
          yield* Ref.set(list, rest);
          return yield* next;
        }),
        addReaction: () =>
          Effect.die("SlackApi.addReaction should not be called from catalog tests"),
      };
    }),
  );

const runCatalog = <A, E>(
  lists: ReadonlyArray<Effect.Effect<ReadonlyArray<string>, SlackApiError>>,
  program: Effect.Effect<A, E, EmojiCatalog.Service>,
) =>
  Effect.gen(function* () {
    const list = yield* Ref.make(lists);
    return yield* program.pipe(
      Effect.provide(
        EmojiCatalog.layer.pipe(
          Layer.provide(slackApiLayer(list)),
          Layer.provide(botConfig),
        ),
      ),
      Effect.provide(TestClock.layer()),
    );
  }).pipe(Effect.runPromise);

test("loads filtered catalog before serving get", async () => {
  const names = await runCatalog(
    [Effect.succeed(["ok", "e", "partyparrot", "shipit"])],
    Effect.gen(function* () {
      const catalog = yield* EmojiCatalog.Service;
      return yield* catalog.get();
    }),
  );
  expect(names).toEqual(["partyparrot", "shipit"]);
});

test("keeps last good list when an hourly refresh fails", async () => {
  const names = await runCatalog(
    [
      Effect.succeed(["ok", "partyparrot"]),
      Effect.fail(
        new SlackApiError({ operation: "listEmojis", message: "slack down" }),
      ),
      Effect.fail(
        new SlackApiError({ operation: "listEmojis", message: "slack down" }),
      ),
      Effect.fail(
        new SlackApiError({ operation: "listEmojis", message: "slack down" }),
      ),
    ],
    Effect.gen(function* () {
      const catalog = yield* EmojiCatalog.Service;
      const first = yield* catalog.get();
      expect(first).toEqual(["partyparrot"]);

      yield* TestClock.adjust("1 hour");
      yield* TestClock.adjust("1 second");

      return yield* catalog.get();
    }),
  );
  expect(names).toEqual(["partyparrot"]);
});

test("writes a successful hourly refresh", async () => {
  const names = await runCatalog(
    [
      Effect.succeed(["partyparrot"]),
      Effect.succeed(["partyparrot", "shipit"]),
    ],
    Effect.gen(function* () {
      const catalog = yield* EmojiCatalog.Service;
      expect(yield* catalog.get()).toEqual(["partyparrot"]);
      yield* TestClock.adjust("1 hour");
      yield* TestClock.adjust("1 second");
      return yield* catalog.get();
    }),
  );
  expect(names).toEqual(["partyparrot", "shipit"]);
});
