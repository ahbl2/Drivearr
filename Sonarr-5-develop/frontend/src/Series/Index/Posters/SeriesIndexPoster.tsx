import classNames from 'classnames';
import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { REFRESH_SERIES, SERIES_SEARCH } from 'Commands/commandNames';
import Label from 'Components/Label';
import IconButton from 'Components/Link/IconButton';
import Link from 'Components/Link/Link';
import SpinnerIconButton from 'Components/Link/SpinnerIconButton';
import SeriesTagList from 'Components/SeriesTagList';
import { icons } from 'Helpers/Props';
import DeleteSeriesModal from 'Series/Delete/DeleteSeriesModal';
import EditSeriesModal from 'Series/Edit/EditSeriesModal';
import SeriesIndexProgressBar from 'Series/Index/ProgressBar/SeriesIndexProgressBar';
import SeriesIndexPosterSelect from 'Series/Index/Select/SeriesIndexPosterSelect';
import { Statistics } from 'Series/Series';
import SeriesPoster from 'Series/SeriesPoster';
import { executeCommand } from 'Store/Actions/commandActions';
import createUISettingsSelector from 'Store/Selectors/createUISettingsSelector';
import formatDateTime from 'Utilities/Date/formatDateTime';
import getRelativeDate from 'Utilities/Date/getRelativeDate';
import translate from 'Utilities/String/translate';
import createSeriesIndexItemSelector from '../createSeriesIndexItemSelector';
import selectPosterOptions from './selectPosterOptions';
import SeriesIndexPosterInfo from './SeriesIndexPosterInfo';
import styles from './SeriesIndexPoster.css';

interface SeriesIndexPosterProps {
  seriesId: number;
  sortKey: string;
  isSelectMode: boolean;
  posterWidth: number;
  posterHeight: number;
}

function SeriesIndexPoster(props: SeriesIndexPosterProps) {
  const { seriesId, sortKey, isSelectMode, posterWidth, posterHeight } = props;

  const { series, qualityProfile, isRefreshingSeries, isSearchingSeries } =
    useSelector(createSeriesIndexItemSelector(props.seriesId));

  const {
    detailedProgressBar,
    showTitle,
    showMonitored,
    showQualityProfile,
    showTags,
    showSearchAction,
  } = useSelector(selectPosterOptions);

  const { showRelativeDates, shortDateFormat, longDateFormat, timeFormat } =
    useSelector(createUISettingsSelector());

  const {
    title,
    monitored,
    status,
    path,
    titleSlug,
    originalLanguage,
    network,
    nextAiring,
    previousAiring,
    added,
    statistics = {} as Statistics,
    images,
    tags,
  } = series;

  const {
    seasonCount = 0,
    episodeCount = 0,
    episodeFileCount = 0,
    totalEpisodeCount = 0,
    sizeOnDisk = 0,
  } = statistics;

  const dispatch = useDispatch();
  const [hasPosterError, setHasPosterError] = useState(false);
  const [isEditSeriesModalOpen, setIsEditSeriesModalOpen] = useState(false);
  const [isDeleteSeriesModalOpen, setIsDeleteSeriesModalOpen] = useState(false);

  const onRefreshPress = useCallback(() => {
    dispatch(
      executeCommand({
        name: REFRESH_SERIES,
        seriesIds: [seriesId],
      })
    );
  }, [seriesId, dispatch]);

  const onSearchPress = useCallback(() => {
    dispatch(
      executeCommand({
        name: SERIES_SEARCH,
        seriesId,
      })
    );
  }, [seriesId, dispatch]);

  const onPosterLoadError = useCallback(() => {
    setHasPosterError(true);
  }, [setHasPosterError]);

  const onPosterLoad = useCallback(() => {
    setHasPosterError(false);
  }, [setHasPosterError]);

  const onEditSeriesPress = useCallback(() => {
    setIsEditSeriesModalOpen(true);
  }, [setIsEditSeriesModalOpen]);

  const onEditSeriesModalClose = useCallback(() => {
    setIsEditSeriesModalOpen(false);
  }, [setIsEditSeriesModalOpen]);

  const onDeleteSeriesPress = useCallback(() => {
    setIsEditSeriesModalOpen(false);
    setIsDeleteSeriesModalOpen(true);
  }, [setIsDeleteSeriesModalOpen]);

  const onDeleteSeriesModalClose = useCallback(() => {
    setIsDeleteSeriesModalOpen(false);
  }, [setIsDeleteSeriesModalOpen]);

  const link = `/series/${titleSlug}`;

  const elementStyle = {
    width: `${posterWidth}px`,
    height: `${posterHeight}px`,
  };

  return (
    <div className={styles.content}>
      <div className={styles.posterContainer} title={title}>
        {isSelectMode ? <SeriesIndexPosterSelect seriesId={seriesId} /> : null}

        <Label className={styles.controls}>
          <SpinnerIconButton
            className={styles.action}
            name={icons.REFRESH}
            title={translate('RefreshSeries')}
            isSpinning={isRefreshingSeries}
            onPress={onRefreshPress}
          />

          {showSearchAction ? (
            <SpinnerIconButton
              className={styles.action}
              name={icons.SEARCH}
              title={translate('SearchForMonitoredEpisodes')}
              isSpinning={isSearchingSeries}
              onPress={onSearchPress}
            />
          ) : null}

          <IconButton
            className={styles.action}
            name={icons.EDIT}
            title={translate('EditSeries')}
            onPress={onEditSeriesPress}
          />
        </Label>

        {status === 'ended' ? (
          <div
            className={classNames(styles.status, styles.ended)}
            title={translate('Ended')}
          />
        ) : null}

        {status === 'deleted' ? (
          <div
            className={classNames(styles.status, styles.deleted)}
            title={translate('Deleted')}
          />
        ) : null}

        <Link className={styles.link} style={elementStyle} to={link}>
          <SeriesPoster
            style={elementStyle}
            images={images}
            size={250}
            lazy={false}
            overflow={true}
            onError={onPosterLoadError}
            onLoad={onPosterLoad}
          />

          {hasPosterError ? (
            <div className={styles.overlayTitle}>{title}</div>
          ) : null}
        </Link>
      </div>

      <SeriesIndexProgressBar
        seriesId={seriesId}
        monitored={monitored}
        status={status}
        episodeCount={episodeCount}
        episodeFileCount={episodeFileCount}
        totalEpisodeCount={totalEpisodeCount}
        width={posterWidth}
        detailedProgressBar={detailedProgressBar}
        isStandalone={false}
      />

      {showTitle ? (
        <div className={styles.title} title={title}>
          {title}
        </div>
      ) : null}

      {showMonitored ? (
        <div className={styles.title}>
          {monitored ? translate('Monitored') : translate('Unmonitored')}
        </div>
      ) : null}

      {showQualityProfile && !!qualityProfile?.name ? (
        <div className={styles.title} title={translate('QualityProfile')}>
          {qualityProfile.name}
        </div>
      ) : null}

      {nextAiring ? (
        <div
          className={styles.nextAiring}
          title={`${translate('NextAiring')}: ${formatDateTime(
            nextAiring,
            longDateFormat,
            timeFormat
          )}`}
        >
          {getRelativeDate({
            date: nextAiring,
            shortDateFormat,
            showRelativeDates,
            timeFormat,
            timeForToday: true,
          })}
        </div>
      ) : null}

      {showTags && tags.length ? (
        <div className={styles.tags}>
          <div className={styles.tagsList}>
            <SeriesTagList tags={tags} />
          </div>
        </div>
      ) : null}

      <SeriesIndexPosterInfo
        originalLanguage={originalLanguage}
        network={network}
        previousAiring={previousAiring}
        added={added}
        seasonCount={seasonCount}
        sizeOnDisk={sizeOnDisk}
        path={path}
        qualityProfile={qualityProfile}
        showQualityProfile={showQualityProfile}
        showRelativeDates={showRelativeDates}
        sortKey={sortKey}
        shortDateFormat={shortDateFormat}
        longDateFormat={longDateFormat}
        timeFormat={timeFormat}
        tags={tags}
        showTags={showTags}
      />

      <EditSeriesModal
        isOpen={isEditSeriesModalOpen}
        seriesId={seriesId}
        onModalClose={onEditSeriesModalClose}
        onDeleteSeriesPress={onDeleteSeriesPress}
      />

      <DeleteSeriesModal
        isOpen={isDeleteSeriesModalOpen}
        seriesId={seriesId}
        onModalClose={onDeleteSeriesModalClose}
      />
    </div>
  );
}

export default SeriesIndexPoster;
