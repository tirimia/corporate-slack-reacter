import { expect, test } from "bun:test";
import { Effect, Ref } from "effect";
import { SlackApiError } from "../slack-api.ts";
import { makeHandleMessage } from "../slack-app.ts";

const runHandle = (
  names: ReadonlyArray<string>,
  text: string,
  failNamed: ReadonlyArray<string> = [],
) =>
  Effect.gen(function* () {
    const reactions = yield* Ref.make<ReadonlyArray<string>>([]);
    const handleMessage = makeHandleMessage(
      {
        listEmojis: () => Effect.die("unused"),
        addReaction: (args) =>
          Effect.gen(function* () {
            yield* Ref.update(reactions, (current) => [...current, args.name]);
            if (failNamed.includes(args.name)) {
              const slackError = args.name === "taken" ? "already_reacted" : "invalid_name";
              return yield* new SlackApiError({
                operation: "addReaction",
                slackError,
                message: slackError,
              });
            }
          }),
      },
      { get: () => Effect.succeed(names) },
    );

    yield* handleMessage({ channel: "C1", ts: "1.0", text });
    return yield* Ref.get(reactions);
  }).pipe(Effect.runPromise);

test("reacts to chaotic substring matches", async () => {
  const reactions = await runHandle(["ok", "partyparrot"], "Looking at the BOOK of partyparrot lore");
  expect(reactions).toEqual(["ok", "partyparrot"]);
});

test("treats already_reacted as success and still finishes other adds", async () => {
  const reactions = await runHandle(
    ["taken", "partyparrot"],
    "taken partyparrot",
    ["taken", "partyparrot"],
  );
  expect(reactions).toEqual(["taken", "partyparrot"]);
});
