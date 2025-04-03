import { CommandInteraction, SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from "discord.js";

export async function execute(interaction: CommandInteraction) {
    await interaction.reply("lol")
}

function addArgsToSubCommandAndSubGroup(sub: SlashCommandSubcommandBuilder) {
    return sub.addUserOption(option =>
        option.setName("user")
            .setDescription("User for whom the trigger will be")
            .setRequired(true)
    )
}

function addTriggerSubcommandsToQueueSubGroup(grp: SlashCommandSubcommandGroupBuilder) {
    return grp
        .addSubcommand(sub =>
            addArgsToSubCommandAndSubGroup(sub.setName("musthave")
                .setDescription("Must Have Trigger (if message doesn't contain trigger, 1 activation)"))
        )
        .addSubcommand(sub =>
            addArgsToSubCommandAndSubGroup(sub.setName("donthave")
                .setDescription("Don't have Trigger (for each occurence of trigger, 1 activation)"))
        )
}

export const data = new SlashCommandBuilder()
    .setName("addtrigger")
    .setDescription("Adds a trigger for an user")
    .addSubcommandGroup(grp =>
        addTriggerSubcommandsToQueueSubGroup(
            grp.setName("pishock")
                .setDescription("PiShock trigger")
        )
    ).addSubcommandGroup(grp =>
        addTriggerSubcommandsToQueueSubGroup(
            grp.setName("lovense")
                .setDescription("Lovense trigger")
        )
    );