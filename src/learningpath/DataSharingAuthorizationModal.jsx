import React from 'react';
import PropTypes from 'prop-types';
import {
  ModalDialog, Button, Alert, Stack,
} from '@openedx/paragon';

export default function DataSharingAuthorizationModal({
  isOpen,
  onClose,
  onAllow,
  partnerName = 'Corporate Partner Name',
  additionalMessage,
}) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="p-4 pt-5"
      title="Data Sharing Authorization"
      isOverflowVisible={false}
      hasCloseButton
    >
      <ModalDialog.Header>
        <ModalDialog.Title>Data Sharing Authorization</ModalDialog.Title>
      </ModalDialog.Header>

      <ModalDialog.Body>
        <Stack gap={3}>
          <div>
            <p className="mb-2">
              To enroll in this course through the <strong>{partnerName}</strong> catalog, we need your permission to
              share certain information about your activity in this course with <strong>{partnerName}</strong>. This
              information will be used solely for tracking and reporting purposes within their training program.
            </p>

            {additionalMessage ? (
              <div className="border-top border-bottom border-light py-3 mt-3">{additionalMessage}</div>
            ) : null}
          </div>

          <div>
            <p className="mb-2">
              <strong>By allowing data sharing, you confirm that:</strong>
            </p>
            <ul className="mb-0">
              <li>You have been invited or your email is eligible for this corporate catalog.</li>
              <li>
                You understand that the shared information includes data such as your course progress, grades, and
                completion status.
              </li>
              <li>
                You consent to <strong>{partnerName}</strong> receiving this information in accordance with applicable
                data protection laws (GDPR).
              </li>
            </ul>
          </div>

          <p className="mb-0">
            <strong>Do you authorize sharing your data for this course with {partnerName}?</strong>
          </p>
        </Stack>
      </ModalDialog.Body>

      <ModalDialog.Footer style={{ gap: '12px' }}>
        <Button variant="tertiary" onClick={onClose}>
          Do Not Share
        </Button>
        <Button variant="primary" onClick={onAllow}>
          Allow and Continue
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
