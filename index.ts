import { Effect, Layer } from "effect";
import { EmojiCatalog } from "./emoji-catalog.ts";
import { SlackApi } from "./slack-api.ts";
import { SlackApp } from "./slack-app.ts";

const live = SlackApp.layer.pipe(
  Layer.provide(EmojiCatalog.layer),
  Layer.provide(SlackApi.layer),
);

await Effect.runPromise(Layer.launch(live));
