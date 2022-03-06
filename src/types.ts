export const TYPES = {
    // Constants
    Server: Symbol('Server'),
    Client: Symbol('Client'),
    Token: Symbol('Token'),
    BotOwnerId: Symbol('BotOwnerId'),
    GuildId: Symbol('GuildId'),
    Environment: Symbol('Environment'),
    MongoDbConnectionString: Symbol('MongoDbConnectionString'),
    RedisClient: Symbol('RedisClient'),
    RedisHost: Symbol('RedisHost'),
    RedisPort: Symbol('RedisPort'),
    RedisPassword: Symbol('RedisPassword'),
    BotVersion: Symbol('BotVersion'),

    // Controllers
    MessageController: Symbol('MessageController'),
    InteractionController: Symbol('InteractionController'),
    JobRuntimeController: Symbol('JobRuntimeController'),
    QotdController: Symbol('QotdController'),
    CharacterChannelController: Symbol('CharacterChannelController'),

    // Providers
    StringProvider: Symbol('StringProvider'),
    EmojiProvider: Symbol('EmojiProvider'),
    ConfigurationProvider: Symbol('ConfigurationProvider'),
    EmbedProvider: Symbol('EmbedProvider'),
    PermissionProvider: Symbol('PermissionProvider'),

    // Services
    HelperService: Symbol('HelperService'),
    UserService: Symbol('UserService'),
    ChannelService: Symbol('ChannelService'),
    InteractionService: Symbol('InteractionService'),
    ScheduleService: Symbol('ScheduleService'),
    MessageService: Symbol('MessageService'),

    // Mappers
    SessionMapper: Symbol('SessionMapper'),

    // Commands
    Ping: Symbol('Ping'),
    SessionStart: Symbol('Start'),
    SessionFinish: Symbol('Finish'),
    SessionEdit: Symbol('Edit'),
    SessionNext: Symbol('Next'),
    Configuration: Symbol('Configuration'),
    Strings: Symbol('Strings'),
    Hiatus: Symbol('Hiatus'),
    Show: Symbol('Show'),
    Qotd: Symbol('Qotd'),
    QotdAdmin: Symbol('Qotdadmin'),
    CanonCharacter: Symbol('Cc'),
    OriginalCharacter: Symbol('Oc'),
    Info: Symbol('Info'),

    // Logging
    BaseLogLevel: Symbol('BaseLogLevel'),
    BaseLogger: Symbol('BaseLogger'),
    ServiceLogger: Symbol('ServiceLogger'),
    ServiceLogLevel: Symbol('ServiceLogLevel'),
    CommandLogger: Symbol('CommandLogger'),
    CommandLogLevel: Symbol('CommandLogLevel'),
    ProviderLogger: Symbol('ProviderLogger'),
    ProviderLogLevel: Symbol('ProviderLogLevel'),
    IgnoreStackLevels: Symbol('IgnoreStackLevels'),
};
