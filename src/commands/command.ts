import { ChatInputApplicationCommandData, CommandInteraction, ButtonInteraction } from 'discord.js';
import sqlite3 from 'sqlite3';

export class Command {
    static commands(): string[] { return [] };
    static commandDefinitions(): ChatInputApplicationCommandData[] { return []};
    static help(): string { return '' };
    static setupDB(_db: sqlite3.Database): void { return };
    static async handleCommand(_command: string, _interaction: CommandInteraction | ButtonInteraction): Promise<boolean> { return false };
}