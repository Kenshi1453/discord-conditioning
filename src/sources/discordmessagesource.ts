import { Client, Message, OmitPartialGroupDMChannel } from "discord.js";
import { AbstractSource } from "./source.js";

class DiscordMessageSource extends AbstractSource {
    private discordClient: Client;
    private callback: (mess: OmitPartialGroupDMChannel<Message<boolean>>) => void;

    constructor(discordClient: Client) {
        super();
        if(!discordClient.isReady())
            throw new Error("Please initialize discord client first!")
        this.discordClient = discordClient;
        this.callback = (message) => {
            const { author, content } = message;
            this.broadcastMessage(author.id, content);
        }
        this.discordClient.on("messageCreate", this.callback);
    }

    destroy(): void {
        this.discordClient.removeListener("messageCreate", this.callback)
    }
}

export {DiscordMessageSource}