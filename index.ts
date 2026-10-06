import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

async function getEmojis(): Promise<string[]> {
  const emojisResponse = await app.client.emoji.list()
  if (!emojisResponse.ok) {
    console.log("couldnt get emojis")
    return []
  }
  const emojis = Object.keys(emojisResponse.emoji!)
  console.log(`${emojis.length} emojis found`)
  console.log(emojis)
  return emojis
}

const emojis = await getEmojis();
app.message(async ({ message }) => {
  // Only new messages are looked at
  if (message.subtype !== undefined) {
    return
  }

  await Promise.all(
    emojis
      .filter((e) => message.text!.toLowerCase().includes(e))
      .map(
        name => app.client.reactions.add(
          { name, 'channel': message.channel, timestamp: message.ts }
        )))
})

await app.start();
