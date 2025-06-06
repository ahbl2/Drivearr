import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import Alert from 'Components/Alert';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { kinds } from 'Helpers/Props';
import {
  fetchAutoTaggingSpecificationSchema,
  selectAutoTaggingSpecificationSchema,
} from 'Store/Actions/settingsActions';
import translate from 'Utilities/String/translate';
import AddSpecificationItem from './AddSpecificationItem';
import styles from './AddSpecificationModalContent.css';

interface AddSpecificationModalContentProps {
  onModalClose: (options?: { specificationSelected: boolean }) => void;
}

export default function AddSpecificationModalContent({
  onModalClose,
}: AddSpecificationModalContentProps) {
  const { isSchemaFetching, isSchemaPopulated, schemaError, schema } =
    useSelector((state: AppState) => state.settings.autoTaggingSpecifications);

  const dispatch = useDispatch();

  const onSpecificationSelect = useCallback(
    ({ implementation }: { implementation: string }) => {
      dispatch(
        selectAutoTaggingSpecificationSchema({
          implementation,
          presetName: name,
        })
      );
      onModalClose({ specificationSelected: true });
    },
    [dispatch, onModalClose]
  );

  const handleModalClose = useCallback(() => {
    onModalClose();
  }, [onModalClose]);

  useEffect(() => {
    dispatch(fetchAutoTaggingSpecificationSchema());
  }, [dispatch]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('AddCondition')}</ModalHeader>

      <ModalBody>
        {isSchemaFetching ? <LoadingIndicator /> : null}

        {!isSchemaFetching && !!schemaError ? (
          <Alert kind={kinds.DANGER}>{translate('AddConditionError')}</Alert>
        ) : null}

        {isSchemaPopulated && !schemaError ? (
          <div>
            <Alert kind={kinds.INFO}>
              <div>{translate('SupportedAutoTaggingProperties')}</div>
            </Alert>

            <div className={styles.specifications}>
              {schema.map((specification) => {
                return (
                  <AddSpecificationItem
                    key={specification.implementation}
                    {...specification}
                    onSpecificationSelect={onSpecificationSelect}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onPress={handleModalClose}>{translate('Close')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}
