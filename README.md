# corporate-slack-reacter

![reactions](./assets/reactions.png)

## Motivation

If you've spent any amount of time in a corporate slack workspace, you know how it goes: someone posts a normal message, and everyone keeps reacting with an emoji that represents the core object of the message.

I found that so trite that I cynically had to take it to its logical conclusion: getting a bot to start the chain so people pile on even more.

## How it works

This bot adds Slack reactions to messages. It loads the custom emoji list of the workspace. When the message text contains an emoji name from that list, the bot adds that reaction.

The match ignores letter case. The match is a substring, so a short name can match inside a longer word. The bot ignores names in `BOT_IGNORED_EMOJIS`. If you set `BOT_MIN_EMOJI_LENGTH`, the bot ignores names of that length or less. The bot loads the emoji list again every hour.

The bot reads only plain messages. It skips edits, joins, and bot messages.

## Install

Before you install the dependencies, install [Bun](https://bun.com) 1.4.2.

1. Install the dependencies.

   ```bash
   bun install
   ```

2. Put the configuration in the environment. The names are in [Configuration](#configuration).
3. Run the bot.

   ```bash
   bun run index.ts
   ```

When you run the bot on the host, Bun reads a `.env` file in this directory.

## Run with Docker

1. Build the image.

   ```bash
   docker build -t corporate-slack-reacter .
   ```

2. Run the container.

   ```bash
   docker run --rm --env-file .env corporate-slack-reacter
   ```

If you omit `--env-file .env`, Docker does not read the `.env` file.

Do not put tokens in the image. Do not commit tokens to git. When you run the container, pass the tokens.

## Configuration

The bot reads this configuration from the environment.

| Name | Required | Meaning |
| --- | --- | --- |
| `SLACK_BOT_TOKEN` | Yes | Bot token. It starts with `xoxb-`. |
| `SLACK_APP_TOKEN` | Yes | App-level token for Socket Mode. It starts with `xapp-`. |
| `BOT_IGNORED_EMOJIS` | No | Comma-separated emoji names to skip. The default is an empty list. |
| `BOT_MIN_EMOJI_LENGTH` | No | An integer of 1 or more. The bot skips names of this length or less. |

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
BOT_IGNORED_EMOJIS=ok,white_check_mark
BOT_MIN_EMOJI_LENGTH=3
```

## Slack app

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps).
2. Turn on Socket Mode.

   Socket Mode does not need a request URL.

3. Turn on Event Subscriptions.
4. Create an app-level token with the `connections:write` scope.
5. Set `SLACK_APP_TOKEN` to that token.
6. Add these bot token scopes:
   - `emoji:read`. The bot reads the custom emoji list.
   - `reactions:write`. The bot adds reactions.
   - `channels:history`. The bot reads messages in public channels.
7. Subscribe to the `message.channels` bot event.

   `channels:history` and `message.channels` cover public channels. If the bot must read other conversations, add the scope and the event for that conversation:

   - For private channels, add `groups:history` and `message.groups`.
   - For direct messages, add `im:history` and `message.im`.
   - For group direct messages, add `mpim:history` and `message.mpim`.

8. Install the app on the workspace.
9. Set `SLACK_BOT_TOKEN` to the bot token.
10. Invite the bot to each channel where it must react.

If you add a scope, install the app on the workspace again.
