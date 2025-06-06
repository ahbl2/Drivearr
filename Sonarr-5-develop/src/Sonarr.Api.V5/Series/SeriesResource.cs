using NzbDrone.Common.Extensions;
using NzbDrone.Core.Languages;
using NzbDrone.Core.MediaCover;
using NzbDrone.Core.Tv;
using Sonarr.Http.REST;

namespace Sonarr.Api.V5.Series;

public class SeriesResource : RestResource
{
    public string? Title { get; set; }
    public List<AlternateTitleResource>? AlternateTitles { get; set; }
    public string? SortTitle { get; set; }
    public SeriesStatusType Status { get; set; }
    public bool Ended => Status == SeriesStatusType.Ended;
    public string? ProfileName { get; set; }
    public string? Overview { get; set; }
    public DateTime? NextAiring { get; set; }
    public DateTime? PreviousAiring { get; set; }
    public string? Network { get; set; }
    public string? AirTime { get; set; }
    public List<MediaCover>? Images { get; set; }
    public Language? OriginalLanguage { get; set; }
    public string? RemotePoster { get; set; }
    public List<SeasonResource> Seasons { get; set; } = new();
    public int Year { get; set; }
    public string? Path { get; set; }
    public int QualityProfileId { get; set; }
    public bool SeasonFolder { get; set; }
    public bool Monitored { get; set; }
    public NewItemMonitorTypes MonitorNewItems { get; set; }
    public bool UseSceneNumbering { get; set; }
    public int Runtime { get; set; }
    public int TvdbId { get; set; }
    public int TvRageId { get; set; }
    public int TvMazeId { get; set; }
    public int TmdbId { get; set; }
    public DateTime? FirstAired { get; set; }
    public DateTime? LastAired { get; set; }
    public SeriesTypes SeriesType { get; set; }
    public string? CleanTitle { get; set; }
    public string? ImdbId { get; set; }
    public string? TitleSlug { get; set; }
    public string? RootFolderPath { get; set; }
    public string? Folder { get; set; }
    public string? Certification { get; set; }
    public List<string>? Genres { get; set; }
    public HashSet<int>? Tags { get; set; }
    public DateTime Added { get; set; }
    public AddSeriesOptions? AddOptions { get; set; }
    public Ratings? Ratings { get; set; }
    public SeriesStatisticsResource? Statistics { get; set; }
    public bool? EpisodesChanged { get; set; }
}

public static class SeriesResourceMapper
{
    public static SeriesResource ToResource(this NzbDrone.Core.Tv.Series model, bool includeSeasonImages = false)
    {
        return new SeriesResource
        {
            Id = model.Id,
            Title = model.Title,
            SortTitle = model.SortTitle,
            Status = model.Status,
            Overview = model.Overview,
            Network = model.Network,
            AirTime = model.AirTime,
            Images = model.Images.JsonClone(),
            Seasons = model.Seasons.ToResource(includeSeasonImages),
            Year = model.Year,
            OriginalLanguage = model.OriginalLanguage,
            Path = model.Path,
            QualityProfileId = model.QualityProfileId,
            SeasonFolder = model.SeasonFolder,
            Monitored = model.Monitored,
            MonitorNewItems = model.MonitorNewItems,
            UseSceneNumbering = model.UseSceneNumbering,
            Runtime = model.Runtime,
            TvdbId = model.TvdbId,
            TvRageId = model.TvRageId,
            TvMazeId = model.TvMazeId,
            TmdbId = model.TmdbId,
            FirstAired = model.FirstAired,
            LastAired = model.LastAired,
            SeriesType = model.SeriesType,
            CleanTitle = model.CleanTitle,
            ImdbId = model.ImdbId,
            TitleSlug = model.TitleSlug,
            Certification = model.Certification,
            Genres = model.Genres,
            Tags = model.Tags,
            Added = model.Added,
            AddOptions = model.AddOptions,
            Ratings = model.Ratings
        };
    }

    public static NzbDrone.Core.Tv.Series ToModel(this SeriesResource resource)
    {
        return new NzbDrone.Core.Tv.Series
        {
            Id = resource.Id,
            Title = resource.Title,
            SortTitle = resource.SortTitle,
            Status = resource.Status,
            Overview = resource.Overview,
            Network = resource.Network,
            AirTime = resource.AirTime,
            Images = resource.Images,
            Seasons = resource.Seasons?.ToModel() ?? new List<Season>(),
            Year = resource.Year,
            OriginalLanguage = resource.OriginalLanguage,
            Path = resource.Path,
            QualityProfileId = resource.QualityProfileId,
            SeasonFolder = resource.SeasonFolder,
            Monitored = resource.Monitored,
            MonitorNewItems = resource.MonitorNewItems,
            UseSceneNumbering = resource.UseSceneNumbering,
            Runtime = resource.Runtime,
            TvdbId = resource.TvdbId,
            TvRageId = resource.TvRageId,
            TvMazeId = resource.TvMazeId,
            TmdbId = resource.TmdbId,
            FirstAired = resource.FirstAired,
            SeriesType = resource.SeriesType,
            CleanTitle = resource.CleanTitle,
            ImdbId = resource.ImdbId,
            TitleSlug = resource.TitleSlug,
            RootFolderPath = resource.RootFolderPath,
            Certification = resource.Certification,
            Genres = resource.Genres,
            Tags = resource.Tags,
            Added = resource.Added,
            AddOptions = resource.AddOptions,
            Ratings = resource.Ratings
        };
    }

    public static NzbDrone.Core.Tv.Series ToModel(this SeriesResource resource, NzbDrone.Core.Tv.Series series)
    {
        var updatedSeries = resource.ToModel();

        series.ApplyChanges(updatedSeries);

        return series;
    }

    public static List<SeriesResource> ToResource(this IEnumerable<NzbDrone.Core.Tv.Series> series,
        bool includeSeasonImages = false)
    {
        return series.Select(s => ToResource(s, includeSeasonImages)).ToList();
    }

    public static List<NzbDrone.Core.Tv.Series> ToModel(this IEnumerable<SeriesResource> resources)
    {
        return resources.Select(ToModel).ToList();
    }
}
