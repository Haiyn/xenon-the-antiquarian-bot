import { Command } from "@commands/command";
import { CommandContext } from "@models/command-context";
import { injectable } from "inversify";
import { CommandResult } from "@models/command-result";
import { ISession, SessionModel } from "@models/session";
import container from "@src/inversify.config";
import { Configuration } from "@models/configuration";
import { TYPES } from "@src/types";

@injectable()
export class SessionFinish extends Command {
    names = ["finish"];
    description = "Finishes an ongoing RP. All users stop receiving notifications and reminders.";
    usageHint = "**Usage Hint:** \`" + process.env.PREFIX + `${this.names[0]} #<channel name> @User1 @User2 ...\``;

    async run(context: CommandContext): Promise<CommandResult> {
        this.logger.debug("Parsing arguments for finish command...");
        const parsedSession: string|ISession = await this.validateArguments(context.args);
        if(typeof parsedSession === "string") {
            this.logger.debug("Arguments are malformed!");
            await context.originalMessage.reply(parsedSession);
            return Promise.resolve(new CommandResult(this, context, false, "Input validation failed."));
        }

        if(!await this.deleteSessionFromDatabase(parsedSession.channel)) {
            await context.originalMessage.reply("Uh-oh, something went wrong while I tried to remove the session internally.");
            return Promise.resolve(new CommandResult(this, context, false, "Failed to delete session from database"));
        }

        if(!await this.deleteSessionFromSessionsChannel(parsedSession)) {
            await context.originalMessage.reply(`Uh-oh, something went wrong while I tried to remove the session from <#${parsedSession.channel}>.`);
            return Promise.resolve(new CommandResult(this, context, false, `Failed to delete session from channel (ID: ${parsedSession.channel})`));
        }

        await context.originalMessage.reply(`The session in <#${parsedSession.channel}> is now finished!`);
        return Promise.resolve(new CommandResult(this, context, true, `Deleted session for channel ID ${parsedSession.channel}`));
    }

    public async validateArguments(args: string[]): Promise<string|ISession> {
        if(args.length !== 1) return Promise.resolve("Please provide all needed arguments!\n" + this.usageHint);

        const channel = this.channelService.getTextChannelByChannelId(args[0]);
        if(!channel) return Promise.resolve("The channel you've given is not valid! Please make sure to link it with a hashtag (#).");
        const foundSession = await SessionModel.findOne({ channel: channel.id }).exec();
        if(!foundSession) return Promise.resolve(`There is no ongoing RP session in <#${channel.id}>!`);
        this.logger.trace(foundSession);

        return Promise.resolve(foundSession);
    }

    private async deleteSessionFromDatabase(channelId: string): Promise<boolean> {
        try {
            await SessionModel.findOneAndDelete({ channel: channelId }).exec();
            this.logger.debug("Deleted one record from the database.");
            return Promise.resolve(true);
        } catch(error) {
            this.logger.error(`Could not delete session for channel ID ${channelId}:`, this.logger.prettyError(error));
            return Promise.resolve(false);
        }
    }

    private async deleteSessionFromSessionsChannel(session: ISession): Promise<boolean> {
        try {
            const channel = await this.channelService.getTextChannelByChannelId(container.get<Configuration>(TYPES.Configuration).currentSessionsChannelId);
            await channel.messages.delete(session.sessionPost);
            this.logger.debug(`Deleted one message (ID: ${session.sessionPost}) in session channel.`);
            return Promise.resolve(true);
        } catch(error) {
            this.logger.error(`Failed to delete Session with message ID ${session.sessionPost}:`, this.logger.prettyError(error));
            return Promise.resolve(false);
        }
    }
}