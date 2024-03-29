import { Command } from '@commands/command';
import { CommandResult } from '@models/commands/command-result';
import { PermissionLevel } from '@models/permissions/permission-level';
import {
    ConfigurationKeys,
    EmbedLevel,
    EmbedType,
    SessionModel,
    TimestampStatus,
} from '@src/models';
import { CommandInteraction } from 'discord.js';
import { injectable } from 'inversify';
import moment = require('moment');

@injectable()
export class Show extends Command {
    public permissionLevel: PermissionLevel = PermissionLevel.Member;

    async run(interaction: CommandInteraction): Promise<CommandResult> {
        const unsortedSessions = await SessionModel.find({
            'currentTurn.userId': interaction.member?.user?.id,
        })
            .sort({ lastTurnAdvance: 'asc' })
            .exec();

        let pendingSessions = [];
        unsortedSessions.forEach((session) => {
            if (session.isMainQuest) pendingSessions.push(session);
        });
        const nonMainQuestSessions = unsortedSessions.filter((session) => !session.isMainQuest);
        pendingSessions = pendingSessions.concat(nonMainQuestSessions);

        let content = '';
        let title;

        if (!pendingSessions || pendingSessions.length === 0) {
            title = `No Pending Replies`;
            content += `You have no pending replies!`;
        } else {
            title = `:speech_balloon: Your Pending Replies`;
            for (const session of pendingSessions) {
                if (session.timestampPostId !== undefined) {
                    const timestampPost = await this.messageService.getMessageFromChannel(
                        session.timestampPostId,
                        await this.configuration.getString(
                            ConfigurationKeys.Channels_TimestampsChannelId
                        )
                    );
                    if (session.isMainQuest) content += '⭐';
                    if (
                        timestampPost.embeds[0].title === TimestampStatus.SecondReminder ||
                        timestampPost.embeds[0].title === TimestampStatus.OverdueReminder
                    ) {
                        content += `❗ `;
                    }
                }
                content += `**${session.currentTurn.name}** in <#${
                    session.channelId
                }> (since <t:${moment(session.lastTurnAdvance).unix()}:D>)\n\n`;
            }
        }

        let footer = '';
        if (content.includes('⭐'))
            footer +=
                'Pending replies marked with ⭐ are main quests. They take priority over the rest.\n';
        if (content.includes('❗'))
            footer += 'Pending replies marked with ❗ are overdue. You should get to these first.';

        const embed = await this.embedProvider.get(EmbedType.Detailed, EmbedLevel.Info, {
            title: title,
            content: content,
            footer: footer,
        });

        await this.interactionService.reply(interaction, { embeds: [embed] });

        return {
            executed: true,
            message: 'Successfully executed show command.',
        };
    }

    async validateOptions(): Promise<void> {
        return;
    }
}
