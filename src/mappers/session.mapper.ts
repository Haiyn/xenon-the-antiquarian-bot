import { Reminder } from '@models/jobs/reminder';
import { Mapper } from '@src/mappers/mapper';
import {
    Character,
    ConfigurationKeys,
    ICharacterSchema,
    ISessionSchema,
    Session,
} from '@src/models';
import { GuildMember } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class SessionMapper extends Mapper {
    public async mapSessionSchemaToSession(sessionSchema: ISessionSchema): Promise<Session> {
        const channel = this.channelService.getTextChannelByChannelId(sessionSchema.channelId);
        const turnOrder: Character[] = [];
        for (const characterSchema of sessionSchema.turnOrder) {
            turnOrder.push(await this.mapCharacterSchemaToCharacter(characterSchema));
        }
        const currentTurn: Character = await this.mapCharacterSchemaToCharacter(
            sessionSchema.currentTurn
        );
        const sessionPost = await this.messageService.getMessageFromChannel(
            sessionSchema.sessionPostId,
            await this.configuration.getString(ConfigurationKeys.Channels_CurrentSessionsChannelId)
        );
        let timestampPost;
        if (sessionSchema.timestampPostId) {
            timestampPost = await this.messageService.getMessageFromChannel(
                sessionSchema.timestampPostId,
                await this.configuration.getString(ConfigurationKeys.Channels_TimestampsChannelId)
            );
        }
        return {
            channel: channel,
            turnOrder: turnOrder,
            currentTurn: currentTurn,
            sessionPost: sessionPost,
            timestampPost: timestampPost !== undefined ? timestampPost : undefined,
            lastTurnAdvance: sessionSchema.lastTurnAdvance,
            isMainQuest: sessionSchema.isMainQuest,
        };
    }

    public async mapCharacterSchemaToCharacter(
        characterSchema: ICharacterSchema
    ): Promise<Character> {
        const member: GuildMember = await this.userService.getGuildMemberById(
            characterSchema.userId
        );
        return {
            member: member,
            name: characterSchema.name,
        };
    }

    public mapSessionToSessionSchema(session: Session): ISessionSchema {
        const turnOrder: ICharacterSchema[] = [];
        session.turnOrder.forEach((character) => {
            turnOrder.push(this.mapCharacterToCharacterSchema(character));
        });
        const currentTurn = this.mapCharacterToCharacterSchema(session.currentTurn);
        return {
            channelId: session.channel.id,
            turnOrder: turnOrder,
            currentTurn: currentTurn,
            sessionPostId: session.sessionPost.id,
            timestampPostId:
                session.timestampPost !== undefined ? session.timestampPost.id : undefined,
            lastTurnAdvance: session.lastTurnAdvance,
            isMainQuest: session.isMainQuest,
        };
    }

    public mapCharacterToCharacterSchema(character: Character): ICharacterSchema {
        return {
            userId: character.member?.id ? character.member.id : '0',
            name: character.name,
        };
    }

    /**
     * Parses a session into a reminder
     *
     * @param session the session to parse
     * @returns the parsed reminder
     */
    public async mapSessionSchemaToReminder(session: ISessionSchema): Promise<Reminder> {
        const name = `reminder:${session.channelId}`;
        const member = await this.userService.getGuildMemberById(session.currentTurn.userId);
        const channel = await this.channelService.getTextChannelByChannelId(session.channelId);

        // Get the new reminder date
        const currentDate = new Date(new Date().getTime());
        const reminderHours = Number.parseInt(
            await this.configuration.getString('Schedule_Reminder_0_Hours')
        );
        const reminderMinutes = Number.parseInt(
            await this.configuration.getString('Schedule_Reminder_0_Minutes')
        );
        currentDate.setHours(
            currentDate.getHours() + reminderHours,
            currentDate.getMinutes() + reminderMinutes
        );

        return new Reminder(name, member, session.currentTurn.name, currentDate, channel, 0);
    }

    /**
     * Parses a session into a reminder
     *
     * @param session the session to parse
     * @returns the parsed reminder
     */
    public async mapSessionToReminder(session: Session): Promise<Reminder> {
        const name = `reminder:${session.channel.id}`;
        const member = session.currentTurn.member;
        const channel = session.channel;

        // Get the new reminder date
        const currentDate = new Date(new Date().getTime());
        const reminderHours = Number.parseInt(
            await this.configuration.getString('Schedule_Reminder_0_Hours')
        );
        const reminderMinutes = Number.parseInt(
            await this.configuration.getString('Schedule_Reminder_0_Minutes')
        );
        currentDate.setHours(
            currentDate.getHours() + reminderHours,
            currentDate.getMinutes() + reminderMinutes
        );

        return new Reminder(name, member, session.currentTurn.name, currentDate, channel, 0);
    }
}
