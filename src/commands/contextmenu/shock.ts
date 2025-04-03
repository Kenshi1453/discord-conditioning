import { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, CommandInteraction, ContextMenuCommandBuilder, MessageActionRowComponentBuilder, MessageComponentInteraction, MessageFlags, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, UserContextMenuCommandInteraction } from "discord.js";
import { QUEUE_MANAGER, QueueItemType } from "../../index.js";
import { NoPishockCodeError } from "../../queuemanager.js";
import { AsyncQueue } from "../../queue.js";
import { CODES_STORE } from "../../stores/usercodes-store.js";

async function doShock(queue: AsyncQueue<QueueItemType> | undefined, interaction: CommandInteraction | MessageComponentInteraction, userId: string, showShareCode: boolean) {
    const modal = new ModalBuilder()
        .setCustomId('selectShockParams')
        .setTitle("Select Shock Parameters")

    // Create the text input components
    const modalShockDuration = new TextInputBuilder()
        .setCustomId('shockDuration')
        // The label is the prompt the user sees for this input
        .setLabel("The shock duration (integer between 1-15)")
        // Short means only a single line of text
        .setStyle(TextInputStyle.Short);

    const modalShockIntensity = new TextInputBuilder()
        .setCustomId('shockIntensity')
        .setLabel("The shock intensity (integer between 1-100)")
        // Paragraph means multiple lines of text.
        .setStyle(TextInputStyle.Short);

    // An action row only holds one text input,
    // so you need one action row per text input.
    const firstActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(modalShockDuration);
    const secondActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(modalShockIntensity);

    // Add inputs to the modal
    if (showShareCode) {
        const shareCodeInput = new TextInputBuilder()
            .setCustomId('shareCode')
            .setLabel("The user's sharecode")
            .setStyle(TextInputStyle.Short)
        modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(shareCodeInput))
    }
    modal.addComponents(firstActionRow, secondActionRow);


    await interaction.showModal(modal)
    const modalResultInteraction = await interaction.awaitModalSubmit({ time: 30_000, filter: (interaction) => interaction.customId === 'selectShockParams' })
    const shockDuration = Number.parseInt(modalResultInteraction.fields.getTextInputValue('shockDuration'))
    const shockIntensity = Number.parseInt(modalResultInteraction.fields.getTextInputValue('shockIntensity'))

    if (Number.isNaN(shockDuration) || Number.isNaN(shockIntensity) || shockDuration < 1 || shockDuration > 15 || shockIntensity < 1 || shockIntensity > 100) {
        await modalResultInteraction.reply({ content: "Wrong types for the shock! Please relaunch the shock I can't open a new modal :pensive:", flags: MessageFlags.Ephemeral })
        return;
    }
    if (showShareCode) {
        const shareCode = modalResultInteraction.fields.getTextInputValue('shareCode')
        const arr = CODES_STORE.get(userId) ?? []
        arr.push({type: 'pishock', shareCode})
        CODES_STORE.set(userId, arr)
        queue = QUEUE_MANAGER.getQueueOrCreate(userId, 'pishock')
    }
    if (queue === undefined) throw new Error("Nuh uh")
    const oldQueueLength = queue.getCurrentState().length
    queue.enqueue({ author: 'funni', duration: shockDuration, intensity: shockIntensity, message: "fun" })
    await modalResultInteraction.reply({ content: `Queued! There are currently ${oldQueueLength} items queued before that one`, flags: MessageFlags.Ephemeral })
}

export async function execute(interaction: CommandInteraction) {
    if (!(interaction instanceof UserContextMenuCommandInteraction)) return;


    try {
        const queue = QUEUE_MANAGER.getQueueOrCreate(interaction.targetId, 'pishock')
        await doShock(queue, interaction, interaction.targetId, false)
    } catch (e) {
        if (!(e instanceof NoPishockCodeError)) throw e
        const yes = new ButtonBuilder()
            .setCustomId('yes')
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success);

        const no = new ButtonBuilder()
            .setCustomId('no')
            .setLabel('No')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(yes, no);
        const response = await interaction.reply({
            content: "This user has no PiShock sharecode setup. Wanna set it up?",
            flags: MessageFlags.Ephemeral, components: [row],
            withResponse: true
        })
        try {
            const confirmation = await response.resource!.message!.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 60_000 });
            if (confirmation.customId === 'yes') {
                doShock(undefined, confirmation, interaction.targetId, true)
            } else {
                confirmation.reply({content: "Too bad... Maybe next time :pleading_face:", flags: MessageFlags.Ephemeral})
            }
        } catch {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
        }

    }


}

export const data = new ContextMenuCommandBuilder()
    .setName('shock')
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions('0')
