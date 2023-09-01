import { Client, GatewayIntentBits } from "discord.js";
const deploy = require("./deploy-commands")
require("dotenv").config();

// const bot = require("./bot.js");

const client = new Client({
	intents: [3072, GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const checks = {};

client.on("ready", () => {
	if (!client.user || !client.application) {
		return;
	}
	// Give some diagnostic info when we log in
	console.log(`Logged in as ${client.user.tag}!`);

	//deploy.deployCommands();

	client.user.setActivity('Guan Yu Flow');
});

// client.on("interactionCreate", interaction => {
// 	if (!interaction.isCommand() && !interaction.isButton()) return;
// 	bot.handleMessage(checks, interaction);
// });

// Hook up to discord
client.login(process.env.BOT_TOKEN);

console.log(client);