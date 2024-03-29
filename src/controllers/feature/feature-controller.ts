import { CharacterService, QotdService, ReminderService, SessionService } from '@services/feature';
import { HiatusService } from '@services/feature/hiatus-service';
import { TimestampService } from '@services/feature/timestamp-service';
import { MessageService } from '@services/message-service';
import { ScheduleService } from '@services/schedule-service';
import { Controller } from '@src/controllers';
import { ConfigurationProvider, EmbedProvider, StringProvider } from '@src/providers';
import { ChannelService, UserService } from '@src/services';
import { TYPES } from '@src/types';
import { Client } from 'discord.js';
import { inject, injectable } from 'inversify';
import { Logger } from 'tslog';

/** Controllers handle all Discord events */
@injectable()
export class FeatureController extends Controller {
    protected readonly channelService: ChannelService;
    protected readonly scheduleService: ScheduleService;
    protected readonly userService: UserService;
    protected readonly messageService: MessageService;
    protected readonly stringProvider: StringProvider;
    protected readonly timestampService: TimestampService;
    protected readonly hiatusService: HiatusService;
    protected readonly qotdService: QotdService;
    protected readonly reminderService: ReminderService;
    protected readonly characterService: CharacterService;
    protected readonly sessionService: SessionService;

    constructor(
        @inject(TYPES.ChannelService) channelService: ChannelService,
        @inject(TYPES.ScheduleService) scheduleService: ScheduleService,
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.MessageService) messageService: MessageService,
        @inject(TYPES.BaseLogger) logger: Logger,
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.GuildId) guildId: string,
        @inject(TYPES.Token) token: string,
        @inject(TYPES.ConfigurationProvider) configuration: ConfigurationProvider,
        @inject(TYPES.EmbedProvider) embedProvider: EmbedProvider,
        @inject(TYPES.StringProvider) stringProvider: StringProvider,
        @inject(TYPES.TimestampService) timestampService: TimestampService,
        @inject(TYPES.HiatusService) hiatusService: HiatusService,
        @inject(TYPES.QotdService) qotdService: QotdService,
        @inject(TYPES.ReminderService) reminderService: ReminderService,
        @inject(TYPES.CharacterService) characterService: CharacterService,
        @inject(TYPES.SessionService) sessionService: SessionService
    ) {
        super(logger, guildId, token, client, configuration, embedProvider);
        this.channelService = channelService;
        this.userService = userService;
        this.scheduleService = scheduleService;
        this.messageService = messageService;
        this.stringProvider = stringProvider;
        this.timestampService = timestampService;
        this.hiatusService = hiatusService;
        this.qotdService = qotdService;
        this.reminderService = reminderService;
        this.characterService = characterService;
        this.sessionService = sessionService;
    }
}
