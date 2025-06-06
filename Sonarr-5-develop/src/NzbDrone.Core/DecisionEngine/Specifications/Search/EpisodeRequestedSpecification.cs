﻿using System.Linq;
using NLog;
using NzbDrone.Core.Parser.Model;

namespace NzbDrone.Core.DecisionEngine.Specifications.Search
{
    public class EpisodeRequestedSpecification : IDownloadDecisionEngineSpecification
    {
        private readonly Logger _logger;

        public EpisodeRequestedSpecification(Logger logger)
        {
            _logger = logger;
        }

        public SpecificationPriority Priority => SpecificationPriority.Default;
        public RejectionType Type => RejectionType.Permanent;

        public DownloadSpecDecision IsSatisfiedBy(RemoteEpisode remoteEpisode, ReleaseDecisionInformation information)
        {
            if (information.SearchCriteria == null)
            {
                return DownloadSpecDecision.Accept();
            }

            var criteriaEpisodes = information.SearchCriteria.Episodes.Select(v => v.Id).ToList();
            var remoteEpisodes = remoteEpisode.Episodes.Select(v => v.Id).ToList();

            if (!criteriaEpisodes.Intersect(remoteEpisodes).Any())
            {
                _logger.Debug("Release rejected since the episode wasn't requested: {0}", remoteEpisode.ParsedEpisodeInfo);

                if (remoteEpisodes.Any())
                {
                    var episodes = remoteEpisode.Episodes.OrderBy(v => v.SeasonNumber).ThenBy(v => v.EpisodeNumber).ToList();

                    if (episodes.Count > 1)
                    {
                        return DownloadSpecDecision.Reject(DownloadRejectionReason.WrongEpisode, $"Episode wasn't requested: {episodes.First().SeasonNumber}x{episodes.First().EpisodeNumber}-{episodes.Last().EpisodeNumber}");
                    }
                    else
                    {
                        return DownloadSpecDecision.Reject(DownloadRejectionReason.WrongEpisode, $"Episode wasn't requested: {episodes.First().SeasonNumber}x{episodes.First().EpisodeNumber}");
                    }
                }
                else
                {
                    return DownloadSpecDecision.Reject(DownloadRejectionReason.WrongEpisode, "Episode wasn't requested");
                }
            }

            return DownloadSpecDecision.Accept();
        }
    }
}
