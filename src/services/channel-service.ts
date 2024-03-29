import { ConfigurationProvider } from '@providers/configuration-provider';
import { HelperService } from '@services/index';
import { Service } from '@services/service';
import { TYPES } from '@src/types';
import { Client, Collection, Message, TextChannel } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Handles different functions in relation to the Discord Channel objects */
@injectable()
export class ChannelService extends Service {
    private readonly helperService: HelperService;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandLogger) logger: Logger,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.HelperService) helperService: HelperService
    ) {
        super(client, logger, configuration);
        this.helperService = helperService;
    }

    /**
     * Gets a TextChannel by a un-sanitized Discord ID (<#id>)
     *
     * @param dirtyId The un-sanitized ID
     * @returns The found text channel | null if not found
     */
    public getTextChannelByChannelId(dirtyId: string): TextChannel {
        const sanitizedChannelId = this.helperService.sanitizeDiscordId(dirtyId);
        if (!sanitizedChannelId) return null;

        const matchedChannel = this.client.channels.cache.get(sanitizedChannelId);
        if (!matchedChannel) {
            this.logger.warn(`Could not match a Discord channel for ID ${sanitizedChannelId}.`);
            return null;
        }
        if (!matchedChannel.isText()) {
            this.logger.warn(`Found channel for ID ${sanitizedChannelId} is not a text channel.`);
            return null;
        }
        return matchedChannel as TextChannel;
    }

    /**
     * Checks if a given channelId is an RP channel
     *
     * @param channelId The channel id to check
     * @returns True if rp channel, false if not
     */
    public async isRpChannel(channelId: string): Promise<boolean> {
        return await this.configuration.isInSet('Channels_RpChannelIds', channelId);
    }

    /**
     * Clears the given channel of all messages the bot client sent
     *
     * @param channel the channel to clear
     */
    public async clearChannelOfBotMessages(channel: TextChannel): Promise<void> {
        const messages: Collection<string, Message> = await channel.messages.fetch();

        for (const message of messages.values()) {
            if (message.author.id === this.client.user.id) {
                try {
                    await message.delete();
                } catch (error) {
                    this.logger.warn(
                        `Could not delete bot message ${message.id} in canon character list channel!`
                    );
                }
            }
        }
    }
}
