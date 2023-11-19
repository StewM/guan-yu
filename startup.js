const { Client, GatewayIntentBits } = require("discord.js");
const CON = require("./constants.js");
const DEPLOY = require("./deploy-commands.js")
require("dotenv").config();

const BOT = require("./bot.js");

const CLIENT = new Client({
	intents: [3072, GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages]
});

const checks = {};

CLIENT.on("ready", () => {
	// Give some diagnostic info when we log in
	console.log(`Logged in as ${CLIENT.user.tag}!`);

	DEPLOY.deployCommands();

	CLIENT.user.setActivity(`Guan Yu Flow`);
});

CLIENT.on("interactionCreate", interaction => {
	if (!interaction.isCommand() && !interaction.isButton()) return;
	BOT.handleMessage(checks, interaction);
});

CLIENT.on("messageCreate", message => {
	// fix twitter embeds
	BOT.fixEmbed(message);
});

// Hook up to discord
CLIENT.login(process.env.BOT_TOKEN);