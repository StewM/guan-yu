import Check from './commands/Check';
import commands from './commands';
const CON = require('./constants.js');
import { CommandInteraction, ButtonInteraction } from 'discord.js';
import utilities from './utilities';

module.exports = {
	/**
	 * Handles check creation/management flow
	 */
	async handleMessage(checks: Map<string, Check>, interaction: CommandInteraction | ButtonInteraction) {
		var fn;
		const author = interaction.user;
		const channelId = interaction.channelId;

		const newCheck = new Check(author);

		// Get the current check for the current channel if one exists
		const currentCheck = checks[channelId];

		let commandName;

		if(interaction.isButton()) {
			commandName = interaction.customId;
		} else {
			commandName = interaction.commandName;
		}

        // get all commands from modules
        let commandStrings: string[] = [];

        for (const command of commands) {
            commandStrings = commandStrings.concat(command.commands());
        }

		if (commandName === 'help') {
			let helpText = '';
			for (const command of commands) {
				helpText = helpText.concat(command.help());
			}
			await utilities.safeRespond(interaction, {
				content: helpText,
				ephemeral: true
			});
		} else if (commandStrings.includes(commandName)) {
			let handled = false;
			for (const command of commands) {
				if (command.commands().includes(commandName)) {
					handled = await command.handleCommand(commandName, interaction);
					break;
				}
			}
			if (!handled) {
				await utilities.safeRespond(interaction, {
					content: "Yikes! Somehow a command not meant for me made it all the way to my system 😥.",
					ephemeral: true
				});
			}
		} else {
			await utilities.safeRespond(interaction, {
				content: "Yikes! Somehow a command not meant for me made it all the way to my system 😥.",
				ephemeral: true
			});
		}

        
        // switch options
        //      help gets the help text from each command modules and sends them
        //      if the command is in the list of all module commands, loop through 
        //          modules to figure out which one then call execute command with the command

		

		setTimeout(async () => {
			if (!interaction.replied) {
				await utilities.safeRespond(interaction, {
					content: "Sorry, something has gone wrong!",
					ephemeral: true
				})
			}
		}, 2000);
	},

	/**
	 * 
	 * @param {DISCORD.CommandInteraction} interaction
	 * @param {string} checkMentions
	 */
	async parseMentionCheckHandler(interaction, checkMentions) {
		// Don't handle @everyone or @here tags so we don't spam people
		if (checkMentions.indexOf("@everyone") != -1 || checkMentions.indexOf("@here") != -1) {
			await utilities.safeRespond(interaction, {
				content: "Sorry, I can't use global tags like \`everyone\` or \`here\`. Try picking individual users instead.",
				ephemeral: true
			});
			return;
		}

		// This can in theory resolve roles to users, but I've found it very 
		// picky about when it will/won't pick up a user as part of a role
		const resolvedTags = interaction.options.resolved;
		let mentions = [];

		try {
			mentions.push(
				...resolvedTags
					.members
					.map(member => member.user)
					.filter(user => !user.bot)
					.values()
			);
		} catch (e) {
			// Author didn't tag any users
		}

		if (mentions === undefined || mentions.length === 0) {
			await utilities.safeRespond(interaction, {
				content: `You'll need to select some users to create a \`${CON.CHECK.CREATE_MENTION_TARGET}\` check. Keep in mind I can't wait for bots or roles.\n` +
					`If you'd like to wait for a number of users rather than specific users, use \`/${CON.CHECK.CREATE} ${CON.CHECK.CREATE_NUM_TARGET}\``,
				ephemeral: true
			});
			return;
		}

		return mentions
	},

	/**
	 * 
	 * @param {DISCORD.CommandInteraction} interaction
	 */
	async parseChannelCheckHandler(interaction) {
		let member = await interaction.member.fetch(true);
		const voice = member.voice;
		const channel = voice.channel;

		if(!channel) {
			await utilities.safeRespond(interaction, {
				content: "Sorry, you must be in a voice channel to use this ready check type.",
				ephemeral: true
			});
			return;
		}

		let mentions = [];

		try {
			mentions.push(
				...channel
					.members
					.map(member => member.user)
					.filter(user => !user.bot)
					.values()
			);
		} catch (e) {
			// There's no one in the voice channel
		}

		if (mentions === undefined || mentions.length === 0) {
			await utilities.safeRespond(interaction, {
				content: `Sorry, you must be in a voice channel to use this ready check type.`,
				ephemeral: true
			});
			return;
		}

		return mentions
	},

	/**
	 * Helper function to create a check associated with the given channel & author
	 * @param {DISCORD.CommandInteraction} interaction
	 * @param {number} count
	 */
	async parseNumCheckHandler(interaction, count) {
		if (count < 1) {
			await utilities.safeRespond(interaction, {
				content: `Sorry, I can only wait for one or more users with a \`${CON.CHECK.CREATE_NUM_TARGET}\` check. Try creating your check with a count of at least 1.\n` +
					`If you'd like to wait for specifc users rather than a number, use \`/${CON.CHECK.CREATE} ${CON.CHECK.CREATE_MENTION_TARGET}\``,
				ephemeral: true
			});
			return;
		}

		return count;
	}
}