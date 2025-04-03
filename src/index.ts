import * as dotenv from "dotenv";
import { Client, Events, GatewayIntentBits, MessageFlags, UserContextMenuCommandInteraction } from "discord.js";
import { AsyncQueue } from "./queue.js";
import { PiShockAPI } from "./pishock.js";
import { BaseTrigger, ContinuousTrigger, ImmediateDontHaveTrigger, ImmediateMustHaveTrigger } from "./types-of-triggers.js";
import { DiscordMessageSource } from "./sources/discordmessagesource.js";
import { QueueLoop, QueueType } from "./queueloop.js";
import { Source, SourceEventListener } from "./sources/source.js";
import { DiscordClient } from "./discordclient.js";
import { CODES_STORE } from "./stores/usercodes-store.js";
import { QueueManager } from "./queuemanager.js";
dotenv.config();

export type QueueItemType = {
  intensity: number;
  duration: number;
  message: string;
  author: string;
}

const PISHOCK_NEAP = new PiShockAPI(
  process.env.PISHOCK_API_KEY!,
  process.env.PISHOCK_USERNAME!,
  process.env.PISHOCK_SHARE_CODE_NEAP!,
  process.env.PISHOCK_API_URL!,
)
const PISHOCK_INSANITY = new PiShockAPI(
  process.env.PISHOCK_API_KEY!,
  process.env.PISHOCK_USERNAME!,
  process.env.PISHOCK_SHARE_CODE_INSANITY!,
  process.env.PISHOCK_API_URL!,
)

const PISHOCK_SCAM = new PiShockAPI(
  process.env.PISHOCK_API_KEY!,
  process.env.PISHOCK_USERNAME!,
  process.env.PISHOCK_SHARE_CODE_SCAM!,
  process.env.PISHOCK_API_URL!,
)

class Stalker implements SourceEventListener {
  private _queue: QueueType;
  private id: string;
  private triggers: BaseTrigger[];

  constructor(id: string, triggers: BaseTrigger[], queue: QueueType) {
    this.id = id;
    this.triggers = triggers;
    this._queue = queue
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
const client = new DiscordClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if(!(interaction.client instanceof DiscordClient)) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isContextMenuCommand()) return;
  if(!(interaction.client instanceof DiscordClient)) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isAutocomplete()) return;
  if(!(interaction.client instanceof DiscordClient)) return;
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  if(command.autocomplete === undefined) return;

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    console.error(error);
  }
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

export const QUEUE_MANAGER = new QueueManager()

client.on("messageCreate", (mess) => {
  console.log("WTF MESSAGE HAPPENED")
})


// function setupStalker(stalker: Stalker, sources: Source[], loop: QueueLoop) {
//   for (const source of sources) {
//     source.addListener(stalker)
//   }
//   queueManager.addQueue(stalker.queue)
// }

// // Use anonymous instance because fuck it. When making the commands I'll probably keep them in a list or smth
// // so we can delete them easily
// setupStalker(new Stalker(
//   // test on me :ppp
//   "730171693796032655",
//   [
//     new ImmediateDontHaveTrigger(1, 2, ["bitch"])
//   ],
//   {
//     queue: new AsyncQueue(),
//     shouldRead: true,
//     callback: async (v) => {
//       console.log("TEST 1")
//       return 2*v.duration * 1000
//     }
//   }
// ), [messageSource], queueLoop)

// setupStalker(new Stalker(
//   // test on me 2 :ppp
//   "730171693796032655",
//   [
//     new ImmediateDontHaveTrigger(1, 4, ["fuck"])
//   ],
//   {
//     queue: new AsyncQueue(),
//     shouldRead: true,
//     callback: async (v) => {
//       console.log("TEST 2")
//       return 2*v.duration * 1000
//     }
//   }
// ), [messageSource], queueLoop)



