using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using NLog;
using NzbDrone.Common;
using NzbDrone.Common.Disk;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Serializer;
using NzbDrone.Core.Extras.Metadata.Files;
using NzbDrone.Core.MediaCover;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.MediaInfo;
using NzbDrone.Core.Tags;
using NzbDrone.Core.Tv;

namespace NzbDrone.Core.Extras.Metadata.Consumers.Xbmc
{
    public class XbmcMetadata : MetadataBase<XbmcMetadataSettings>
    {
        private readonly Logger _logger;
        private readonly IMapCoversToLocal _mediaCoverService;
        private readonly ITagRepository _tagRepo;
        private readonly IDetectXbmcNfo _detectNfo;
        private readonly IDiskProvider _diskProvider;

        public XbmcMetadata(IDetectXbmcNfo detectNfo,
                            IDiskProvider diskProvider,
                            IMapCoversToLocal mediaCoverService,
                            ITagRepository tagRepo,
                            Logger logger)
        {
            _logger = logger;
            _mediaCoverService = mediaCoverService;
            _tagRepo = tagRepo;
            _diskProvider = diskProvider;
            _detectNfo = detectNfo;
        }

        private static readonly Regex SeriesImagesRegex = new Regex(@"^(?<type>poster|banner|fanart)\.(?:png|jpg)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex SeasonImagesRegex = new Regex(@"^season(?<season>\d{2,}|-all|-specials)-(?<type>poster|banner|fanart)\.(?:png|jpg)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex EpisodeImageRegex = new Regex(@"-thumb\.(?:png|jpg)", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public override string Name => "Kodi (XBMC) / Emby";

        public override string GetFilenameAfterMove(Series series, EpisodeFile episodeFile, MetadataFile metadataFile)
        {
            var episodeFilePath = Path.Combine(series.Path, episodeFile.RelativePath);

            if (metadataFile.Type == MetadataType.EpisodeImage)
            {
                return GetEpisodeImageFilename(episodeFilePath);
            }

            if (metadataFile.Type == MetadataType.EpisodeMetadata)
            {
                return GetEpisodeMetadataFilename(episodeFilePath);
            }

            _logger.Debug("Unknown episode file metadata: {0}", metadataFile.RelativePath);
            return Path.Combine(series.Path, metadataFile.RelativePath);
        }

        public override MetadataFile FindMetadataFile(Series series, string path)
        {
            var filename = Path.GetFileName(path);

            if (filename == null)
            {
                return null;
            }

            var metadata = new MetadataFile
            {
                SeriesId = series.Id,
                Consumer = GetType().Name,
                RelativePath = series.Path.GetRelativePath(path)
            };

            if (SeriesImagesRegex.IsMatch(filename))
            {
                metadata.Type = MetadataType.SeriesImage;
                return metadata;
            }

            var seasonMatch = SeasonImagesRegex.Match(filename);

            if (seasonMatch.Success)
            {
                metadata.Type = MetadataType.SeasonImage;

                var seasonNumberMatch = seasonMatch.Groups["season"].Value;

                if (seasonNumberMatch.Contains("specials"))
                {
                    metadata.SeasonNumber = 0;
                }
                else if (int.TryParse(seasonNumberMatch, out var seasonNumber))
                {
                    metadata.SeasonNumber = seasonNumber;
                }
                else
                {
                    return null;
                }

                return metadata;
            }

            if (EpisodeImageRegex.IsMatch(filename))
            {
                metadata.Type = MetadataType.EpisodeImage;
                return metadata;
            }

            if (filename.Equals("tvshow.nfo", StringComparison.OrdinalIgnoreCase))
            {
                metadata.Type = MetadataType.SeriesMetadata;
                return metadata;
            }

            var parseResult = Parser.Parser.ParseTitle(filename);

            if (parseResult != null &&
                !parseResult.FullSeason &&
                Path.GetExtension(filename).Equals(".nfo", StringComparison.OrdinalIgnoreCase) &&
                _detectNfo.IsXbmcNfoFile(path))
            {
                metadata.Type = MetadataType.EpisodeMetadata;
                return metadata;
            }

            return null;
        }

        public override MetadataFileResult SeriesMetadata(Series series, SeriesMetadataReason reason)
        {
            if (reason == SeriesMetadataReason.EpisodesImported)
            {
                return null;
            }

            var xmlResult = string.Empty;

            if (Settings.SeriesMetadata)
            {
                _logger.Debug("Generating Series Metadata for: {0}", series.Title);

                var tvShow = new XElement("tvshow");

                tvShow.Add(new XElement("title", series.Title));

                if (series.Ratings != null && series.Ratings.Votes > 0)
                {
                    tvShow.Add(new XElement("rating", series.Ratings.Value));
                }

                tvShow.Add(new XElement("plot", series.Overview));
                tvShow.Add(new XElement("mpaa", series.Certification));
                tvShow.Add(new XElement("id", series.TvdbId));

                var uniqueId = new XElement("uniqueid", series.TvdbId);
                uniqueId.SetAttributeValue("type", "tvdb");
                uniqueId.SetAttributeValue("default", true);
                tvShow.Add(uniqueId);

                if (series.ImdbId.IsNotNullOrWhiteSpace())
                {
                    var imdbId = new XElement("uniqueid", series.ImdbId);
                    imdbId.SetAttributeValue("type", "imdb");
                    tvShow.Add(imdbId);
                }

                if (series.TmdbId > 0)
                {
                    var tmdbId = new XElement("uniqueid", series.TmdbId);
                    tmdbId.SetAttributeValue("type", "tmdb");
                    tvShow.Add(tmdbId);
                }

                if (series.TvMazeId > 0)
                {
                    var tvMazeId = new XElement("uniqueid", series.TvMazeId);
                    tvMazeId.SetAttributeValue("type", "tvmaze");
                    tvShow.Add(tvMazeId);
                }

                foreach (var genre in series.Genres)
                {
                    tvShow.Add(new XElement("genre", genre));
                }

                if (series.Tags.Any())
                {
                    var tags = _tagRepo.GetTags(series.Tags);

                    foreach (var tag in tags)
                    {
                        tvShow.Add(new XElement("tag", tag.Label));
                    }
                }

                tvShow.Add(new XElement("status", series.Status));

                if (series.FirstAired.HasValue)
                {
                    tvShow.Add(new XElement("premiered", series.FirstAired.Value.ToString("yyyy-MM-dd")));
                }

                // Add support for Jellyfin's "enddate" tag
                if (series.Status == SeriesStatusType.Ended && series.LastAired.HasValue)
                {
                    tvShow.Add(new XElement("enddate", series.LastAired.Value.ToString("yyyy-MM-dd")));
                }

                tvShow.Add(new XElement("studio", series.Network));

                foreach (var actor in series.Actors)
                {
                    var xmlActor = new XElement("actor",
                        new XElement("name", actor.Name),
                        new XElement("role", actor.Character));

                    if (actor.Images.Any())
                    {
                        xmlActor.Add(new XElement("thumb", actor.Images.First().RemoteUrl));
                    }

                    tvShow.Add(xmlActor);
                }

                if (Settings.SeriesMetadataEpisodeGuide)
                {
                    var episodeGuide = new KodiEpisodeGuide(series);
                    var serializerSettings = STJson.GetSerializerSettings();
                    serializerSettings.WriteIndented = false;

                    tvShow.Add(new XElement("episodeguide", JsonSerializer.Serialize(episodeGuide, serializerSettings)));
                }

                var doc = new XDocument(tvShow)
                {
                    Declaration = new XDeclaration("1.0", "UTF-8", "yes"),
                };

                var sb = new StringBuilder();
                using var sw = new Utf8StringWriter();
                using var xw = XmlWriter.Create(sw, new XmlWriterSettings
                {
                    Encoding = Encoding.UTF8,
                    Indent = true
                });

                doc.Save(xw);
                xw.Flush();

                xmlResult += sw.ToString();
            }

            if (Settings.SeriesMetadataUrl)
            {
                if (Settings.SeriesMetadata)
                {
                    xmlResult += Environment.NewLine;
                }

                xmlResult += "https://www.thetvdb.com/?tab=series&id=" + series.TvdbId;
            }

            return xmlResult.IsNullOrWhiteSpace() ? null : new MetadataFileResult("tvshow.nfo", xmlResult);
        }

        public override MetadataFileResult EpisodeMetadata(Series series, EpisodeFile episodeFile)
        {
            if (!Settings.EpisodeMetadata)
            {
                return null;
            }

            _logger.Debug("Generating Episode Metadata for: {0}", Path.Combine(series.Path, episodeFile.RelativePath));

            var watched = GetExistingWatchedStatus(series, episodeFile.RelativePath);

            var xmlResult = string.Empty;
            var xws = new XmlWriterSettings
            {
                Encoding = Encoding.UTF8,
                Indent = true
            };

            foreach (var episode in episodeFile.Episodes.Value)
            {
                var doc = new XDocument
                {
                    Declaration = new XDeclaration("1.0", "UTF-8", "yes")
                };

                var image = episode.Images.SingleOrDefault(i => i.CoverType == MediaCoverTypes.Screenshot);

                var details = new XElement("episodedetails");
                details.Add(new XElement("title", episode.Title));
                details.Add(new XElement("season", episode.SeasonNumber));
                details.Add(new XElement("episode", episode.EpisodeNumber));
                details.Add(new XElement("aired", episode.AirDate));
                details.Add(new XElement("plot", episode.Overview));

                if (episode.SeasonNumber == 0 && episode.AiredAfterSeasonNumber.HasValue)
                {
                    details.Add(new XElement("displayafterseason", episode.AiredAfterSeasonNumber));
                }
                else if (episode.SeasonNumber == 0 && episode.AiredBeforeSeasonNumber.HasValue)
                {
                    details.Add(new XElement("displayseason", episode.AiredBeforeSeasonNumber));
                    details.Add(new XElement("displayepisode", episode.AiredBeforeEpisodeNumber ?? -1));
                }

                var tvdbId = new XElement("uniqueid", episode.TvdbId);
                tvdbId.SetAttributeValue("type", "tvdb");
                tvdbId.SetAttributeValue("default", true);
                details.Add(tvdbId);

                var sonarrId = new XElement("uniqueid", episode.Id);
                sonarrId.SetAttributeValue("type", "sonarr");
                details.Add(sonarrId);

                if (image == null)
                {
                    details.Add(new XElement("thumb"));
                }
                else if (Settings.EpisodeImageThumb)
                {
                    details.Add(new XElement("thumb", image.RemoteUrl));
                }

                details.Add(new XElement("watched", watched));

                if (episode.Ratings != null && episode.Ratings.Votes > 0)
                {
                    details.Add(new XElement("rating", episode.Ratings.Value));
                }

                if (episodeFile.MediaInfo != null)
                {
                    var sceneName = episodeFile.GetSceneOrFileName();

                    var fileInfo = new XElement("fileinfo");
                    var streamDetails = new XElement("streamdetails");

                    var video = new XElement("video");
                    video.Add(new XElement("aspect", (float)episodeFile.MediaInfo.Width / (float)episodeFile.MediaInfo.Height));
                    video.Add(new XElement("bitrate", episodeFile.MediaInfo.VideoBitrate));
                    video.Add(new XElement("codec", MediaInfoFormatter.FormatVideoCodec(episodeFile.MediaInfo, sceneName)));
                    video.Add(new XElement("framerate", episodeFile.MediaInfo.VideoFps));
                    video.Add(new XElement("height", episodeFile.MediaInfo.Height));
                    video.Add(new XElement("scantype", episodeFile.MediaInfo.ScanType));
                    video.Add(new XElement("width", episodeFile.MediaInfo.Width));

                    video.Add(new XElement("duration", episodeFile.MediaInfo.RunTime.TotalMinutes));
                    video.Add(new XElement("durationinseconds", Math.Round(episodeFile.MediaInfo.RunTime.TotalSeconds)));

                    if (episodeFile.MediaInfo.VideoHdrFormat is HdrFormat.DolbyVision or HdrFormat.DolbyVisionHdr10 or HdrFormat.DolbyVisionHdr10Plus or HdrFormat.DolbyVisionHlg or HdrFormat.DolbyVisionSdr)
                    {
                        video.Add(new XElement("hdrtype", "dolbyvision"));
                    }
                    else if (episodeFile.MediaInfo.VideoHdrFormat is HdrFormat.Hdr10 or HdrFormat.Hdr10Plus or HdrFormat.Pq10)
                    {
                        video.Add(new XElement("hdrtype", "hdr10"));
                    }
                    else if (episodeFile.MediaInfo.VideoHdrFormat == HdrFormat.Hlg10)
                    {
                        video.Add(new XElement("hdrtype", "hlg"));
                    }
                    else if (episodeFile.MediaInfo.VideoHdrFormat == HdrFormat.None)
                    {
                        video.Add(new XElement("hdrtype", ""));
                    }

                    streamDetails.Add(video);

                    var audio = new XElement("audio");
                    var audioChannelCount = episodeFile.MediaInfo.AudioChannels;
                    audio.Add(new XElement("bitrate", episodeFile.MediaInfo.AudioBitrate));
                    audio.Add(new XElement("channels", audioChannelCount));
                    audio.Add(new XElement("codec", MediaInfoFormatter.FormatAudioCodec(episodeFile.MediaInfo, sceneName)));
                    audio.Add(new XElement("language", episodeFile.MediaInfo.AudioLanguages));
                    streamDetails.Add(audio);

                    if (episodeFile.MediaInfo.Subtitles != null && episodeFile.MediaInfo.Subtitles.Count > 0)
                    {
                        foreach (var s in episodeFile.MediaInfo.Subtitles)
                        {
                            var subtitle = new XElement("subtitle");
                            subtitle.Add(new XElement("language", s));
                            streamDetails.Add(subtitle);
                        }
                    }

                    fileInfo.Add(streamDetails);
                    details.Add(fileInfo);
                }

                // Todo: get guest stars, writer and director
                // details.Add(new XElement("credits", tvdbEpisode.Writer.FirstOrDefault()));
                // details.Add(new XElement("director", tvdbEpisode.Directors.FirstOrDefault()));

                using var sw = new Utf8StringWriter();
                using var xw = XmlWriter.Create(sw, xws);

                doc.Add(details);
                doc.Save(xw);
                xw.Flush();

                xmlResult += sw.ToString();
                xmlResult += Environment.NewLine;
            }

            return new MetadataFileResult(GetEpisodeMetadataFilename(episodeFile.RelativePath), xmlResult.Trim(Environment.NewLine.ToCharArray()));
        }

        public override List<ImageFileResult> SeriesImages(Series series)
        {
            if (!Settings.SeriesImages)
            {
                return new List<ImageFileResult>();
            }

            return ProcessSeriesImages(series).ToList();
        }

        public override List<ImageFileResult> SeasonImages(Series series, Season season)
        {
            if (!Settings.SeasonImages)
            {
                return new List<ImageFileResult>();
            }

            return ProcessSeasonImages(series, season).ToList();
        }

        public override List<ImageFileResult> EpisodeImages(Series series, EpisodeFile episodeFile)
        {
            if (!Settings.EpisodeImages)
            {
                return new List<ImageFileResult>();
            }

            try
            {
                var firstEpisode = episodeFile.Episodes.Value.FirstOrDefault();

                if (firstEpisode == null)
                {
                    _logger.Debug("Episode file has no associated episodes, potentially a duplicate file");
                    return new List<ImageFileResult>();
                }

                var screenshot = firstEpisode.Images.SingleOrDefault(i => i.CoverType == MediaCoverTypes.Screenshot);

                if (screenshot == null)
                {
                    _logger.Debug("Episode screenshot not available");
                    return new List<ImageFileResult>();
                }

                return new List<ImageFileResult>
                   {
                       new ImageFileResult(GetEpisodeImageFilename(episodeFile.RelativePath), screenshot.RemoteUrl)
                   };
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Unable to process episode image for file: {0}", Path.Combine(series.Path, episodeFile.RelativePath));

                return new List<ImageFileResult>();
            }
        }

        private IEnumerable<ImageFileResult> ProcessSeriesImages(Series series)
        {
            foreach (var image in series.Images)
            {
                var source = _mediaCoverService.GetCoverPath(series.Id, image.CoverType);
                var destination = image.CoverType.ToString().ToLowerInvariant() + Path.GetExtension(source);

                yield return new ImageFileResult(destination, source);
            }
        }

        private IEnumerable<ImageFileResult> ProcessSeasonImages(Series series, Season season)
        {
            foreach (var image in season.Images)
            {
                var filename = string.Format("season{0:00}-{1}.jpg", season.SeasonNumber, image.CoverType.ToString().ToLower());

                if (season.SeasonNumber == 0)
                {
                    filename = string.Format("season-specials-{0}.jpg", image.CoverType.ToString().ToLower());
                }

                yield return new ImageFileResult(filename, image.RemoteUrl);
            }
        }

        private string GetEpisodeMetadataFilename(string episodeFilePath)
        {
            return Path.ChangeExtension(episodeFilePath, "nfo");
        }

        private string GetEpisodeImageFilename(string episodeFilePath)
        {
            return Path.ChangeExtension(episodeFilePath, "").Trim('.') + "-thumb.jpg";
        }

        private bool GetExistingWatchedStatus(Series series, string episodeFilePath)
        {
            var fullPath = Path.Combine(series.Path, GetEpisodeMetadataFilename(episodeFilePath));

            if (!_diskProvider.FileExists(fullPath))
            {
                return false;
            }

            var fileContent = _diskProvider.ReadAllText(fullPath);

            return Regex.IsMatch(fileContent, "<watched>true</watched>");
        }
    }
}
