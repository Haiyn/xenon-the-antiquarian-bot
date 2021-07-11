import "reflect-metadata";
import "mocha";
import { expect } from "chai";
import { instance, mock, when } from "ts-mockito";
import { GuildMemberRoleManager, Message } from "discord.js";
import { MessageController } from "../../src/controllers/message-controller";
import { CommandService, MessageService, PermissionService } from "../../src/services";
import { Logger } from "tslog";
import { MessageControllerResult } from "../../src/models/message-controller-result";
import { CommandContext } from "../../src/models/command-context";

describe("MessageHandler", () => {
    let mockedMessageService: MessageService;
    let mockedMessageServiceInstance: MessageService;
    let mockedPermissionHandlerClass: PermissionService;
    let mockedPermissionHandlerInstance: PermissionService;
    let mockedCommandService: CommandService;
    let mockedCommandServiceInstance: CommandService;
    let mockedServiceLoggerClass: Logger;
    let mockedServiceLoggerInstance: Logger;

    let mockedMessageClass: Message;
    let mockedMessageInstance: Message;
    let mockedCommandContextClass: CommandContext;
    let mockedCommandContextInstance: CommandContext;
    let mockedGuildMemberRoleManager: GuildMemberRoleManager;
    let mockedGuildMemberRoleManagerInstance: GuildMemberRoleManager;

    let result: MessageControllerResult;
    let service: MessageController;

    beforeEach(() => {
        mockedMessageService = mock(MessageService);
        mockedMessageServiceInstance = instance(mockedMessageService);
        mockedPermissionHandlerClass = mock(PermissionService);
        mockedPermissionHandlerInstance = instance(mockedPermissionHandlerClass);
        mockedServiceLoggerClass = mock(Logger);
        mockedServiceLoggerInstance = instance(mockedServiceLoggerClass);
        mockedMessageClass = mock(Message);
        mockedMessageInstance = instance(mockedMessageClass);
        mockedCommandContextClass = mock(CommandContext);
        mockedCommandContextInstance = instance(mockedCommandContextClass);
        mockedCommandService = mock(CommandService);
        mockedCommandServiceInstance = instance(mockedCommandService);
        mockedGuildMemberRoleManager = mock(GuildMemberRoleManager);
        mockedGuildMemberRoleManagerInstance = instance(mockedGuildMemberRoleManager);
        mockedMessageInstance.content = "Test";
        mockedGuildMemberRoleManagerInstance.member.roles


        service = new MessageController(
            mockedMessageServiceInstance,
            mockedPermissionHandlerInstance,
            mockedCommandServiceInstance,
            mockedServiceLoggerInstance
        );
    });

    it("Should skip because not prefixed", async () => {
        whenIsPrefixedMessageReturns(false);

        result = await service.handleMessage(mockedMessageInstance);

        expect(result.commandExecuted).false;
        expect(result.error).undefined;
    });

    it("Should skip because bot message", async () => {
        whenIsBotMessageReturns(true);

        result = await service.handleMessage(mockedMessageInstance);

        expect(result.commandExecuted).false;
        expect(result.error).undefined;
    });

    it("Should reject: Not recognized", async () => {
        whenIsBotMessageReturns(false);
        whenIsPrefixedMessageReturns(true);
        whenGetCommandContextReturns(null);

        result = await service.handleMessage(mockedMessageInstance);

        expect(result.commandExecuted).false;
        expect(result.error).undefined;
    });

    it("Should reject: User not authorized", async () => {
        whenIsPrefixedMessageReturns(true);
        whenGetCommandContextReturns(mockedCommandContextInstance);
        whenHasPermissionReturns(false);

        result = await service.handleMessage(mockedMessageInstance);

        expect(result.commandExecuted).false;
        expect(result.error).undefined;
    });

    it("Should run command", async () => {
        whenIsBotMessageReturns(false);
        whenIsPrefixedMessageReturns(true);
        whenGetCommandContextReturns(mockedCommandContextInstance);
        whenHasPermissionReturns(true);

        result = await service.handleMessage(mockedMessageInstance);

        expect(result.commandExecuted).true;
        expect(result.error).undefined;
    });

    function whenIsBotMessageReturns(result: boolean) {
        when(mockedMessageService.isBotMessage(mockedMessageInstance)).thenReturn(result);
    }

    function whenIsPrefixedMessageReturns(result: boolean) {
        when(mockedMessageService.isPrefixedMessage(mockedMessageInstance)).thenReturn(result);
    }

    function whenHasPermissionReturns(result: boolean) {
        when(mockedPermissionHandlerClass.hasPermission(mockedGuildMemberRoleManagerInstance, 0)).thenReturn(result);
    }

    function whenGetCommandContextReturns(result: CommandContext|null) {
        when(mockedCommandService.getCommandContextFromMessage(mockedMessageInstance)).thenReturn(result);
    }
});