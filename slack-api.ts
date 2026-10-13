import { WebAPIPlatformError, WebClient } from "@slack/web-api";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { SlackConfig } from "./config.ts";

export class SlackApiError extends Schema.TaggedError<SlackApiError>()("SlackApi.Error", {
  operation: Schema.Literals(["listEmojis", "addReaction"]),
  slackError: Schema.optionalKey(Schema.String),
  message: Schema.String,
}) {}

export interface Interface {
  readonly listEmojis: () => Effect.Effect<ReadonlyArray<string>, SlackApiError>;
  readonly addReaction: (args: {
    readonly name: string;
    readonly channel: string;
    readonly timestamp: string;
  }) => Effect.Effect<void, SlackApiError>;
}

export class Service extends Context.Service<Service, Interface>()("@app/SlackApi") {}

const toSlackApiError = (
  operation: "listEmojis" | "addReaction",
  cause: unknown,
): SlackApiError => {
  if (cause instanceof WebAPIPlatformError) {
    return new SlackApiError({
      operation,
      slackError: cause.data.error,
      message: cause.message,
    });
  }
  if (cause instanceof SlackApiError) {
    return cause;
  }
  return new SlackApiError({
    operation,
    message: cause instanceof Error ? cause.message : String(cause),
  });
};

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const { botToken } = yield* SlackConfig;
    const client = new WebClient(Redacted.value(botToken));

    const listEmojis = Effect.fn("SlackApi.listEmojis")(function* () {
      const response = yield* Effect.tryPromise({
        try: () => client.emoji.list(),
        catch: (cause) => toSlackApiError("listEmojis", cause),
      });
      if (response.ok !== true || response.emoji === undefined) {
        return yield* new SlackApiError({
          operation: "listEmojis",
          slackError: response.error,
          message: response.error ?? "emoji.list was not ok",
        });
      }
      return Object.keys(response.emoji);
    });

    const addReaction = Effect.fn("SlackApi.addReaction")(function* (args: {
      readonly name: string;
      readonly channel: string;
      readonly timestamp: string;
    }) {
      yield* Effect.tryPromise({
        try: () =>
          client.reactions.add({
            name: args.name,
            channel: args.channel,
            timestamp: args.timestamp,
          }),
        catch: (cause) => toSlackApiError("addReaction", cause),
      });
    });

    return { listEmojis, addReaction };
  }),
);

export * as SlackApi from "./slack-api.ts";
