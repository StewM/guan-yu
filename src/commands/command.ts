import { ChatInputApplicationCommandData } from 'discord.js';

export class Command {
    static commands(): string[] { return [] };
    static commandDefinitions(): ChatInputApplicationCommandData[] { return []};
    static help(): string { return '' };
}