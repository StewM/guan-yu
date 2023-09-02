import utilities from '../utilities';
import { User, Message, CommandInteraction, ButtonInteraction, ChatInputApplicationCommandData } from "discord.js";
import sqlite3 from 'sqlite3';
import { Command } from "./command";

class Check {
	channelId: string;
	author: User;
	count: number;
	targets: User[];
	isTargeted: boolean;
	readiedUsers: User[];
	readiedCount: number;
	statusMessage?: Message;

	constructor(_channelId: string, _author: User) {
		this.channelId = _channelId;
		this.author = _author;
		this.count = 0;
		this.targets = [];
		this.isTargeted = false;
		this.readiedUsers = [];
		this.readiedCount = 0;
	}

	/**
	 * @param {number|DISCORD.User} _target how many people/which people to have ready
	 */
	activate(_target: number | User[]) {
		if (typeof _target === "number") {
			this.count = _target;
			this.isTargeted = false;
		}
		else if (_target instanceof Array) {
			this.targets = _target;
			this.count = this.targets.length;
			this.isTargeted = true;
		}
		else {
			return false;
		}
		return true;
	}

	/**
	 * @returns {number} The amount of users who still need to ready-up
	 */
	countRemaining() {
		return this.count - this.readiedCount;
	}

	/**
	 * @returns {DISCORD.User} The user who created this ready check
	 */
	getAuthor() {
		return this.author;
	}

	/**
	 * @returns {string} A description of who/how many users still need to mark themselves ready
	 */
	getRemainderString() {
		if (this.isTargeted) {
			return utilities.whoToReady(utilities.leftOuter(this.targets, this.readiedUsers));
		}
		const count = this.countRemaining();
		return `${count} user${utilities.plural(count)}`;
	}

	/**
	 * @returns {boolean} True if readiness count OR target list has been fulfilled
	 */
	isCheckSatisfied() {
		var retVal = true;
		if (this.isTargeted) {
			this.targets.forEach(u => {
				if (!this.isUserReadied(u)) {
					retVal = false;
				}
			});
		}
		else {
			retVal = this.readiedCount == this.count;
		}
		return retVal;
	}

	/**
	 * Test if user has readied in this check
	 * @param {DISCORD.User} user User to check
	 * @returns {boolean} True if user has already readied in this check, else false
	 */
	isUserReadied(user: User) {
		return this.readiedUsers.indexOf(user) > -1;
	}

	/**
	 * Test if user has been asked to ready in this check
	 * @param {DISCORD.User} user User to check
	 * @returns {boolean} True if user has been asked to ready in this check, else false
	 */
	isUserReadyRequired(user: User) {
		return this.targets.indexOf(user) > -1;
	}

	baseMessagePreamble() {
		if (!!this.readiedUsers.length) {
			return "Nobody is"
		}
	}

	/**
	 * Mark the user ready if appropriate
	 */
	async readyUser(user: User, interaction: CommandInteraction | ButtonInteraction) {
		// check for the status message existing, TODO: add better error handling for this
		if (!this.statusMessage){
			return;
		}
		// If this user has already readied for this check
		if (this.isUserReadied(user)) {
			await utilities.safeRespond(interaction, {
				content: "You've already readied!",
				ephemeral: true
			});
			return;
		}

		// If check is username based but this user doesn't need to ready for this check
		if (this.isTargeted && !this.isUserReadyRequired(user)) {
			await utilities.safeRespond(interaction, {
				content: "You don't need to ready in this check!",
				ephemeral: true
			});
			return;
		}

		this.readiedUsers.push(user);
		this.readiedCount = this.readiedUsers.length;
		
		// update status message
		await this.statusMessage.edit(this.getStatusOptions());

		// if complete send complete message
		if (this.isCheckSatisfied()) {
			// update status to not have buttons
			await this.statusMessage.edit({
				content: this.getStatusMessage(),
				components: []
			});
			// send complete message
			await utilities.safeRespond(interaction, {
				content: `Check complete! Ready to go, ${this.author}!`
			});
		} else {
			// else send ephemeral message to readier
			await utilities.safeRespond(interaction, {
				content: `You've readied! ${this.countRemaining()} left.`,
				ephemeral: true
			});
		}
	}

	/**
	 * Mark the user ready if appropriate
	 */
	async unReadyUser(user: User, interaction: CommandInteraction | ButtonInteraction) {
		// check for the status message existing, TODO: add better error handling for this
		if (!this.statusMessage){
			return;
		}
		if (!this.isUserReadied(user)) {
			await utilities.safeRespond(interaction, {
				content: "You haven't readied yet, no need to unready!",
				ephemeral: true
			});
		}
		else {
			this.readiedUsers.splice(this.readiedUsers.indexOf(user), 1);
			this.readiedCount = this.readiedUsers.length;
			//update status message
			await this.statusMessage.edit(this.getStatusOptions());
			//send ephemeral message to unreadier
			await utilities.safeRespond(interaction, {
				content: `You've un-readied! ${this.countRemaining()} left.`,
				ephemeral: true
			});
		}
	}

	getStatusMessage() {
		let msg = `:white_check_mark: Ready Check Started! :white_check_mark:\n\n${this.readiedCount}/${this.count} Ready!`;
		
		msg += "\n\nReady:\n"
		msg += this.readiedUsers.join("\n");

		if (this.isTargeted) {
			msg += "\n\nNot Ready:\n"
			msg += utilities.leftOuter(this.targets, this.readiedUsers).join("\n");
		}

		msg += "\n";

		return msg;
	}

	getStatusOptions() {
		let message = this.getStatusMessage();

		let options = {
			content: message,
			components: [
				{
					type: 1,
					components: [
						{
							type: 2,
							label: "Ready",
							style: 3,
							custom_id: CheckCommand.CON.READY
						},
						{
							type: 2,
							label: "Not Ready",
							style: 4,
							custom_id: CheckCommand.CON.UNREADY
						}
					]
				}
			]
		}

		return options;
	}
}

class CheckCommand extends Command {
	static CON = Object.freeze({
		CHECK: {
			CREATE: "check",
			CANCEL: "cancel",
			CREATE_TARGET_TYPE: "type",
			CREATE_TARGET_TYPE_NUM_NAME: "Count",
			CREATE_TARGET_TYPE_MENTION_NAME: "Mentions",
			CREATE_TARGET_TYPE_CHANNEL_NAME: "Channel",
			CREATE_MENTION_TARGET: "mentions",
			CREATE_NUM_TARGET: "count",
			CREATE_CHANNEL_TARGET: "channel",
		},
		STATUS: "status",
		READY: "ready",
		UNREADY: "unready",
	});

	static commands(): string[] {
		return [
			this.CON.CHECK.CREATE,
			this.CON.CHECK.CANCEL,
			this.CON.STATUS,
			this.CON.READY,
			this.CON.UNREADY
		]
	}

	static commandDefinitions() {
		return [
			{
				name: this.CON.CHECK.CREATE,
				description: "Create a ready check",
				options: [
					{
						name: this.CON.CHECK.CREATE_TARGET_TYPE,
						description: "The type of ready check to do",
						type: 3,
						required: true,
						choices: [
							{
								name: this.CON.CHECK.CREATE_TARGET_TYPE_CHANNEL_NAME,
								value: this.CON.CHECK.CREATE_CHANNEL_TARGET
							},
							{
								name: this.CON.CHECK.CREATE_TARGET_TYPE_NUM_NAME,
								value: this.CON.CHECK.CREATE_NUM_TARGET
							},
							{
								name: this.CON.CHECK.CREATE_TARGET_TYPE_MENTION_NAME,
								value: this.CON.CHECK.CREATE_MENTION_TARGET
							}
						]
					},
					{
						name: this.CON.CHECK.CREATE_NUM_TARGET,
						description: "The number of users to ready",
						type: 4
					},
					{
						name: this.CON.CHECK.CREATE_MENTION_TARGET,
						description: "The users/roles to ready",
						type: 3
					}
				]
			},
			{
				name: this.CON.CHECK.CANCEL,
				description: "Cancel a ready check"
			},
			{
				name: this.CON.READY,
				description: 'Respond "Ready" to a ready check'
			},
			{
				name: this.CON.UNREADY,
				description: 'Respond "Not Ready" to a ready check'
			},
			{
				name: this.CON.STATUS,
				description: "Check the status of the current ready check"
			}
		]
	}

	static help() {
		return `To create a check, run \`/${this.CON.CHECK.CREATE}\`\n` +
		`To respond to a check, run \`/${this.CON.READY}\` or \`/${this.CON.UNREADY}\`\n` +
		`To cancel a check, run \`/${this.CON.CHECK.CANCEL}\`\n` +
		`To see who still needs to ready, run \`/${this.CON.STATUS}\`\n`;
	}

	static setupDB(db: sqlite3.Database) {
		return;
	}

	static async handleCommand(command: string, interaction: CommandInteraction | ButtonInteraction): Promise<boolean> { 
		let fn;

		const author = interaction.user;
		const channelId = interaction.channelId;

		switch (command) {
			case (this.CON.READY):
				fn = Check.prototype.readyUser;
			case (this.CON.UNREADY):
				if (!currentCheck) {
					await utilities.safeRespond(interaction, {
						content: utilities.errorMsg("No ready check active in this channel."),
						ephemeral: true
					});
					return true;
				}

				// Get the right ready/unready function and call it
				fn = (fn || Check.prototype.unReadyUser);
				await fn.call(currentCheck, author, interaction);

				if (Check.prototype.isCheckSatisfied.call(currentCheck)) {
					delete checks[channelId];
				}
				return true;
			case (this.CON.STATUS):
				if (!currentCheck) {
					await utilities.safeRespond(interaction, {
						content: utilities.errorMsg("No ready check active in this channel."),
						ephemeral: true
					});
					return true;
				}

				// send new status
				let newStatus = await utilities.safeRespond(interaction, currentCheck.getStatusOptions());

				// delete old status
				await currentCheck.statusMessage.delete();

				// update the saved status to the new one
				currentCheck.statusMessage = newStatus;

				return true;
			case (this.CON.CHECK.CANCEL):
				if (!currentCheck) {
					await utilities.safeRespond(interaction, {
						content: utilities.errorMsg("No ready check active in this channel."),
						ephemeral: true
					});
					return true;
				}

				await currentCheck.statusMessage.delete();

				delete checks[channelId];
				await utilities.safeRespond(interaction, {
					content: "Current ready check cancelled."
				});
				return true;
			case (this.CON.CHECK.CREATE):
				var checkType;
				var checkCount = 0;
				var checkMentions;
				for (const option of interaction.options.data) {
					if (option.name == this.CON.CHECK.CREATE_TARGET_TYPE) {
						checkType = option.value;
					}
					if (option.name == this.CON.CHECK.CREATE_NUM_TARGET) {
						checkCount = option.value;
					}
					if (option.name == this.CON.CHECK.CREATE_MENTION_TARGET) {
						checkMentions = option.value;
					}
				}
				if (!checkType) {
					await utilities.safeRespond(interaction, {
						content: `You need to select a check type to create a check.`,
						ephemeral: true
					});
					return true;
				}

				if (checkType == this.CON.CHECK.CREATE_NUM_TARGET && checkCount <= 0) {
					await utilities.safeRespond(interaction, {
						content: `You must include a \`${this.CON.CHECK.CREATE_NUM_TARGET}\` parameter > 0 to create a count type check.`,
						ephemeral: true
					});
					return true;
				}

				if (checkType == this.CON.CHECK.CREATE_MENTION_TARGET && !checkMentions) {
					await utilities.safeRespond(interaction, {
						content: `You must include a \`${this.CON.CHECK.CREATE_MENTION_TARGET}\` parameter with at least one mention to create a mention type check.`,
						ephemeral: true
					});
					return true;
				}

				var activeParam;
				switch (checkType) {
					case this.CON.CHECK.CREATE_CHANNEL_TARGET:
						activeParam = await this.parseChannelCheckHandler.call(this, interaction)
						break;
					case this.CON.CHECK.CREATE_MENTION_TARGET:
						activeParam = await this.parseMentionCheckHandler.call(this, interaction, checkMentions)
						break;
					case this.CON.CHECK.CREATE_NUM_TARGET:
						activeParam = await this.parseNumCheckHandler.call(this, interaction, checkCount)
						break;
					default:
						await utilities.safeRespond(interaction, {
							content: `I don't understand check type '${checkType}'.`,
							ephemeral: true
						});
						return true;
				}

				// If the activeParam is filled out and the activation call succeeds, save the check
				if (!!activeParam && Check.prototype.activate.call(newCheck, activeParam)) {
					let response = await utilities.safeRespond(interaction, newCheck.getStatusOptions());
					if (response) {
						newCheck.statusMessage = response;
					}
					checks[channelId] = newCheck;
				}
				else {
					if (interaction.replied) return true;
					await utilities.safeRespond(interaction, {
						content: `Sorry, something went wrong and I couldn't create your check.`,
						ephemeral: true
					});
					console.error("Failed to create check:", interaction);
					console.error("target:", activeParam);
				}
				return true;
			default:
				await utilities.safeRespond(interaction, {
					content: "Yikes! Somehow a command not meant for me made it all the way to my system 😥.",
					ephemeral: true
				});
				return true;
		}

		return false;
	}

	constructor(_author: User) {
		super();
	}
}

export default CheckCommand;