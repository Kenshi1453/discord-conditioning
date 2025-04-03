import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export async function execute(interaction: CommandInteraction) {
    await interaction.reply('Pong!');
}

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!')