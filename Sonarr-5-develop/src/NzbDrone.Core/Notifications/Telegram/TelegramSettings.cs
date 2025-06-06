using System;
using System.Collections.Generic;
using System.Linq;
using FluentValidation;
using NzbDrone.Core.Annotations;
using NzbDrone.Core.Validation;
namespace NzbDrone.Core.Notifications.Telegram
{
    public class TelegramSettingsValidator : AbstractValidator<TelegramSettings>
    {
        public TelegramSettingsValidator()
        {
            RuleFor(c => c.BotToken).NotEmpty();
            RuleFor(c => c.ChatId).NotEmpty();
            RuleFor(c => c.TopicId).Must(topicId => !topicId.HasValue || topicId > 1)
                                   .WithMessage("Topic ID must be greater than 1 or empty");
            RuleFor(c => c.MetadataLinks).Custom((links, context) =>
            {
                foreach (var link in links)
                {
                    if (!Enum.IsDefined(typeof(MetadataLinkType), link))
                    {
                        context.AddFailure("MetadataLinks", $"MetadataLink is not valid: {link}");
                    }
                }
            });

            RuleFor(c => c.LinkPreview).Custom((link, context) =>
            {
                if (!Enum.IsDefined(typeof(MetadataLinkPreviewType), link))
                {
                    context.AddFailure("LinkPreview", $"Selected value is not valid: {link}");
                }
            });

            // Ensure the select value is one of the selected metadata links
            RuleFor(c => c.LinkPreview)
                .Must((model, field) => model.MetadataLinks.Any(link => link == field))
                .Unless(c => c.LinkPreview == (int)MetadataLinkPreviewType.None)
                .WithMessage("Link Preview must be one of the selected Metadata Links");
        }
    }

    public class TelegramSettings : NotificationSettingsBase<TelegramSettings>
    {
        private static readonly TelegramSettingsValidator Validator = new();

        public TelegramSettings()
        {
            MetadataLinks = Enumerable.Empty<int>();
            LinkPreview = (int)MetadataLinkPreviewType.None;
        }

        [FieldDefinition(0, Label = "NotificationsTelegramSettingsBotToken", Privacy = PrivacyLevel.ApiKey, HelpLink = "https://core.telegram.org/bots")]
        public string BotToken { get; set; }

        [FieldDefinition(1, Label = "NotificationsTelegramSettingsChatId", HelpLink = "http://stackoverflow.com/a/37396871/882971", HelpText = "NotificationsTelegramSettingsChatIdHelpText")]
        public string ChatId { get; set; }

        [FieldDefinition(2, Label = "NotificationsTelegramSettingsTopicId", HelpLink = "https://stackoverflow.com/a/75178418", HelpText = "NotificationsTelegramSettingsTopicIdHelpText")]
        public int? TopicId { get; set; }

        [FieldDefinition(3, Label = "NotificationsTelegramSettingsSendSilently", Type = FieldType.Checkbox, HelpText = "NotificationsTelegramSettingsSendSilentlyHelpText")]
        public bool SendSilently { get; set; }

        [FieldDefinition(4, Label = "NotificationsTelegramSettingsIncludeAppName", Type = FieldType.Checkbox, HelpText = "NotificationsTelegramSettingsIncludeAppNameHelpText")]
        public bool IncludeAppNameInTitle { get; set; }

        [FieldDefinition(5, Label = "NotificationsTelegramSettingsIncludeInstanceName", Type = FieldType.Checkbox, HelpText = "NotificationsTelegramSettingsIncludeInstanceNameHelpText", Advanced = true)]
        public bool IncludeInstanceNameInTitle { get; set; }

        [FieldDefinition(6, Label = "NotificationsTelegramSettingsMetadataLinks", Type = FieldType.Select, SelectOptions = typeof(MetadataLinkType), HelpText = "NotificationsTelegramSettingsMetadataLinksHelpText")]
        public IEnumerable<int> MetadataLinks { get; set; }

        [FieldDefinition(7, Label = "NotificationsTelegramSettingsLinkPreview", Type = FieldType.Select, SelectOptions = typeof(MetadataLinkPreviewType), HelpText = "NotificationsTelegramSettingsLinkPreviewHelpText")]
        public int LinkPreview { get; set; }

        public override NzbDroneValidationResult Validate()
        {
            return new NzbDroneValidationResult(Validator.Validate(this));
        }
    }
}
