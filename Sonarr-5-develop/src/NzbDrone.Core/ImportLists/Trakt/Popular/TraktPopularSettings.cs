using System.Text.RegularExpressions;
using FluentValidation;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Annotations;
using NzbDrone.Core.Validation;

namespace NzbDrone.Core.ImportLists.Trakt.Popular
{
    public class TraktPopularSettingsValidator : TraktSettingsBaseValidator<TraktPopularSettings>
    {
        public TraktPopularSettingsValidator()
        {
            RuleFor(c => c.TraktListType)
                .NotNull()
#pragma warning disable CS0612
                .NotEqual((int)TraktPopularListType.TopWatchedByYear)
                .WithMessage("Yearly lists are no longer supported")
                .NotEqual((int)TraktPopularListType.RecommendedByYear)
                .WithMessage("Yearly lists are no longer supported");
#pragma warning restore CS0612

            // Loose validation @TODO
            RuleFor(c => c.Rating)
                .Matches(@"^\d+\-\d+$", RegexOptions.IgnoreCase)
                .When(c => c.Rating.IsNotNullOrWhiteSpace())
                .WithMessage("Not a valid rating");

            // Loose validation @TODO
            RuleFor(c => c.Years)
                .Matches(@"^\d+(\-\d+)?$", RegexOptions.IgnoreCase)
                .When(c => c.Years.IsNotNullOrWhiteSpace())
                .WithMessage("Not a valid year or range of years");
        }
    }

    public class TraktPopularSettings : TraktSettingsBase<TraktPopularSettings>
    {
        private static readonly TraktPopularSettingsValidator Validator = new();

        public TraktPopularSettings()
        {
            TraktListType = (int)TraktPopularListType.Popular;
        }

        [FieldDefinition(1, Label = "ImportListsTraktSettingsListType", Type = FieldType.Select, SelectOptions = typeof(TraktPopularListType), HelpText = "ImportListsTraktSettingsListTypeHelpText")]
        public int TraktListType { get; set; }

        [FieldDefinition(2, Label = "ImportListsTraktSettingsRating", HelpText = "ImportListsTraktSettingsRatingSeriesHelpText")]
        public string Rating { get; set; }

        [FieldDefinition(4, Label = "ImportListsTraktSettingsGenres", HelpText = "ImportListsTraktSettingsGenresSeriesHelpText")]
        public string Genres { get; set; }

        [FieldDefinition(5, Label = "ImportListsTraktSettingsYears", HelpText = "ImportListsTraktSettingsYearsSeriesHelpText")]
        public string Years { get; set; }

        [FieldDefinition(6, Label = "ImportListsTraktSettingsAdditionalParameters", HelpText = "ImportListsTraktSettingsAdditionalParametersHelpText", Advanced = true)]
        public string TraktAdditionalParameters { get; set; }

        public override NzbDroneValidationResult Validate()
        {
            return new NzbDroneValidationResult(Validator.Validate(this));
        }
    }
}
