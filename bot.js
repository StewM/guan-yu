const DISCORD = require('discord.js');
const { buildConnector } = require('undici');
const Check = require('./Check.js');
const CON = require('./constants.js');
const UTIL = require('./utilities.js');

module.exports = {
	/**
	 * Handles check creation/management flow
	 * @param {Map<String, Check>} checks
	 * @param {DISCORD.CommandInteraction} interaction
	 */
	async handleMessage(checks, interaction) {
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

		switch (commandName) {
			case (CON.HELP):
				await UTIL.safeRespond(interaction, {
					content: `To create a check, run \`/${CON.CHECK.CREATE}\`\n` +
						`To respond to a check, run \`/${CON.READY}\` or \`/${CON.UNREADY}\`\n` +
						`To cancel a check, run \`/${CON.CHECK.CANCEL}\`\n` +
						`To see who still needs to ready, run \`/${CON.STATUS}\`\n`,
					ephemeral: true
				});
				return;
			case (CON.READY):
				fn = Check.prototype.readyUser;
			case (CON.UNREADY):
				if (!currentCheck) {
					await UTIL.safeRespond(interaction, {
						content: UTIL.errorMsg("No ready check active in this channel."),
						ephemeral: true
					});
					return;
				}

				// Get the right ready/unready function and call it
				fn = (fn || Check.prototype.unReadyUser);
				await fn.call(currentCheck, author, interaction);

				if (Check.prototype.isCheckSatisfied.call(currentCheck)) {
					delete checks[channelId];
				}
				return;
			case (CON.STATUS):
				if (!currentCheck) {
					await UTIL.safeRespond(interaction, {
						content: UTIL.errorMsg("No ready check active in this channel."),
						ephemeral: true
					});
					return;
				}

				// send new status
				let newStatus = await UTIL.safeRespond(interaction, currentCheck.getStatusOptions());

				// delete old status
				await currentCheck.statusMessage.delete();

				// update the saved status to the new one
				currentCheck.statusMessage = newStatus;

				return;
			case (CON.CHECK.CANCEL):
				if (!currentCheck) {
					await UTIL.safeRespond(interaction, {
						content: UTIL.errorMsg("No ready check active in this channel."),
						ephemeral: true
					});
					return;
				}

				await currentCheck.statusMessage.delete();

				delete checks[channelId];
				await UTIL.safeRespond(interaction, {
					content: "Current ready check cancelled."
				});
				return;
			case (CON.CHECK.CREATE):
				var checkType;
				var checkCount = 0;
				var checkMentions;
				for (const option of interaction.options.data) {
					if (option.name == CON.CHECK.CREATE_TARGET_TYPE) {
						checkType = option.value;
					}
					if (option.name == CON.CHECK.CREATE_NUM_TARGET) {
						checkCount = option.value;
					}
					if (option.name == CON.CHECK.CREATE_MENTION_TARGET) {
						checkMentions = option.value;
					}
				}
				if (!checkType) {
					await UTIL.safeRespond(interaction, {
						content: `You need to select a check type to create a check.`,
						ephemeral: true
					});
					return;
				}

				if (checkType == CON.CHECK.CREATE_NUM_TARGET && checkCount <= 0) {
					await UTIL.safeRespond(interaction, {
						content: `You must include a \`${CON.CHECK.CREATE_NUM_TARGET}\` parameter > 0 to create a count type check.`,
						ephemeral: true
					});
					return;
				}

				if (checkType == CON.CHECK.CREATE_MENTION_TARGET && !checkMentions) {
					await UTIL.safeRespond(interaction, {
						content: `You must include a \`${CON.CHECK.CREATE_MENTION_TARGET}\` parameter with at least one mention to create a mention type check.`,
						ephemeral: true
					});
					return;
				}

				var activeParam;
				switch (checkType) {
					case CON.CHECK.CREATE_CHANNEL_TARGET:
						activeParam = await this.parseChannelCheckHandler.call(this, interaction)
						break;
					case CON.CHECK.CREATE_MENTION_TARGET:
						activeParam = await this.parseMentionCheckHandler.call(this, interaction, checkMentions)
						break;
					case CON.CHECK.CREATE_NUM_TARGET:
						activeParam = await this.parseNumCheckHandler.call(this, interaction, checkCount)
						break;
					default:
						await UTIL.safeRespond(interaction, {
							content: `I don't understand check type '${checkType}'.`,
							ephemeral: true
						});
						return;
				}

				// If the activeParam is filled out and the activation call succeeds, save the check
				if (!!activeParam && Check.prototype.activate.call(newCheck, activeParam)) {
					let response = await UTIL.safeRespond(interaction, newCheck.getStatusOptions());
					if (response) {
						newCheck.statusMessage = response;
					}
					checks[channelId] = newCheck;
				}
				else {
					if (interaction.replied) break;
					await UTIL.safeRespond(interaction, {
						content: `Sorry, something went wrong and I couldn't create your check.`,
						ephemeral: true
					});
					console.error("Failed to create check:", interaction);
					console.error("target:", activeParam);
				}
				break;
			default:
				await UTIL.safeRespond(interaction, {
					content: "Yikes! Somehow a command not meant for me made it all the way to my system 😥.",
					ephemeral: true
				});
				break;
		}

		setTimeout(async () => {
			if (!interaction.replied) {
				await UTIL.safeRespond(interaction, {
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
			await UTIL.safeRespond(interaction, {
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
			await UTIL.safeRespond(interaction, {
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
			await UTIL.safeRespond(interaction, {
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
			await UTIL.safeRespond(interaction, {
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
			await UTIL.safeRespond(interaction, {
				content: `Sorry, I can only wait for one or more users with a \`${CON.CHECK.CREATE_NUM_TARGET}\` check. Try creating your check with a count of at least 1.\n` +
					`If you'd like to wait for specifc users rather than a number, use \`/${CON.CHECK.CREATE} ${CON.CHECK.CREATE_MENTION_TARGET}\``,
				ephemeral: true
			});
			return;
		}

		return count;
	}
}