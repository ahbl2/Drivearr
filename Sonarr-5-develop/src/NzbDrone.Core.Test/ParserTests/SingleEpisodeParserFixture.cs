using System.Linq;
using FluentAssertions;
using NUnit.Framework;
using NzbDrone.Core.Test.Framework;

namespace NzbDrone.Core.Test.ParserTests
{
    [TestFixture]
    public class SingleEpisodeParserFixture : CoreTest
    {
        [TestCase("Series.With.Title.S02E15", "Series With Title", 2, 15)]
        [TestCase("Series.and.a.Title.103.720p.HDTV.X264-DIMENSION", "Series and a Title", 1, 3)]
        [TestCase("Series.and.a.Title.113.720p.HDTV.X264-DIMENSION", "Series and a Title", 1, 13)]
        [TestCase("Series.and.a.Title.1013.720p.HDTV.X264-DIMENSION", "Series and a Title", 10, 13)]
        [TestCase("Series.Title.4x05.HDTV.XviD-LOL", "Series Title", 4, 5)]
        [TestCase("Series.Title.S03E06.DVDRip.XviD-WiDE", "Series Title", 3, 6)]
        [TestCase("Series.Title.S10E27.WS.DSR.XviD-2HD", "Series Title", 10, 27)]
        [TestCase("Series.Title.2010.S02E14.HDTV.XviD-LOL", "Series Title 2010", 2, 14)]
        [TestCase("Series Title 0 S01E19 720p WEB DL DD5 1 H 264 NT", "Series Title 0", 1, 19)]
        [TestCase("The Series Title S01E14 A Message Back 720p WEB DL DD5 1 H264 SURFER", "The Series Title", 1, 14)]
        [TestCase("Series Title S01E07 WS PDTV XviD FUtV", "Series Title", 1, 7)]
        [TestCase("Series.Title.S03E19.DVDRip.XviD-OSiTV", "Series Title", 3, 19)]
        [TestCase("S03E09 WS PDTV XviD FUtV", "", 3, 9)]
        [TestCase("5x10 WS PDTV XviD FUtV", "", 5, 10)]
        [TestCase("Series.Title.2009.S01E14.HDTV.XviD-LOL", "Series Title 2009", 1, 14)]
        [TestCase("Series.Title.1995.S03E20.HDTV.XviD-LOL", "Series Title 1995", 3, 20)]
        [TestCase("Series.Title.S03E115.DVDRip.XviD-OSiTV", "Series Title", 3, 115)]
        [TestCase(@"Series Title - S02E21 - 94 Meetings - 720p TV.mkv", "Series Title", 2, 21)]
        [TestCase(@"24-7 Series - Title - Road to the Sonarr - S01E03 - Episode 3.mkv", "24-7 Series - Title - Road to the Sonarr", 1, 3)]
        [TestCase("Series.Title.Inc.S03E19.DVDRip.\"XviD\"-OSiTV", "Series Title Inc", 3, 19)]
        [TestCase("Series Title-0 (2010) - 1x05 - Missing Title", "Series Title-0 (2010)", 1, 5)]
        [TestCase("Series Title-0 (2010) - 1x05 - Title", "Series Title-0 (2010)", 1, 5)]
        [TestCase("Series Title - S06E13 - 5 to 9 [DVD]", "Series Title", 6, 13)]
        [TestCase("Series Title - S02E21 - 18-5-4", "Series Title", 2, 21)]
        [TestCase("Series.Title.S01E07.21.0.Jump.Street.720p.WEB-DL.DD5.1.h.264-KiNGS", "Series Title", 1, 7)]
        [TestCase("Series.Title.525", "Series Title", 5, 25)]
        [TestCase("Series Title - 10x12 - 24 Hour Propane People [SDTV]", "Series Title", 10, 12)]
        [TestCase("Series Title S01E06 3 Beers For Batali DVDRip XviD SPRiNTER", "Series Title", 1, 6)]
        [TestCase("24 7 Series-Title - Road to the Sonarr Part01 720p HDTV x264 ORENJI", "24 7 Series-Title - Road to the Sonarr", 1, 1)]
        [TestCase("24 7 Series-Title - Road to the Sonarr Part 02 720p HDTV x264 ORENJI", "24 7 Series-Title - Road to the Sonarr", 1, 2)]
        [TestCase("24-7 Series-Title - Road to the Sonarr - S01E01 - Part 1", "24-7 Series-Title - Road to the Sonarr", 1, 1)]
        [TestCase("S6E02-Unwrapped-(Playing With Food) - [DarkData]", "", 6, 2)]
        [TestCase("S06E03-Unwrapped-(Number Ones Unwrapped) - [DarkData]", "", 6, 3)]
        [TestCase("Series Title S02E21 18 5 4 720p WEB DL DD5 1 h 264 EbP", "Series Title", 2, 21)]
        [TestCase("01x04 - Halloween, Part 1 - 720p WEB-DL", "", 1, 4)]
        [TestCase("series.s03.e05.ws.dvdrip.xvid-m00tv", "series", 3, 5)]
        [TestCase("series.2009.416.hdtv-lol", "series 2009", 4, 16)]
        [TestCase("series.six-0.2010.217.hdtv-lol", "series six-0 2010", 2, 17)]
        [TestCase("Series Title - S1936E18 - I Love to Singa", "Series Title", 1936, 18)]
        [TestCase("Series_Title!_-_7x6_-_The_Scarlett_Getter_[SDTV]", "Series Title!", 7, 6)]
        [TestCase("Series_Title_-_1x1_-_Live_and_Learn_[HDTV-720p]", "Series Title", 1, 1)]
        [TestCase("Top Series - 07x03 - 2005.11.70", "Top Series", 7, 3)]
        [TestCase("Series.S04E09.Swan.Song.1080p.WEB-DL.DD5.1.H.264-ECI", "Series", 4, 9)]
        [TestCase("S08E20 50-50 Carla [DVD]", "", 8, 20)]
        [TestCase("Series S08E20 50-50 Carla [DVD]", "Series", 8, 20)]
        [TestCase("S02E10 6-50 to SLC [SDTV]", "", 2, 10)]
        [TestCase("Developers & Coders S02E10 6-50 to SLC [SDTV]", "Developers & Coders", 2, 10)]
        [TestCase("The_Big_Series_Title_-_6x12_-_The_Code_Review_Equivalency_[HDTV-720p]", "The Big Series Title", 6, 12)]
        [TestCase("Series_Title.19x06.720p_HDTV_x264-FoV", "Series Title", 19, 6)]
        [TestCase("Series.S03E10.Alexandra.720p.WEB-DL.AAC2.0.H.264-CROM.mkv", "Series", 3, 10)]
        [TestCase("(Series of Title s03 e - \"Series of Title Season 3 Episode 10\"", "Series of Title", 3, 10)]
        [TestCase("Series.Hunters.Galatic.S05E607.720p.hdtv.x264", "Series Hunters Galatic", 5, 607)]
        [TestCase("Series.Time.With.Dev1.And.Dev2.S01E20.720p.BluRay.x264-DEiMOS", "Series Time With Dev1 And Dev2", 1, 20)]
        [TestCase("Series.S01E04.2-45.PM.[HDTV-720p].mkv", "Series", 1, 4)]
        [TestCase("S01E04", "", 1, 4)]
        [TestCase("1x04", "", 1, 4)]
        [TestCase("10.Lines.You.Know.About.Code.S02E04.Prohibition.HDTV.XviD-AFG", "10 Lines You Know About Code", 2, 4)]
        [TestCase("30 Series - S01E01 - Pilot.avi", "30 Series", 1, 1)]
        [TestCase("666 Series Title - S01E01", "666 Series Title", 1, 1)]
        [TestCase("Series 13 - S01E01", "Series 13", 1, 1)]
        [TestCase("Don't Ever Trust The B---- in Code 23.S01E01", "Don't Ever Trust The B---- in Code 23", 1, 1)]
        [TestCase("Warehouse.13.S01E01", "Warehouse 13", 1, 1)]
        [TestCase("Never.Trust.The.B----.in.Code.23.S01E01", "Never Trust The B---- in Code 23", 1, 1)]
        [TestCase("42 S01E01", "42", 1, 1)]
        [TestCase("69.S01E01", "69", 1, 1)]
        [TestCase("Series - 2x12 - The Choice [HDTV-1080p].mkv", "Series", 2, 12)]
        [TestCase("Series - 2x4 - New Car Smell [HDTV-1080p].mkv", "Series", 2, 4)]
        [TestCase("Top Series - 06x11 - 2005.08.07", "Top Series", 6, 11)]
        [TestCase("The_Series_US_s06e19_04.28.2014_hdtv.x264.Poke.mp4", "The Series US", 6, 19)]
        [TestCase("the.Series.110.hdtv-lol", "the Series", 1, 10)]
        [TestCase("2009x09 [SDTV].avi", "", 2009, 9)]
        [TestCase("S2009E09 [SDTV].avi", "", 2009, 9)]
        [TestCase("Series Week S2009E09 [SDTV].avi", "Series Week", 2009, 9)]
        [TestCase("St_Series_209_Aids_And_Comfort", "St Series", 2, 9)]
        [TestCase("[Impatience] Series - 0x01 [720p][34073169].mkv", "Series", 0, 1)]
        [TestCase("Series.Title.S15.E06.City.Sushi", "Series Title", 15, 6)]
        [TestCase("Series Title - S15 E06 - City Code", "Series Title", 15, 6)]
        [TestCase("Series S1-E1-WEB-DL-1080p-NZBgeek", "Series", 1, 1)]
        [TestCase("Series S1E1-WEB-DL-1080p-NZBgeek", "Series", 1, 1)]
        [TestCase("Series.S010E16.720p.HDTV.X264-DIMENSION", "Series", 10, 16)]
        [TestCase("[ www.Torrenting.com ] - Series.2012.S02E17.720p.HDTV.X264-DIMENSION", "Series 2012", 2, 17)]
        [TestCase("Series.2012.S02E18.720p.HDTV.X264-DIMENSION.mkv", "Series 2012", 2, 18)]
        [TestCase("Series - Season 1 - Episode 01 (Resolution).avi", "Series", 1, 1)]
        [TestCase("5x09 - 100 [720p WEB-DL].mkv", "", 5, 9)]
        [TestCase("1x03 - 274 [1080p BluRay].mkv", "", 1, 3)]
        [TestCase("1x03 - The 112th Congress [1080p BluRay].mkv", "", 1, 3)]
        [TestCase("Series.2012.S02E14.720p.HDTV.X264-DIMENSION [PublicHD].mkv", "Series 2012", 2, 14)]

        // [TestCase("Sex And The City S6E15 - Catch-38 [RavyDavy].avi", "Sex And The City", 6, 15)] // -38 is getting treated as abs number
        [TestCase("Series.2009.S06E03.720p.HDTV.X264-DIMENSION [PublicHD].mkv", "Series 2009", 6, 3)]
        [TestCase("20-1.2014.S02E01.720p.HDTV.x264-CROOKS", "20-1 2014", 2, 1)]
        [TestCase("Series - S01E09 - Debate 109", "Series", 1, 9)]
        [TestCase("Series - S02E02 - My Maserati Does 185", "Series", 2, 2)]
        [TestCase("6x13 - The Series Show 100th Episode Special", "", 6, 13)]

        // [TestCase("Series - S01E01 - Genesis 101 [HDTV-720p]", "Series", 1, 1)]
        // [TestCase("The Series S02E01 HDTV x264-KILLERS [eztv]", "The Series", 2, 1)]
        [TestCase("The Series And the Show - S41 E10478 - 2014-08-15", "The Series And the Show", 41, 10478)]
        [TestCase("The Series And the Show - S42 E10591 - 2015-01-27", "The Series And the Show", 42, 10591)]
        [TestCase("Series Title [1x05] Episode Title", "Series Title", 1, 5)]
        [TestCase("Series Title [S01E05] Episode Title", "Series Title", 1, 5)]
        [TestCase("Series Title Season 01 Episode 05 720p", "Series Title", 1, 5)]

        // [TestCase("Off the Series - 101 - Developers (460p.x264.vorbis-2.0) [449].mkv", "Off the Series", 1, 1)]
        [TestCase("The Series And the Show - S42 E10713 - 2015-07-20.mp4", "The Series And the Show", 42, 10713)]
        [TestCase("Series.103.hdtv-lol[ettv].mp4", "Series", 1, 3)]
        [TestCase("Series - 01x02 - The Rooster Prince - [itz_theo]", "Series", 1, 2)]
        [TestCase("Series (2009) - [06x16] - Room 147.mp4", "Series (2009)", 6, 16)]
        [TestCase("grp-zoos01e11-1080p", "grp-zoo", 1, 11)]
        [TestCase("grp-zoo-s01e11-1080p", "grp-zoo", 1, 11)]
        [TestCase("Series!.S2016E14.2016-01-20.avi", "Series!", 2016, 14)]
        [TestCase("John.Smith.The.Series.Title.5of9.The.Universe.Of.Development.1990.DVDRip.x264-HANDJOB", "John Smith The Series Title", 1, 5)]
        [TestCase("Judge Developer 2016 02 25 S20E142", "Judge Developer", 20, 142)]
        [TestCase("Judge Developer 2016 02 25 S20E143", "Judge Developer", 20, 143)]
        [TestCase("Red Show - S02 - E06 - Parallel Series", "Red Show", 2, 6)]
        [TestCase("App.Sonarr.Made.in.Canada.Part.Two.720p.HDTV.x264-2HD", "App Sonarr Made in Canada", 1, 2)]
        [TestCase("The.100000.Series.Title.2016.S01E05.720p.HDTV.x264-W4F", "The 100000 Series Title 2016", 1, 5)]
        [TestCase("Series S01E02 (22 October 2016) HDTV 720p [Webrip]", "Series", 1, 2)]
        [TestCase("this.is.a.show.2015.0308-yestv", "this is a show 2015", 3, 8)]
        [TestCase("Series - S2016E231", "Series", 2016, 231)]
        [TestCase("Series - 2016x231", "Series", 2016, 231)]
        [TestCase("Short.Series.S26E022.HDTV.x264-FiHTV", "Short Series", 26, 22)]
        [TestCase("Super.Series.S01.Ep06.1080p.BluRay.DTS.x264-MiR", "Super Series", 1, 6)]
        [TestCase("Series 104 - S01E07 The Developers [SDTV]", "Series 104", 1, 7)]
        [TestCase("11-02 The Series Reaction (HD).m4v", "", 11, 2)]
        [TestCase("Plus Series la title - S14E3533 FRENCH WEBRIP H.264 AAC (09.05.2018)", "Plus Series la title", 14, 3533)]
        [TestCase("The Series - S01E02 - Earth Skills HDTV-1080p AVC DTS [EN+FR+ES+PT+DA+FI+NB+SV]", "The Series", 1, 2)]
        [TestCase("Series Title - S01E01 - Day 100 [SDTV]", "Series Title", 1, 1)]
        [TestCase("Series.Title.S01.Ep.01.English.AC3.DL.1080p.BluRay-Sonarr", "Series Title", 1, 1)]
        [TestCase("Series.Title.S01.E.01.English.AC3.DL.1080p.BluRay-Sonarr", "Series Title", 1, 1)]
        [TestCase("Series.Title.S01.Ep01.English.AC3.DL.1080p.BluRay-Sonarr", "Series Title", 1, 1)]
        [TestCase("Series.Title.S01.E01.English.AC3.DL.1080p.BluRay-Sonarr", "Series Title", 1, 1)]
        [TestCase("Series.Title.S01EP01.English.AC3.DL.1080p.BluRay-Sonarr", "Series Title", 1, 1)]
        [TestCase("tvs-amgo-dd51-dl-7p-azhd-x264-103", "tvs-amgo-dd51-dl-7p-azhd", 1, 3)]
        [TestCase("Series Title - S01E01 [AC3 5.1 Castellano][www.descargas2020.org]", "Series Title", 1, 1)]
        [TestCase("Series Title - [02x01] - Episode 1", "Series Title", 2, 1)]
        [TestCase("Series.Title.Of.S01E01.xyz", "Series Title Of", 1, 1)]
        [TestCase("[RlsGrp] Series Title - S01E27 - 24-Hour", "Series Title", 1, 27)]
        [TestCase("Series Title - S02E01 1920x910", "Series Title", 2, 1)]
        [TestCase("Anime Title - S2020E1527 [1527] [2020-10-11] - Episode Title", "Anime Title", 2020, 1527)]
        [TestCase("Anime Title - S2010E994 [0994] [2010-02-28] - Episode Title [x264 720p][AAC 2ch][HS][Shion+GakiDave]", "Anime Title", 2010, 994)]
        [TestCase("Series Title - Temporada 2 [HDTV 720p][Cap.201][AC3 5.1 Castellano][www.pctnew.com]", "Series Title", 2, 1)]
        [TestCase("Series Title - Temporada 2 [HDTV 720p][Cap.1901][AC3 5.1 Castellano][www.pctnew.com]", "Series Title", 19, 1)]
        [TestCase("Series Title 1x1", "Series Title", 1, 1)]
        [TestCase("1x1", "", 1, 1)]
        [TestCase("Series Title [2022] [S25E13] [PL] [720p] [WEB-DL-CZRG] [x264] ", "Series Title [2022]", 25, 13)]
        [TestCase("Series T Se.3 afl.3", "Series T", 3, 3)]
        [TestCase("[Anime Chap] Anime Title! S01E09 [WEB 1080p] {OP & ED Lyrics} - Episode 9 (The Eminence in Shadow)", "Anime Title!", 1, 9)]
        [TestCase("[Anime Chap] Anime Title! S01E12 [WEB 1080p] {OP & ED Lyrics} - Episode 12 (The Eminence in Shadow)", "Anime Title!", 1, 12)]
        [TestCase("SeriesTitle-S16E08-10426008-0.mkv", "SeriesTitle", 16, 8)]
        [TestCase("Series-S07E12-31st_Century_Fox-[Bluray-1080p].mkv", "Series", 7, 12)]
        [TestCase("TheTitle-S12E13-3_Acts_of_God.mkv", "TheTitle", 12, 13)]
        [TestCase("Series Title - Temporada 2 [HDTV 720p][Cap.408]", "Series Title", 4, 8)]
        [TestCase("Series Title [HDTV][Cap.104](website.com).avi", "Series Title", 1, 4)]
        [TestCase("Series Title [HDTV][Cap.402](website.com).avi", "Series Title", 4, 2)]
        [TestCase("Series Title [HDTV 720p][Cap.101](website.com).mkv", "Series Title", 1, 1)]
        [TestCase("Босх: Спадок (S2E1) / Series: Legacy (S2E1) (2023) WEB-DL 1080p Ukr/Eng | sub Eng", "Series: Legacy", 2, 1)]
        [TestCase("Босх: Спадок / Series: Legacy / S2E1 of 10 (2023) WEB-DL 1080p Ukr/Eng | sub Eng", "Series: Legacy", 2, 1)]
        [TestCase("Titles.s06e01.1999.BDRip.1080p.Ukr.Eng.AC3.Hurtom.TNU.Tenax555", "Titles", 6, 1)]
        [TestCase("Titles.s06.01.1999.BDRip.1080p.Ukr.Eng.AC3.Hurtom.TNU.Tenax555", "Titles", 6, 1)]
        [TestCase("[Judas] Series Title (2024) - S01E14", "Series Title (2024)", 1, 14)]
        [TestCase("[ReleaseGroup] SeriesTitle S01E1 Webdl 1080p", "SeriesTitle", 1, 1)]
        [TestCase("[SubsPlus+] Series no Chill - S02E01 (NF WEB 1080p AVC AAC)", "Series no Chill", 2, 1)]
        [TestCase("[SubsPlus+] Series no Chill - S02E01v2 (NF WEB 1080p AVC AAC)", "Series no Chill", 2, 1)]
        [TestCase("Series - Temporada 1 - [HDTV 1080p][Cap.101](wolfmax4k.com)", "Series", 1, 1)]
        [TestCase("Series [HDTV 1080p][Cap.101](wolfmax4k.com)", "Series", 1, 1)]
        [TestCase("Series [HDTV 1080p][Cap. 101](wolfmax4k.com).mkv", "Series", 1, 1)]
        [TestCase("Amazing Title (2024/S01E07/DSNP/WEB-DL/1080p/ESP/EAC3 5.1/ING/EAC3 5.1 Atmos/SUBS) SPWEB", "Amazing Title (2024)", 1, 7)]
        [TestCase("Mini Title (Miniserie) (2024/S01E07/DSNP/WEB-DL/1080p/ESP/EAC3 5.1/ING/EAC3 5.1 Atmos/SUBS) SPWEB", "Mini Title (2024)", 1, 7)]
        [TestCase("Series.S006E18.Some.Title.Name-Part.1.1080p.WEB-DL.AAC2.0.H.264-Release", "Series", 6, 18)]
        [TestCase("Series.2006.S006E18.Some.Title.Name-Part.1.1080p.WEB-DL.AAC2.0.H.264-Release", "Series 2006", 6, 18)]

        // [TestCase("", "", 0, 0)]
        public void should_parse_single_episode(string postTitle, string title, int seasonNumber, int episodeNumber)
        {
            var result = Parser.Parser.ParseTitle(postTitle);
            result.Should().NotBeNull();
            result.EpisodeNumbers.Should().HaveCount(1);
            result.SeasonNumber.Should().Be(seasonNumber);
            result.EpisodeNumbers.First().Should().Be(episodeNumber);
            result.SeriesTitle.Should().Be(title);
            result.AbsoluteEpisodeNumbers.Should().BeEmpty();
            result.FullSeason.Should().BeFalse();
        }

        [TestCase("221208 ABC123 Series Title Season 39 ep11.mp4", "ABC123 Series Title", 39, 11)]
        [TestCase("221208 ABC123 Series Title ep34[1080p60 H264].mp4", "ABC123 Series Title", 1, 34)]
        [TestCase("221205 ABC123 17研究所！ #17.ts", "ABC123 17研究所！", 1, 17)]
        [TestCase("221201 Series Title! ABC123 ep219[720p.h264].mp4", "Series Title! ABC123", 1, 219)]
        [TestCase("221206 Series Title! ep08(Tanaka Miku).ts", "Series Title!", 1, 8)]
        [TestCase("210810 ABC123 Series Title ep05.mp4", "ABC123 Series Title", 1, 5)]
        [TestCase("221204 乃木坂工事中 ep389.mp4", "乃木坂工事中", 1, 389)]
        public void should_parse_japanese_variety_show_format(string postTitle, string title, int seasonNumber, int episodeNumber)
        {
            var result = Parser.Parser.ParseTitle(postTitle);
            result.Should().NotBeNull();
            result.EpisodeNumbers.Should().HaveCount(1);
            result.SeasonNumber.Should().Be(seasonNumber);
            result.EpisodeNumbers.First().Should().Be(episodeNumber);
            result.SeriesTitle.Should().Be(title);
            result.AbsoluteEpisodeNumbers.Should().BeEmpty();
            result.FullSeason.Should().BeFalse();
        }

        [TestCase("Series Title S01E11.5 [SP]-The Poppies Bloom Red on the Battlefield", "Series Title", 1, 11)]
        public void should_parse_decimal_number_as_special(string postTitle, string title, int seasonNumber, int episodeNumber)
        {
            var result = Parser.Parser.ParseTitle(postTitle);
            result.Should().NotBeNull();
            result.EpisodeNumbers.Should().HaveCount(1);
            result.SeasonNumber.Should().Be(seasonNumber);
            result.EpisodeNumbers.First().Should().Be(episodeNumber);
            result.SeriesTitle.Should().Be(title);
            result.AbsoluteEpisodeNumbers.Should().BeEmpty();
            result.FullSeason.Should().BeFalse();
            result.Special.Should().BeTrue();
        }

        [TestCase("Series.Title.S06E01b.Fade.Out.Fade.in.Part.2.1080p.DSNP.WEB-DL.AAC2.0.H.264-FLUX", "Series Title", 6, 1)]
        public void should_parse_split_episode(string postTitle, string title, int seasonNumber, int episodeNumber)
        {
            var result = Parser.Parser.ParseTitle(postTitle);
            result.Should().NotBeNull();
            result.EpisodeNumbers.Should().HaveCount(1);
            result.SeasonNumber.Should().Be(seasonNumber);
            result.EpisodeNumbers.First().Should().Be(episodeNumber);
            result.SeriesTitle.Should().Be(title);
            result.AbsoluteEpisodeNumbers.Should().BeEmpty();
            result.FullSeason.Should().BeFalse();
            result.IsSplitEpisode.Should().BeTrue();
        }
    }
}
