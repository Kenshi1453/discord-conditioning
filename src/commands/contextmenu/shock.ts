import { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, CommandInteraction, ContextMenuCommandBuilder, MessageActionRowComponentBuilder, MessageComponentInteraction, MessageFlags, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle, UserContextMenuCommandInteraction } from "discord.js";
import { SHOCK_MANAGER } from "../../index.js";
import { CODES_STORE } from "../../stores/usercodes-store.js";

type ShowModalReturnType<T> = T extends true
    ? { modalInteraction: ModalSubmitInteraction, shockIntensityStr: string, shockDurationStr: string, shareCode: string }
    : { modalInteraction: ModalSubmitInteraction, shockIntensityStr: string, shockDurationStr: string }

async function showModalAndWait<T extends boolean>(
    interaction: CommandInteraction | MessageComponentInteraction,
    showShareCode: T): Promise<ShowModalReturnType<T>> {
    const modal = new ModalBuilder()
        .setCustomId('selectShockParams')
        .setTitle("Select Shock Parameters")

    // Create the text input components
    const modalShockDuration = new TextInputBuilder()
        .setCustomId('shockDuration')
        .setLabel("The shock duration (integer between 1-15)")
        .setStyle(TextInputStyle.Short);

    const modalShockIntensity = new TextInputBuilder()
        .setCustomId('shockIntensity')
        .setLabel("The shock intensity (integer between 1-100)")
        .setStyle(TextInputStyle.Short);

    const firstActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(modalShockDuration);
    const secondActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(modalShockIntensity);

    if (showShareCode) {
        const shareCodeInput = new TextInputBuilder()
            .setCustomId('shareCode')
            .setLabel("The user's sharecode")
            .setStyle(TextInputStyle.Short)
        modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(shareCodeInput))
    }
    modal.addComponents(firstActionRow, secondActionRow);


    await interaction.showModal(modal)
    const modalInteraction = await interaction.awaitModalSubmit({ time: 30_000, filter: (interaction) => interaction.customId === 'selectShockParams' })

    // Tell typescript to shut the fuck up
    return {
        shockDurationStr: modalInteraction.fields.getTextInputValue("shockDuration"),
        shockIntensityStr: modalInteraction.fields.getTextInputValue("shockIntensity"),
        shareCode: showShareCode ? modalInteraction.fields.getTextInputValue("shareCode") : undefined,
        modalInteraction: modalInteraction
    } as ShowModalReturnType<T>
}

class WrongInputError extends Error { }

/**
 * Precond: userId already has a pishock code
 * 
 * @throws {WrongInputError}
 */
function queueShock(userId: string, shockIntensityStr: string, shockDurationStr: string) {
    const intRegex = /^[0-9]+$/
    if (!intRegex.test(shockIntensityStr) || !intRegex.test(shockDurationStr)) {
        throw new WrongInputError("Please input integers in the text fields thanks :slight_smile:. Need to re-execute the command can't reopen a modal after a modal.")
    }
    const shockIntensity = Number.parseInt(shockIntensityStr)
    const shockDuration = Number.parseInt(shockDurationStr)
    if (shockIntensity < 1 || shockIntensity > 100 || shockDuration < 1 || shockDuration > 15) {
        throw new WrongInputError("shockIntensity must be between 1-100 and shockDuration must be between 1-15. Redo the command.")
    }
    SHOCK_MANAGER.queueShock(userId, shockIntensity, shockDuration)
}

export async function execute(interaction: CommandInteraction) {
    if (!(interaction instanceof UserContextMenuCommandInteraction)) return;

    if (CODES_STORE.hasCode(interaction.targetId, "pishock")) {
        const { modalInteraction, shockIntensityStr, shockDurationStr } = await showModalAndWait(interaction, false)
        try {
            queueShock(interaction.targetId, shockIntensityStr, shockDurationStr)
            modalInteraction.reply({content: "The shock has been successfully queued!", flags: MessageFlags.Ephemeral})
        }catch(e){
            if(!(e instanceof WrongInputError)) throw e
            modalInteraction.reply({content: `ERROR! ${e.message}`, flags: MessageFlags.Ephemeral})
        }
    } else {
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
        let confirmation: MessageComponentInteraction
        try {
            confirmation = await response.resource!.message!.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 60_000 });
        } catch {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
            return;
        }
        if (confirmation.customId === 'yes') {
            const { modalInteraction, shockIntensityStr, shockDurationStr, shareCode } = await showModalAndWait(confirmation, true)
            CODES_STORE.setCode(interaction.targetId, "pishock", {shareCode})
            try {
                queueShock(interaction.targetId, shockIntensityStr, shockDurationStr)
                modalInteraction.reply({content: "The shock has been successfully queued!", flags: MessageFlags.Ephemeral})
            }catch(e){
                if(!(e instanceof WrongInputError)) throw e
                modalInteraction.reply({content: `ERROR! ${e.message}`, flags: MessageFlags.Ephemeral})
            }
        } else {
            confirmation.reply({ content: "Too bad... Maybe next time :pleading_face:", flags: MessageFlags.Ephemeral })
        }

    }


}

export const data = new ContextMenuCommandBuilder()
    .setName('shock')
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions('0')
