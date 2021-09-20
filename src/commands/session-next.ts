import { Command } from "@commands/command";
import { CommandContext } from "@models/command-context";
import { injectable } from "inversify";
import { CommandResult } from "@models/command-result";
import { ISessionSchema, SessionModel } from "@models/session-schema";
import container from "@src/inversify.config";
import { Configuration } from "@models/configuration";
import { TYPES } from "@src/types";
import {Message, TextChannel} from "discord.js";
import { ICharacterSchema } from "@models/character-schema";

@injectable()
export class SessionNext extends Command {
    names = [ "next", "n" ];
    description = "Ends your turn on a given RP. Use it in the corresponding RP channel.";
    usageHint = "**Usage Hint:** \`" + `${this.names[0]} [#<channel name>] [optional message for next user]\``;
    permissionLevel = 1;

    async run(context: CommandContext): Promise<CommandResult> {
        this.logger.debug("Parsing arguments for next command...");
        const session: ISessionSchema = await this.validateArguments(context.args, context);
        if(!session) {
            const response = await context.originalMessage.reply("There is no ongoing RP in this channel! Please use this command in the RP channel where you want to notify the next user or pass the channel as an argument.\n" + this.usageHint);
            if(this.channelService.isRpChannel(context.originalMessage.channel.id)) await this.messageService.deleteMessages([ context.originalMessage, response ], 10000);
            return Promise.resolve(new CommandResult(this, context, false, "Next command used in an invalid channel."));
        }
        if(context.originalMessage.author.id !== session.currentTurnId) {
            const response = await context.originalMessage.reply({
                content: `It's currently <@${session.currentTurnId}>'s turn! You can only use this command if it's your turn.`,
                allowedMentions: { "parse": []}
            });
            if(this.channelService.isRpChannel(context.originalMessage.channel.id)) await this.messageService.deleteMessages([ context.originalMessage, response ], 10000);
            return Promise.resolve(new CommandResult(this, context, false, "Next command used by invalid user."));
        }

        this.logger.debug("Notifying next user...");
        let userMessage = null;
        if(this.helperService.isDiscordId(context.args[0])) userMessage = context.args.slice(1).join(" ");
        else userMessage = context.args.join(" ");

        const newSession = await this.updateTurnAndNotifyNextUser(session, userMessage);
        if(!newSession) {
            await context.originalMessage.reply(`Uh-oh, something went wrong while I tried to notify the next user.`);
            return Promise.resolve(new CommandResult(this, context, false, "Failed to update turn order and notify next user."));
        }

        this.logger.debug("Updating session post with new current turn...");
        if(!await this.updateSessionPost(newSession)) {
            await context.originalMessage.reply(`Uh-oh, something went wrong while I tried to update the session post.`);
            return Promise.resolve(new CommandResult(this, context, false, "Failed to update session post after turn change."));
        }

        await this.messageService.deleteMessages([context.originalMessage]);
        return Promise.resolve(new CommandResult(this, context, true, `Advanced the session turn for channel ID ${session.channelId}`));
    }

    public async validateArguments(args: string[], context?: CommandContext): Promise<ISessionSchema> {
        let channelId = null;
        if(args.length > 0 && this.helperService.isDiscordId(args[0])) channelId = this.channelService.getTextChannelByChannelId(args[0])?.id;
        if(!channelId) channelId = context.originalMessage.channel.id;
        return Promise.resolve(await SessionModel.findOne({ channelId: channelId }).exec());
    }

    private async updateTurnAndNotifyNextUser(session: ISessionSchema, userMessage?: string): Promise<ISessionSchema> {
        // Iterate current turn
        const nextTurn: ICharacterSchema = this.iterateTurn(session.turnOrder, session.currentTurnId);

        this.logger.trace(`Current session: ${JSON.stringify(session)}\nNext currentTurn will be: ${nextTurn.userId} - ${nextTurn.name}`);
        const newSession: ISessionSchema = await SessionModel.findOneAndUpdate({ channel: session.channelId }, { currentTurnId: nextTurn.userId }, { new: true });
        this.logger.trace(`Updated next user for session: ${newSession.currentTurnId}`);

        // Send notification
        let messageContent = `<@${nextTurn.userId}> (${nextTurn.name}) in <#${session.channelId}>`;
        if(userMessage) messageContent += `\n<@${session.currentTurnId}> said: \"${userMessage}\"`;
        const notificationChannel: TextChannel = await this.channelService.getTextChannelByChannelId(container.get<Configuration>(TYPES.Configuration).notificationChannelId);
        await notificationChannel.send({
            content: messageContent,
            allowedMentions: { "users":[nextTurn.userId]},
        });

        this.logger.debug(`Notified next user (ID: ${nextTurn.userId}) in notification channel.`);
        return Promise.resolve(newSession);
    }

    private iterateTurn(turnOrder: Array<ICharacterSchema>, currentTurnId: string): ICharacterSchema {
        let nextTurn: ICharacterSchema = null;
        let index = 0;

        turnOrder.forEach((character) => {
            if(character.userId === currentTurnId) {
                if(index == turnOrder.length - 1) {
                    // If current turn is the last element, next turn is the first element
                    nextTurn = turnOrder[0];
                    return;
                }
                index++;
                nextTurn = turnOrder[index];
                return;
            }
            index++;
        });
        return nextTurn;
    }

    private async updateSessionPost(session: ISessionSchema): Promise<boolean> {
        try {
            let postContent = `\n\n<#${session.channelId}>:\n`;
            session.turnOrder.forEach((character) => {
                if(character.userId === session.currentTurnId) postContent += ":arrow_right: ";
                postContent += `${character.name} <@${character.userId}>\n`;
            });
            const divider = "\`\`\`⋟────────────────────────⋞\`\`\`";

            const sessionPost: Message = this.channelService.getTextChannelByChannelId(container.get<Configuration>(TYPES.Configuration).currentSessionsChannelId).messages.cache.get(session.sessionPostId);
            await sessionPost.edit({
                content: postContent + divider,
                allowedMentions: { "parse": []}
            });
            return Promise.resolve(true);
        } catch(error) {
            this.logger.error("Failed to update session post with new current turn marker: ", this.logger.prettyError(error));
            return Promise.resolve(false);
        }
    }

}