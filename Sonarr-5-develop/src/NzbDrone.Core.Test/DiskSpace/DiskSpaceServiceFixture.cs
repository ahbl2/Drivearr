using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using Moq;
using NUnit.Framework;
using NzbDrone.Common.Disk;
using NzbDrone.Core.DiskSpace;
using NzbDrone.Core.RootFolders;
using NzbDrone.Core.Test.Framework;
using NzbDrone.Core.Tv;
using NzbDrone.Test.Common;

namespace NzbDrone.Core.Test.DiskSpace
{
    [TestFixture]
    public class DiskSpaceServiceFixture : CoreTest<DiskSpaceService>
    {
        private string _seriesFolder;
        private string _seriesFolder2;
        private string _rootFolder;

        [SetUp]
        public void SetUp()
        {
            _seriesFolder = @"G:\fasdlfsdf\series".AsOsAgnostic();
            _seriesFolder2 = @"G:\fasdlfsdf\series2".AsOsAgnostic();
            _rootFolder = @"G:\fasdlfsdf".AsOsAgnostic();

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.GetMounts())
                  .Returns(new List<IMount>());

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.GetPathRoot(It.IsAny<string>()))
                  .Returns(@"G:\".AsOsAgnostic());

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.GetAvailableSpace(It.IsAny<string>()))
                  .Returns(0);

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.GetTotalSize(It.IsAny<string>()))
                  .Returns(0);

            GivenSeries();
        }

        private void GivenSeries(params string[] seriesPaths)
        {
            Mocker.GetMock<ISeriesService>()
                .Setup(v => v.GetAllSeriesPaths())
                .Returns(new Dictionary<int, string>(seriesPaths.Select((value, i) => new KeyValuePair<int, string>(i, value))));
        }

        private void GivenRootFolder(string seriesPath, string rootFolderPath)
        {
            Mocker.GetMock<IRootFolderService>()
                .Setup(v => v.GetBestRootFolderPath(seriesPath))
                .Returns(rootFolderPath);
        }

        private void GivenExistingFolder(string folder)
        {
            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.FolderExists(folder))
                  .Returns(true);
        }

        [Test]
        public void should_check_diskspace_for_series_folders()
        {
            GivenSeries(_seriesFolder);
            GivenRootFolder(_seriesFolder, _rootFolder);
            GivenExistingFolder(_rootFolder);

            var freeSpace = Subject.GetFreeSpace();

            freeSpace.Should().NotBeEmpty();
        }

        [Test]
        public void should_check_diskspace_for_same_root_folder_only_once()
        {
            GivenSeries(_seriesFolder, _seriesFolder2);
            GivenRootFolder(_seriesFolder, _rootFolder);
            GivenRootFolder(_seriesFolder2, _rootFolder);
            GivenExistingFolder(_rootFolder);

            var freeSpace = Subject.GetFreeSpace();

            freeSpace.Should().HaveCount(1);

            Mocker.GetMock<IDiskProvider>()
                  .Verify(v => v.GetAvailableSpace(It.IsAny<string>()), Times.Once());
        }

        [Test]
        public void should_not_check_diskspace_for_missing_series_root_folders()
        {
            GivenSeries(_seriesFolder);
            GivenRootFolder(_seriesFolder, _rootFolder);

            var freeSpace = Subject.GetFreeSpace();

            freeSpace.Should().BeEmpty();

            Mocker.GetMock<IDiskProvider>()
                  .Verify(v => v.GetAvailableSpace(It.IsAny<string>()), Times.Never());
        }

        [TestCase("/boot")]
        [TestCase("/var/lib/rancher")]
        [TestCase("/var/lib/rancher/volumes")]
        [TestCase("/var/lib/kubelet")]
        [TestCase("/var/lib/docker")]
        [TestCase("/some/place/docker/aufs")]
        [TestCase("/etc/network")]
        [TestCase("/Volumes/.timemachine/ABC123456-A1BC-12A3B45678C9/2025-05-13-181401.backup")]
        public void should_not_check_diskspace_for_irrelevant_mounts(string path)
        {
            var mount = new Mock<IMount>();
            mount.SetupGet(v => v.RootDirectory).Returns(path);
            mount.SetupGet(v => v.DriveType).Returns(System.IO.DriveType.Fixed);

            Mocker.GetMock<IDiskProvider>()
                  .Setup(v => v.GetMounts())
                  .Returns(new List<IMount> { mount.Object });

            var freeSpace = Subject.GetFreeSpace();

            freeSpace.Should().BeEmpty();
        }
    }
}
