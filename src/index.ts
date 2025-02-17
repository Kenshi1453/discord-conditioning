import * as dotenv from "dotenv";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { AsyncQueue } from "./queue.js";
import { PiShockAPI } from "./pishock.js";
import { sleep, waitUntil } from "./utils.js";
import { BaseTrigger, ContinuousTrigger, ImmediateDontHaveTrigger, ImmediateMustHaveTrigger } from "./types-of-triggers.js";
import { getEarliestOfAsyncIterators } from "./utils.js";

export type QueueType = {
  intensity: number;
  duration: number;
  message: string;
  author: string;
}

// use | null for the queue even tho it will never be null teehee i love typescript :ppp
const WHO_TO_STALK: { id: string, triggers: BaseTrigger[], queue: AsyncQueue<QueueType> | null }[] = [
  {
    id: "1",
    triggers: [
      // add your triggers
    ],
    queue: null
  },
  {
    id: "2",
    triggers: [
      // add your triggers
    ],
    queue: null
  }
];

const SHOCK_QUEUES: AsyncQueue<QueueType>[] = []
for (const stalk of WHO_TO_STALK) {
  const queue = new AsyncQueue<QueueType>();
  SHOCK_QUEUES.push(queue);
  stalk.queue = queue;
}

let SHOULD_READ_QUEUE = true;

dotenv.config();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on("messageCreate", (message) => {
  const { author, content } = message;
  for (const stalk of WHO_TO_STALK) {
    if (author.id !== stalk.id) continue;

    for (const trigger of stalk.triggers) {
      trigger.checkMessageAndDoShit(content.toLowerCase(), stalk.queue!, author.displayName)
    }
  }
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

const pishockAPI = new PiShockAPI(
  process.env.PISHOCK_API_KEY!,
  process.env.PISHOCK_USERNAME!,
  process.env.PISHOCK_SHARE_CODE!,
  process.env.PISHOCK_API_URL!
);

process.stdin.on("data", (d) => {
  const str = d.toString("utf-8").trim();
  if(str === "pause"){
    SHOULD_READ_QUEUE = false
  } else if(str === "resume"){
    SHOULD_READ_QUEUE = true;
  }
})


function doTheFunny(q: AsyncQueue<QueueType>): () => void {
  return () => {
    q.dequeue().then(v => {
      // console.log("Waiting for queue input...");
      const { intensity, duration, message, author } = v;
      if (!SHOULD_READ_QUEUE) {
        return waitUntil(() => SHOULD_READ_QUEUE).then(() => v);
      }
      return v
    }).then(v => {
      // Do funnies with the thing you got :3
      setTimeout(doTheFunny(q), 2 * v.duration * 1000)
    })
  }
}

for (const q of SHOCK_QUEUES) {
  setTimeout(doTheFunny(q))
}
