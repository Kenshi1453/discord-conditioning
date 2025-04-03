import { AutocompleteInteraction, Client, ClientOptions, Collection, CommandInteraction, ContextMenuCommandBuilder, SlashCommandBuilder } from "discord.js";
import * as fs from 'node:fs'
import * as path from 'node:path'

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CommandType = { 
    data: SlashCommandBuilder | ContextMenuCommandBuilder, 
    execute: (interaction: CommandInteraction) => Promise<void>,
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>
 }

export class DiscordClient extends Client {
    commands: Collection<string, CommandType> = new Collection()
    commandsReady: Promise<void>

    constructor(options: ClientOptions) {
        super(options)
        const foldersPath = path.join(__dirname, 'commands');
        const commandFolders = fs.readdirSync(foldersPath);

        const promises: Promise<any>[] = []

        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const fileUrl = pathToFileURL(filePath)
                promises.push(import(fileUrl.toString()).then(command => {
                    // Set a new item in the Collection with the key as the command name and the value as the exported module
                    if ('data' in command && 'execute' in command) {
                        if(this.commands.has(command.data.name)) throw new Error('Two commands with conflicting name!')
                        this.commands.set(command.data.name, command);
                    } else {
                        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                    }
                }))
            }
        }
        this.commandsReady = Promise.all(promises).then().catch(e => console.error(e)) as Promise<void>
    }
}