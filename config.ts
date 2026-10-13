import { Config, Option, Schema } from "effect";

export const SlackConfig = Config.all({
  botToken: Config.Redacted("BOT_TOKEN"),
  appToken: Config.Redacted("APP_TOKEN"),
}).pipe(Config.nested("SLACK"));

const MinEmojiLength = Config.schema(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  "MIN_EMOJI_LENGTH",
);

export const BotConfig = Config.all({
  ignoredEmojis: Config.Array(Schema.String, "IGNORED_EMOJIS").pipe(
    Config.withDefault<ReadonlyArray<string>>([]),
  ),
  minEmojiLength: MinEmojiLength.pipe(Config.option),
}).pipe(
  Config.nested("BOT"),
  Config.withDefault({
    ignoredEmojis: [] as ReadonlyArray<string>,
    minEmojiLength: Option.none<number>(),
  }),
);
