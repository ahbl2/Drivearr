using System;
using System.Collections.Generic;
using Equ;
using FluentValidation;
using NzbDrone.Core.Annotations;
using NzbDrone.Core.Languages;
using NzbDrone.Core.Validation;

namespace NzbDrone.Core.Indexers.Torrentleech
{
    public class TorrentleechSettingsValidator : AbstractValidator<TorrentleechSettings>
    {
        public TorrentleechSettingsValidator()
        {
            RuleFor(c => c.BaseUrl).ValidRootUrl();
            RuleFor(c => c.ApiKey).NotEmpty();

            RuleFor(c => c.SeedCriteria).SetValidator(_ => new SeedCriteriaSettingsValidator());
        }
    }

    public class TorrentleechSettings : PropertywiseEquatable<TorrentleechSettings>, ITorrentIndexerSettings
    {
        private static readonly TorrentleechSettingsValidator Validator = new();

        public TorrentleechSettings()
        {
            BaseUrl = "http://rss.torrentleech.org";
            MinimumSeeders = IndexerDefaults.MINIMUM_SEEDERS;
            MultiLanguages = Array.Empty<int>();
            FailDownloads = Array.Empty<int>();
        }

        [FieldDefinition(0, Label = "IndexerSettingsWebsiteUrl")]
        public string BaseUrl { get; set; }

        [FieldDefinition(1, Label = "ApiKey", Privacy = PrivacyLevel.ApiKey)]
        public string ApiKey { get; set; }

        [FieldDefinition(2, Type = FieldType.Number, Label = "IndexerSettingsMinimumSeeders", HelpText = "IndexerSettingsMinimumSeedersHelpText", Advanced = true)]
        public int MinimumSeeders { get; set; }

        [FieldDefinition(3)]
        public SeedCriteriaSettings SeedCriteria { get; set; } = new();

        [FieldDefinition(4, Type = FieldType.Checkbox, Label = "IndexerSettingsRejectBlocklistedTorrentHashes", HelpText = "IndexerSettingsRejectBlocklistedTorrentHashesHelpText", Advanced = true)]
        public bool RejectBlocklistedTorrentHashesWhileGrabbing { get; set; }

        [FieldDefinition(5, Type = FieldType.Select, SelectOptions = typeof(RealLanguageFieldConverter), Label = "IndexerSettingsMultiLanguageRelease", HelpText = "IndexerSettingsMultiLanguageReleaseHelpText", Advanced = true)]
        public IEnumerable<int> MultiLanguages { get; set; }

        [FieldDefinition(6, Type = FieldType.Select, SelectOptions = typeof(FailDownloads), Label = "IndexerSettingsFailDownloads", HelpText = "IndexerSettingsFailDownloadsHelpText", Advanced = true)]
        public IEnumerable<int> FailDownloads { get; set; }

        public NzbDroneValidationResult Validate()
        {
            return new NzbDroneValidationResult(Validator.Validate(this));
        }
    }
}
