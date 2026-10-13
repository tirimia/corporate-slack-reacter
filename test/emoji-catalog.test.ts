import { expect, test } from "bun:test";
import { Option } from "effect";
import { selectReactable } from "../emoji-catalog.ts";

test("keeps aliases and drops ignored names then short names", () => {
  const names = ["ok", "e", "shipit", "partyparrot"];
  const result = selectReactable(names, ["ok"], Option.some(3));
  expect(result).toEqual(["shipit", "partyparrot"]);
});

test("missing min length does not filter by length", () => {
  const names = ["ok", "partyparrot"];
  expect(selectReactable(names, [], Option.none())).toEqual(names);
});
