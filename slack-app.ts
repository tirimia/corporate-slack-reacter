import { App } from "@slack/bolt";
import { Context, Effect, Layer, Redacted } from "effect";
import { SlackConfig } from "./config.ts";
import { EmojiCatalog } from "./emoji-catalog.ts";
import { SlackApi, SlackApiError } from "./slack-api.ts";

export interface IncomingMessage {
  readonly channel: string;
  readonly ts: string;
  readonly text: string;
}

export interface Interface {
  readonly handleMessage: (message: IncomingMessage) => Effect.Effect<void>;
}

export class Service extends Context.Service<Service, Interface>()("@app/SlackApp") {}

export const makeHandleMessage = (
  slackApi: SlackApi.Interface,
  catalog: EmojiCatalog.Interface,
) =>
  Effect.fn("SlackApp.handleMessage")(function* (message: IncomingMessage) {
    const names = yield* catalog.get();
    const haystack = message.text.toLowerCase();
    const hits = names.filter((name) => haystack.includes(name));

    yield* Effect.forEach(
      hits,
      (name) =>
        slackApi.addReaction({
          name,
          channel: message.channel,
          timestamp: message.ts,
        }).pipe(
          Effect.catchIf(
            (error): error is SlackApiError =>
              error._tag === "SlackApi.Error" && error.slackError === "already_reacted",
            () => Effect.void,
          ),
          Effect.tapError((error) =>
            Effect.logError("SlackApp.addReaction_failed", error).pipe(
              Effect.annotateLogs({ name }),
            ),
          ),
          Effect.ignore,
        ),
      { concurrency: 5, discard: true },
    );
  });

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const slackApi = yield* SlackApi.Service;
    const catalog = yield* EmojiCatalog.Service;
    const { botToken, appToken } = yield* SlackConfig;
    const handleMessage = makeHandleMessage(slackApi, catalog);

    const app = new App({
      token: Redacted.value(botToken),
      appToken: Redacted.value(appToken),
      socketMode: true,
    });

    app.message(async ({ message }) => {
      if (message.subtype !== undefined) {
        return;
      }
      if (typeof message.text !== "string") {
        return;
      }
      await Effect.runPromise(
        handleMessage({
          channel: message.channel,
          ts: message.ts,
          text: message.text,
        }),
      );
    });

    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => app.start(),
        catch: (cause) =>
          new Error(
            cause instanceof Error ? cause.message : `Bolt start failed: ${String(cause)}`,
          ),
      }),
      () => Effect.promise(() => app.stop()),
    );

    return { handleMessage };
  }),
);

export * as SlackApp from "./slack-app.ts";
