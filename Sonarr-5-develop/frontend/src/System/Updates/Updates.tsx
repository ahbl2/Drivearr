import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import * as commandNames from 'Commands/commandNames';
import Alert from 'Components/Alert';
import Icon from 'Components/Icon';
import Label from 'Components/Label';
import SpinnerButton from 'Components/Link/SpinnerButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import InlineMarkdown from 'Components/Markdown/InlineMarkdown';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import { icons, kinds } from 'Helpers/Props';
import useUpdateSettings from 'Settings/General/useUpdateSettings';
import { executeCommand } from 'Store/Actions/commandActions';
import { fetchGeneralSettings } from 'Store/Actions/settingsActions';
import { fetchUpdates } from 'Store/Actions/systemActions';
import createCommandExecutingSelector from 'Store/Selectors/createCommandExecutingSelector';
import createSystemStatusSelector from 'Store/Selectors/createSystemStatusSelector';
import createUISettingsSelector from 'Store/Selectors/createUISettingsSelector';
import { UpdateMechanism } from 'typings/Settings/General';
import formatDate from 'Utilities/Date/formatDate';
import formatDateTime from 'Utilities/Date/formatDateTime';
import translate from 'Utilities/String/translate';
import UpdateChanges from './UpdateChanges';
import useUpdates from './useUpdates';
import styles from './Updates.css';

const VERSION_REGEX = /\d+\.\d+\.\d+\.\d+/i;

function Updates() {
  const currentVersion = useSelector((state: AppState) => state.app.version);
  const { packageUpdateMechanismMessage } = useSelector(
    createSystemStatusSelector()
  );
  const { shortDateFormat, longDateFormat, timeFormat } = useSelector(
    createUISettingsSelector()
  );
  const isInstallingUpdate = useSelector(
    createCommandExecutingSelector(commandNames.APPLICATION_UPDATE)
  );

  const {
    data: updates,
    isFetched: isUpdatesFetched,
    isLoading: isLoadingUpdates,
    error: updatesError,
  } = useUpdates();
  const {
    data: updateSettings,
    isFetched: isSettingsFetched,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useUpdateSettings();

  const dispatch = useDispatch();
  const [isMajorUpdateModalOpen, setIsMajorUpdateModalOpen] = useState(false);
  const isFetching = isLoadingUpdates || isLoadingSettings;
  const isPopulated = isUpdatesFetched && isSettingsFetched;
  const updateMechanism = updateSettings?.updateMechanism ?? 'builtIn';
  const hasError = !!(updatesError || settingsError);
  const hasUpdates = isPopulated && !hasError && updates.length > 0;
  const noUpdates = isPopulated && !hasError && !updates.length;

  const externalUpdaterPrefix = translate('UpdateAppDirectlyLoadError');
  const externalUpdaterMessages: Partial<Record<UpdateMechanism, string>> = {
    external: translate('ExternalUpdater'),
    apt: translate('AptUpdater'),
    docker: translate('DockerUpdater'),
  };

  const { isMajorUpdate, hasUpdateToInstall } = useMemo(() => {
    const majorVersion = parseInt(
      currentVersion.match(VERSION_REGEX)?.[0] ?? '0'
    );

    const latestVersion = updates[0]?.version;
    const latestMajorVersion = parseInt(
      latestVersion?.match(VERSION_REGEX)?.[0] ?? '0'
    );

    return {
      isMajorUpdate: latestMajorVersion > majorVersion,
      hasUpdateToInstall: updates.some(
        (update) => update.installable && update.latest
      ),
    };
  }, [currentVersion, updates]);

  const noUpdateToInstall = hasUpdates && !hasUpdateToInstall;

  const handleInstallLatestPress = useCallback(() => {
    if (isMajorUpdate) {
      setIsMajorUpdateModalOpen(true);
    } else {
      dispatch(executeCommand({ name: commandNames.APPLICATION_UPDATE }));
    }
  }, [isMajorUpdate, setIsMajorUpdateModalOpen, dispatch]);

  const handleInstallLatestMajorVersionPress = useCallback(() => {
    setIsMajorUpdateModalOpen(false);

    dispatch(
      executeCommand({
        name: commandNames.APPLICATION_UPDATE,
        installMajorUpdate: true,
      })
    );
  }, [setIsMajorUpdateModalOpen, dispatch]);

  const handleCancelMajorVersionPress = useCallback(() => {
    setIsMajorUpdateModalOpen(false);
  }, [setIsMajorUpdateModalOpen]);

  useEffect(() => {
    dispatch(fetchUpdates());
    dispatch(fetchGeneralSettings());
  }, [dispatch]);

  return (
    <PageContent title={translate('Updates')}>
      <PageContentBody>
        {isPopulated || hasError ? null : <LoadingIndicator />}

        {noUpdates ? (
          <Alert kind={kinds.INFO}>{translate('NoUpdatesAreAvailable')}</Alert>
        ) : null}

        {hasUpdateToInstall ? (
          <div className={styles.messageContainer}>
            {updateMechanism === 'builtIn' || updateMechanism === 'script' ? (
              <SpinnerButton
                kind={kinds.PRIMARY}
                isSpinning={isInstallingUpdate}
                onPress={handleInstallLatestPress}
              >
                {translate('InstallLatest')}
              </SpinnerButton>
            ) : (
              <>
                <Icon name={icons.WARNING} kind={kinds.WARNING} size={30} />

                <div className={styles.message}>
                  {externalUpdaterPrefix}{' '}
                  <InlineMarkdown
                    data={
                      packageUpdateMechanismMessage ||
                      externalUpdaterMessages[updateMechanism] ||
                      externalUpdaterMessages.external
                    }
                  />
                </div>
              </>
            )}

            {isFetching ? (
              <LoadingIndicator className={styles.loading} size={20} />
            ) : null}
          </div>
        ) : null}

        {noUpdateToInstall && (
          <div className={styles.messageContainer}>
            <Icon
              className={styles.upToDateIcon}
              name={icons.CHECK_CIRCLE}
              size={30}
            />
            <div className={styles.message}>{translate('OnLatestVersion')}</div>

            {isFetching && (
              <LoadingIndicator className={styles.loading} size={20} />
            )}
          </div>
        )}

        {hasUpdates && (
          <div>
            {updates.map((update) => {
              return (
                <div key={update.version} className={styles.update}>
                  <div className={styles.info}>
                    <div className={styles.version}>{update.version}</div>
                    <div className={styles.space}>&mdash;</div>
                    <div
                      className={styles.date}
                      title={formatDateTime(
                        update.releaseDate,
                        longDateFormat,
                        timeFormat
                      )}
                    >
                      {formatDate(update.releaseDate, shortDateFormat)}
                    </div>

                    {update.branch === 'main' ? null : (
                      <Label className={styles.label}>{update.branch}</Label>
                    )}

                    {update.version === currentVersion ? (
                      <Label
                        className={styles.label}
                        kind={kinds.SUCCESS}
                        title={formatDateTime(
                          update.installedOn,
                          longDateFormat,
                          timeFormat
                        )}
                      >
                        {translate('CurrentlyInstalled')}
                      </Label>
                    ) : null}

                    {update.version !== currentVersion && update.installedOn ? (
                      <Label
                        className={styles.label}
                        kind={kinds.INVERSE}
                        title={formatDateTime(
                          update.installedOn,
                          longDateFormat,
                          timeFormat
                        )}
                      >
                        {translate('PreviouslyInstalled')}
                      </Label>
                    ) : null}
                  </div>

                  {update.changes ? (
                    <div>
                      <UpdateChanges
                        title={translate('New')}
                        changes={update.changes.new}
                      />

                      <UpdateChanges
                        title={translate('Fixed')}
                        changes={update.changes.fixed}
                      />
                    </div>
                  ) : (
                    <div>{translate('MaintenanceRelease')}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {updatesError ? (
          <Alert kind={kinds.WARNING}>
            {translate('FailedToFetchUpdates')}
          </Alert>
        ) : null}

        {settingsError ? (
          <Alert kind={kinds.DANGER}>
            {translate('FailedToFetchSettings')}
          </Alert>
        ) : null}

        <ConfirmModal
          isOpen={isMajorUpdateModalOpen}
          kind={kinds.WARNING}
          title={translate('InstallMajorVersionUpdate')}
          message={
            <div>
              <div>{translate('InstallMajorVersionUpdateMessage')}</div>
              <div>
                <InlineMarkdown
                  data={translate('InstallMajorVersionUpdateMessageLink', {
                    domain: 'sonarr.tv',
                    url: 'https://sonarr.tv/#downloads',
                  })}
                />
              </div>
            </div>
          }
          confirmLabel={translate('Install')}
          onConfirm={handleInstallLatestMajorVersionPress}
          onCancel={handleCancelMajorVersionPress}
        />
      </PageContentBody>
    </PageContent>
  );
}

export default Updates;
