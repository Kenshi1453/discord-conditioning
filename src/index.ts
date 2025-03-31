import * as dotenv from "dotenv";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { AsyncQueue } from "./queue.js";
import { PiShockAPI } from "./pishock.js";
import { sleep, waitUntil } from "./utils.js";
import { BaseTrigger, ContinuousTrigger, ImmediateDontHaveTrigger, ImmediateMustHaveTrigger } from "./types-of-triggers.js";
import { DiscordMessageSource } from "./sources/discordmessagesource.js";
import { QueueLoop, QueueType } from "./queueloop.js";
import { Source, SourceEventListener } from "./sources/source.js";
dotenv.config();

export type QueueItemType = {
  intensity: number;
  duration: number;
  message: string;
  author: string;
}

const PISHOCK_SOMEONE = new PiShockAPI(
  process.env.PISHOCK_API_KEY!,
  process.env.PISHOCK_USERNAME!,
  process.env.PISHOCK_SHARE_CODE!,
  process.env.PISHOCK_API_URL!,
)

class Stalker implements SourceEventListener {
  private _queue: QueueType;
  private id: string;
  private triggers: BaseTrigger[];

  constructor(id: string, triggers: BaseTrigger[], queueCallback: (v: QueueItemType) => Promise<number>) {
    this.id = id;
    this.triggers = triggers;
    this._queue = { queue: new AsyncQueue(), shouldRead: true, callback: queueCallback }
  }

  public get queue(): QueueType {
    return this._queue;
  }

  notify(id: string, mess: string): void {
    if (id !== this.id) return;
    for (const trigger of this.triggers) {
      trigger.checkMessageAndDoShit(mess, this.queue.queue, id)
    }
  }

}

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const readyPromise = new Promise<void>((res) => {
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    res()
  });
})

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

// Wait for it to be ready
await readyPromise;

const messageSource = new DiscordMessageSource(client);

const queueLoop = new QueueLoop()


function setupStalker(stalker: Stalker, sources: Source[], loop: QueueLoop){
  for(const source of sources){
    source.addListener(stalker)
  }
  queueLoop.addQueue(stalker.queue)
}

// WRITE BELOW!!!
// Use anonymous instance because fuck it. When making the commands I'll probably keep them in a list or smth
// so we can delete them easily
setupStalker(new Stalker(
  "SOMEONES DISCORD ID",
  [
    // Will trigger on each occurence of "bitch"
      new ImmediateDontHaveTrigger(1, 2, ["bitch"])
  ],
  async (v) => {
    // Some dummy message so you can test it
    console.log("TEST 1")
    return 2 * v.duration * 1000;
  }
), [messageSource], queueLoop)