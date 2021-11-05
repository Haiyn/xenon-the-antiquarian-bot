import { Command } from '@commands/command';
import { CommandError } from '@models/commands/command-error';
import { CommandResult } from '@models/commands/command-result';
import { ICharacterSchema } from '@models/data/character-schema';
import { ISessionSchema, SessionModel } from '@models/data/session-schema';
import { CommandValidationError } from '@src/models/commands/command-validation-error';
import {
    CommandInteraction,
    CommandInteractionOptionResolver,
    Message,
    TextChannel,
} from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class SessionNext extends Command {
    async run(interaction: CommandInteraction): Promise<CommandResult> {
        this.logger.debug('Resolving channel...');
        let channel;
        if (!interaction.options.getChannel('channel')) {
            // No channel option was supplied, check the current channel
            await SessionNext.validateCurrentChannel(interaction.channelId);
            channel = interaction.channel;
        } else {
            // Channel option was supplied, use it
            channel = interaction.options.getChannel('channel');
        }

        const session: ISessionSchema = await SessionModel.findOne({ channelId: channel.id });
        const userMessage: string = interaction.options.getString('message');

        this.logger.debug('Validating user turn...');
        await SessionNext.validateUserTurn(session.currentTurn.userId, interaction.member.user.id);

        this.logger.debug('Updating user turn in database...');
        const newSession: ISessionSchema = await this.updateTurnOderInDatabase(session);

        this.logger.debug('Updating user turn in sessions channel...');
        await this.updateTurnOrderInSessionsChannel(newSession);

        this.logger.debug('Notifying next user...');
        await this.notifyNextUser(session.currentTurn, newSession, userMessage);

        await interaction.reply({
            content: 'I notified the next user!',
        });
        // TODO: Delete message

        return {
            executed: true,
            message: `Successfully advanced turn for RP in channel ID ${channel.id}`,
        };
    }

    public async validateOptions(options: CommandInteractionOptionResolver): Promise<void> {
        const channel = options.getChannel('channel');
        if (!channel) return Promise.resolve(); // It is valid to provide no channel, the interaction channel will be checked instead
        const foundSession = await SessionModel.findOne({
            channelId: channel.id,
        }).exec();
        if (!foundSession) {
            throw new CommandValidationError(
                `User provided channel that has no ongoing RP.`,
                'There is no ongoing RP in <#{0}>!'
            );
        }
    }

    /**
     * Validates that it is currently the command creator's turn
     *
     * @param {string} currentTurnId The User ID of the user that is currently next
     * @param {string} interactionCreatorId The User ID of the user that issued the command
     * @returns {Promise<void>} Resolves if valid
     * @throws {CommandValidationError} Throws if it's not their turn
     */
    private static async validateUserTurn(
        currentTurnId: string,
        interactionCreatorId: string
    ): Promise<void> {
        if (currentTurnId != interactionCreatorId) {
            throw new CommandValidationError(
                "User tried to advance RP but it's not their turn",
                `It is currently <@{0}>'s turn! Only they are allowed to advance their turn.`
            );
        }
    }

    /**
     * Validates the channel where the command was used because no channel was passe in the options
     *
     * @param {string} currentChannelId The ID of the channel where the command was used
     * @returns {Promise<void>} Resolves if there's an RP in this channel
     * @throws {CommandValidationError} Throws is there is no RP in this channel
     */
    private static async validateCurrentChannel(currentChannelId: string): Promise<void> {
        const result = await SessionModel.findOne({ channelId: currentChannelId });
        if (!result)
            throw new CommandValidationError(
                'User tried to use next command without parameter in an channel that has no ongoing session',
                `There is no ongoing RP session in this channel! Please use this command in the RP channel or supply it when using the command.`
            );
    }

    /**
     * Iterates the turn and saves the new current turn to the session in the database
     *
     * @param {ISessionSchema} session The current session before the iterate turn
     * @returns {Promise<ISessionSchema>} The new session after the update
     * @throws {CommandError} Throws if saving to mongodb failed
     */
    private async updateTurnOderInDatabase(session: ISessionSchema): Promise<ISessionSchema> {
        const nextTurn: ICharacterSchema = this.iterateTurn(session.turnOrder, session.currentTurn);

        this.logger.trace(
            `Current session: ${JSON.stringify(session)}\nNext currentTurn will be: ${
                nextTurn.userId
            } - ${nextTurn.name}`
        );
        const newSession: ISessionSchema = await SessionModel.findOneAndUpdate(
            { channelId: session.channelId },
            { currentTurn: nextTurn },
            { new: true }
        ).catch(async (error) => {
            throw new CommandError(
                `Could not update session for channel ID ${session.channelId}`,
                await this.stringProvider.get('SYSTEM.ERROR.INTERNAL.MONGOOSE-REJECT'),
                error
            );
        });
        this.logger.trace(
            `Updated next user for session: ${JSON.stringify(newSession.currentTurn)}`
        );
        return newSession;
    }

    /**
     * Updates the current turn indicator in the current sessions channel
     *
     * @param {ISessionSchema} session The new session with the new current turn
     * @returns {Promise<void>} Resolves when sent
     * @throws {CommandError} Throws if the message could not be edited
     */
    private async updateTurnOrderInSessionsChannel(session: ISessionSchema): Promise<void> {
        try {
            let postContent = `\n\n<#${session.channelId}>:\n`;
            session.turnOrder.forEach((character) => {
                if (
                    character.userId === session.currentTurn.userId &&
                    character.name === session.currentTurn.name
                )
                    postContent += ':arrow_right: ';
                postContent += `${character.name} <@${character.userId}>\n`;
            });
            const divider = '```⋟────────────────────────⋞```';

            const sessionPost: Message = this.channelService
                .getTextChannelByChannelId(this.configuration.channels.currentSessionsChannelId)
                .messages.cache.get(session.sessionPostId);
            await sessionPost.edit({
                content: postContent + divider,
                allowedMentions: { parse: [] },
            });
        } catch (error) {
            throw new CommandError(
                'Failed to update session post with new current turn marker',
                "Uh-oh, I couldn't manage to update the session post in <#{0}!",
                error
            );
        }
    }

    /**
     * Mentions the user that is next in the turn order
     *
     * @param {ICharacterSchema} previousTurn The user that previously had the turn
     * @param {ISessionSchema} newSession The session after the turn order update
     * @param {string} userMessage The message the previous user left
     * @returns {Promise<void>} Resolves when notification sent
     */
    private async notifyNextUser(
        previousTurn: ICharacterSchema,
        newSession: ISessionSchema,
        userMessage?: string
    ): Promise<void> {
        let messageContent = `<@${newSession.currentTurn.userId}> (${newSession.currentTurn.name}) in <#${newSession.channelId}>`;
        if (userMessage) messageContent += `\n<@${previousTurn.userId}> said: \"${userMessage}\"`;
        const notificationChannel: TextChannel =
            await this.channelService.getTextChannelByChannelId(
                this.configuration.channels.notificationChannelId
            );
        await notificationChannel.send({
            content: messageContent,
            allowedMentions: { users: [newSession.currentTurn.userId] },
        });

        this.logger.debug(
            `Notified next user (ID: ${newSession.currentTurn.userId}) in notification channel.`
        );
    }

    /**
     * Takes a turn order and current turn and finds person that is next
     *
     * @param {Array<ICharacterSchema>} turnOrder The turn oder
     * @param {ICharacterSchema} currentTurn The user that currently has the turn
     * @returns {ICharacterSchema} The user that is next
     */
    private iterateTurn(
        turnOrder: Array<ICharacterSchema>,
        currentTurn: ICharacterSchema
    ): ICharacterSchema {
        let nextTurn: ICharacterSchema = null;
        let index = 0;

        turnOrder.forEach((character) => {
            if (character.userId === currentTurn.userId && character.name === currentTurn.name) {
                if (index == turnOrder.length - 1) {
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
}