const DISCORD = require("discord.js");
const UTIL = require("../utilities.js");

class Check {
	CON = Object.freeze({
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

	commands() {
		return [
			this.CON.CHECK.CREATE,
			this.CON.CHECK.CANCEL,
			this.CON.STATUS,
			this.CON.READY,
			this.CON.UNREADY
		]
	}

	commandDefinitions() {
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

	/**
	 * @param {DISCORD.User} _author The user who initiated the check
	 */
	constructor(_author) {
		this.author = _author;
		this.statusMessage = null;
		this.count = 0;
		this.targets = [];
		this.readiedUsers = [];
		this.readiedCount = 0;
	}

	/**
	 * @param {number|DISCORD.User} _target how many people/which people to have ready
	 */
	activate(_target) {
		if (!isNaN(_target)) {
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
		return this.interaction.user;
	}

	/**
	 * @returns {string} A description of who/how many users still need to mark themselves ready
	 */
	getRemainderString() {
		if (this.isTargeted) {
			return UTIL.whoToReady(UTIL.leftOuter(this.targets, this.readiedUsers));
		}
		const count = this.countRemaining();
		return `${count} user${UTIL.plural(count)}`;
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
	isUserReadied(user) {
		return this.readiedUsers.indexOf(user) > -1;
	}

	/**
	 * Test if user has been asked to ready in this check
	 * @param {DISCORD.User} user User to check
	 * @returns {boolean} True if user has been asked to ready in this check, else false
	 */
	isUserReadyRequired(user) {
		return this.targets.indexOf(user) > -1;
	}

	baseMessagePreamble() {
		if (!!this.readiedUsers.length) {
			return "Nobody is"
		}
	}

	/**
	 * Mark the user ready if appropriate
	 * @param {DISCORD.User} user User to mark ready
	 */
	async readyUser(user, interaction) {
		// If this user has already readied for this check
		if (this.isUserReadied(user)) {
			await UTIL.safeRespond(interaction, {
				content: "You've already readied!",
				ephemeral: true
			});
			return;
		}

		// If check is username based but this user doesn't need to ready for this check
		if (this.isTargeted && !this.isUserReadyRequired(user)) {
			await UTIL.safeRespond(interaction, {
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
			await UTIL.safeRespond(interaction, {
				content: `Check complete! Ready to go, ${this.author}!`
			});
		} else {
			// else send ephemeral message to readier
			await UTIL.safeRespond(interaction, {
				content: `You've readied! ${this.countRemaining()} left.`,
				ephemeral: true
			});
		}
	}

	/**
	 * Mark the user ready if appropriate
	 * @param {DISCORD.User} user User to mark ready
	 */
	async unReadyUser(user, interaction) {
		if (!this.isUserReadied(user)) {
			await UTIL.safeRespond(interaction, {
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
			await UTIL.safeRespond(interaction, {
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
			msg += UTIL.leftOuter(this.targets, this.readiedUsers).join("\n");
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
							custom_id: this.CON.READY
						},
						{
							type: 2,
							label: "Not Ready",
							style: 4,
							custom_id: this.CON.UNREADY
						}
					]
				}
			]
		}

		return options;
	}
}

module.exports = Check;