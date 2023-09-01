const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const CON = require("./constants.js");
require("dotenv").config();

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

const commands = [
    {
        name: CON.CHECK.CREATE,
        description: "Create a ready check",
        options: [
            {
                name: CON.CHECK.CREATE_TARGET_TYPE,
                description: "The type of ready check to do",
                type: 3,
                required: true,
                choices: [
                    {
                        name: CON.CHECK.CREATE_TARGET_TYPE_CHANNEL_NAME,
                        value: CON.CHECK.CREATE_CHANNEL_TARGET
                    },
                    {
                        name: CON.CHECK.CREATE_TARGET_TYPE_NUM_NAME,
                        value: CON.CHECK.CREATE_NUM_TARGET
                    },
                    {
                        name: CON.CHECK.CREATE_TARGET_TYPE_MENTION_NAME,
                        value: CON.CHECK.CREATE_MENTION_TARGET
                    }
                ]
            },
            {
                name: CON.CHECK.CREATE_NUM_TARGET,
                description: "The number of users to ready",
                type: 4
            },
            {
                name: CON.CHECK.CREATE_MENTION_TARGET,
                description: "The users/roles to ready",
                type: 3
            }
        ]
    },
    {
        name: CON.CHECK.CANCEL,
        description: "Cancel a ready check"
    },
    {
        name: CON.READY,
        description: 'Respond "Ready" to a ready check'
    },
    {
        name: CON.UNREADY,
        description: 'Respond "Not Ready" to a ready check'
    },
    {
        name: CON.STATUS,
        description: "Check the status of the current ready check"
    },
    {
        name: CON.HELP,
        description: "Get help using ready-bot"
    }
];

module.exports = {
    deployCommands: async function () {
        try {
            console.log('Registering slash-commands...');
            await rest.put(
                Routes.applicationCommands(process.env.BOT_ID),
                { body: commands }
            );
            console.log("Successfully registered slash commands:", commands);
        } catch (error) {
            console.error(error);
        }
    }
}