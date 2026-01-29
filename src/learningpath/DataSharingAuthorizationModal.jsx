import React from 'react';
import PropTypes from 'prop-types';
import {
  ModalDialog, Button, Alert, Stack,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from './message';

export default function DataSharingAuthorizationModal({
  isOpen,
  onClose,
  onAllow,
  partnerName = 'Corporate Partner Name',
  additionalMessage,
}) {
  const { formatMessage } = useIntl();
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="p-4 pt-5"
      title={formatMessage(messages.dataSharingTitle)}
      isOverflowVisible={false}
      hasCloseButton
    >
      <ModalDialog.Header>
        <ModalDialog.Title>{formatMessage(messages.dataSharingTitle)}</ModalDialog.Title>
      </ModalDialog.Header>

      <ModalDialog.Body>
        <Stack gap={3}>
          <div>
            <p className="mb-2">
              {formatMessage(messages.dataSharingDescription, { partnerName })}
            </p>

            {additionalMessage ? (
              <div className="border-top border-bottom border-light py-3 mt-3">{additionalMessage}</div>
            ) : null}
          </div>

          <div>
            <p className="mb-2"><strong>{formatMessage(messages.dataSharingByAllowing)}</strong></p>
            <ul className="mb-0">
              <li>{formatMessage(messages.dataSharingLi1)}</li>
              <li>{formatMessage(messages.dataSharingLi2)}</li>
              <li>{formatMessage(messages.dataSharingLi3, { partnerName })}</li>
            </ul>
          </div>

          <p className="mb-0"><strong>{formatMessage(messages.dataSharingConfirm, { partnerName })}</strong></p>
        </Stack>
      </ModalDialog.Body>

      <ModalDialog.Footer>
        <Button className='mr-2' variant="tertiary" onClick={onClose}>
          {formatMessage(messages.dataSharingDoNotShare)}
        </Button>
        <Button variant="primary" onClick={onAllow}>
          {formatMessage(messages.dataSharingAllowAndContinue)}
        </Button>
      </ModalDialog.Footer>
    </ModalDialog>
  );
}

DataSharingAuthorizationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAllow: PropTypes.func.isRequired,
  partnerName: PropTypes.string,
  additionalMessage: PropTypes.string,
};
