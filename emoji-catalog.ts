import { Context, Effect, Layer, Option, Ref, Schedule } from "effect";
import { BotConfig } from "./config.ts";
import { SlackApi } from "./slack-api.ts";

export interface Interface {
  readonly get: () => Effect.Effect<ReadonlyArray<string>>;
}

export class Service extends Context.Service<Service, Interface>()("@app/EmojiCatalog") {}

export const selectReactable = (
  names: ReadonlyArray<string>,
  ignoredEmojis: ReadonlyArray<string>,
  minEmojiLength: Option.Option<number>,
): ReadonlyArray<string> => {
  const ignored = new Set(ignoredEmojis);
  return names.filter((name) => {
    if (ignored.has(name)) {
      return false;
    }
    if (Option.isSome(minEmojiLength) && name.length <= minEmojiLength.value) {
      return false;
    }
    return true;
  });
};

const bootRetry = Schedule.exponential("1 second").pipe(Schedule.jittered);

const hourlyRetry = Schedule.exponential("100 millis").pipe(
  Schedule.upTo({ times: 2 }),
);

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const slackApi = yield* SlackApi.Service;
    const { ignoredEmojis, minEmojiLength } = yield* BotConfig;

    const load = Effect.fn("EmojiCatalog.load")(function* () {
      const names = yield* slackApi.listEmojis();
      const reactable = selectReactable(names, ignoredEmojis, minEmojiLength);
      yield* Effect.log("EmojiCatalog.loaded").pipe(
        Effect.annotateLogs({
          slackCount: names.length,
          reactableCount: reactable.length,
        }),
      );
      return reactable;
    });

    const initial = yield* load().pipe(Effect.retry(bootRetry));
    const ref = yield* Ref.make(initial);

    const refreshPass = load().pipe(
      Effect.retry(hourlyRetry),
      Effect.flatMap((next) => Ref.set(ref, next)),
      Effect.tapError((error) =>
        Effect.logError("EmojiCatalog.refresh_failed", error),
      ),
      Effect.ignore,
    );

    yield* refreshPass.pipe(
      Effect.delay("1 hour"),
      Effect.repeat(Schedule.spaced("1 hour")),
      Effect.forkScoped,
    );

    const get = Effect.fn("EmojiCatalog.get")(function* () {
      return yield* Ref.get(ref);
    });

    return { get };
  }),
);

export * as EmojiCatalog from "./emoji-catalog.ts";
