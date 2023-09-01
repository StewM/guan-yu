import { CommandInteraction, ButtonInteraction, MessagePayload, InteractionReplyOptions, GuildMember } from "discord.js";

module.exports = {
    errorMsg: function (reason = "") {
        return `${reason.length ? reason + " " : ""}Type \`/help\` for a list of commands.`;
    },

    safeRespond: async function (interaction: CommandInteraction | ButtonInteraction, options: string | MessagePayload | InteractionReplyOptions) {
        try {
            if (interaction.replied) return;
            let response = await interaction.reply(options);
            return response;
        } catch (error) {
            console.warn("Failed to reply to interaction:", interaction, options)
            console.trace();
        }
    },

    /**
     * @param {number} val
     */
    plural: function (val: Number, pluralizer = "s") {
        return (val != 1 ? pluralizer : "");
    },

    /**
     * Given two arrays, return all items which exist in the left but not the right
     */
    leftOuter: function (lArr: any[], rArr: any[]) {
        let rSet = new Set(rArr);
        return [...lArr].filter(u => !rSet.has(u));
    },

    /**
     * Format the list of who needs to ready up or return the everyone tag
     */
    whoToReady: function (users: GuildMember[]) {
        var out = users.join(", ");
        return out;
    }
}