import * as dotenv from "dotenv";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { AsyncQueue } from "./queue.js";
import { PiShockAPI } from "./pishock.js";
import { sleep, waitUntil } from "./utils.js";
import { BaseTrigger, ContinuousTrigger, ImmediateDontHaveTrigger, ImmediateMustHaveTrigger } from "./types-of-triggers.js";

export type QueueType = {
  intensity: number;
  duration: number;
  message: string;
  author: string;
}

type QueueListType = { queue: AsyncQueue<QueueType>, callback: (v: QueueType) => number }
type StalkType = { id: string, triggers: BaseTrigger[], queue: QueueListType }

function generateQueueAndStalking(): [StalkType[], QueueListType[]] {



  const WHO_TO_STALK: { id: string, triggers: BaseTrigger[], queue: QueueListType }[] = [
    {
      // first queue
      id: "1",
      triggers: [
        // This is a continuous trigger. The first list is the list of the trigger words. When one of them has been said, they will be 
        // constantly be triggered after a set interval (twice the duration parameter) until the person says the counter-word.
        // in this example the trigger word is "weeb" and the counter "word" is 'I deeply apologize for having upset you, oh japanese master'
        new ContinuousTrigger(1, 1, ["weeb"], ["I deeply apologize for having upset you, oh japanese master"]),
        // This is a trigger that means that you *need* to always have the trigger word in each message or else it will trigger.
        // so each message that doesn't contain "owo" are 1 trigger.
        new ImmediateMustHaveTrigger(2, 2, ["owo"], true),
        // This is a trigger that means that you should NEVER have the trigger word in your message.
        // It counts **occurences** of the word. So the message "ewe ewe ewe" is effectively 3 triggers
        new ImmediateDontHaveTrigger(3, 3, ["ewe"]),
      ],
      queue: {
        queue: new AsyncQueue<QueueType>(),
        callback: (v) => { console.log(`GET PUNISHED IDIOT ('${v.message}')`); return 2 * v.duration * 1000 }
      },
    },
    {
      // second queue
      // this one uses the same id as the previous item because I want to show how to have different queue actions AND timings
      // for the same person but with different triggers.
      id: "1",
      triggers: [
        // Shows how different items could interact. In the previous we have a "MustHave" type of trigger, but for this specific queue with 
        // a different action on trigger, it is instead a DontHave, meaning we can weave those triggers together
        new ImmediateDontHaveTrigger(2, 2, ["owo"], true),
      ],
      queue: {
        queue: new AsyncQueue<QueueType>(),
        callback: (v) => { console.log(`GET REWARDED IDIOT ('${v.message}')`); return v.duration * 1000 }
      },
    },
    {
      // someone else
      id: "2",
      triggers: [
        new ImmediateDontHaveTrigger(50, 15, ["lmao"], true)
      ],
      queue: {
        queue: new AsyncQueue<QueueType>(),
        callback: (v) => { console.log(`Yet another completely different message ('${v.message}')`); return 2 * v.duration * 1000 }
      },
    }
  ];

  return [WHO_TO_STALK, WHO_TO_STALK.map((v) => v.queue)]
}

const [WHO_TO_STALK, QUEUES] = generateQueueAndStalking();

// use | null for the queue even tho it will never be null teehee i love typescript :ppp

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
      trigger.checkMessageAndDoShit(content.toLowerCase(), stalk.queue.queue, author.displayName)
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
  if (str === "pause") {
    SHOULD_READ_QUEUE = false
  } else if (str === "resume") {
    SHOULD_READ_QUEUE = true;
  }
})


function doTheFunny(q: AsyncQueue<QueueType>, callback: (v: QueueType) => number): () => void {
  return () => {
    q.dequeue().then(v => {
      const { intensity, duration, message, author } = v;
      if (!SHOULD_READ_QUEUE) {
        return waitUntil(() => SHOULD_READ_QUEUE).then(() => v);
      }
      return v
    }).then(v => {
      const sleepTime = callback(v);
      setTimeout(doTheFunny(q, callback), sleepTime)
    })
  }
}

for (const q of QUEUES) {
  setTimeout(doTheFunny(q.queue, q.callback))
}
