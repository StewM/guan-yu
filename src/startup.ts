import { Client, GatewayIntentBits } from "discord.js";
import commandModules from './commands';
import sqlite3 from 'sqlite3';
require("dotenv").config();

let db = new sqlite3.Database(':memory:');

// const bot = require("./bot.js");

const client = new Client({
	intents: [3072, GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const checks = {};

client.on("ready", async () => {
	if (!client.user || !client.application) {
		return;
	}
	// Give some diagnostic info when we log in
	console.log(`Logged in as ${client.user.tag}!`);

	let commands = [
		{
			name: "help",
			description: "Get help using ready-bot"
		}
	];

	for (const command of commandModules) {
		// get command definitions
		commands = commands.concat(command.commandDefinitions());
		// init db tables
		command.setupDB(db);
	}

	await client.application.commands.set(commands);

	client.user.setActivity('Guan Yu Flow');
});

// client.on("interactionCreate", interaction => {
// 	if (!interaction.isCommand() && !interaction.isButton()) return;
// 	bot.handleMessage(checks, interaction);
// });

// Hook up to discord
client.login(process.env.BOT_TOKEN);