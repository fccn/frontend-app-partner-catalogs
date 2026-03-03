import React from 'react';
import { Icon } from '@openedx/paragon';
import { CheckCircle, Timelapse, LmsCompletionSolid } from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { ProgressStatus, StatusConfig } from './types';
import messages from '../message';

interface ProgressIndicatorProps {
  status: ProgressStatus;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ status }) => {
  const getStatusConfig = (currentStatus: ProgressStatus): StatusConfig => {
    switch (currentStatus?.toLowerCase() as Lowercase<ProgressStatus>) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: '#52854C',
          altText: 'progressCompleted',
        };
      case 'accepted':
        return {
          icon: Timelapse,
          color: 'var(--m-teal)',
          altText: 'progressAccepted',
        };
      default:
        return {
          icon: LmsCompletionSolid,
          color: '#8996A0',
          altText: 'progressSent',
        };
    }
  };

  const config = getStatusConfig(status);

  const { formatMessage } = useIntl();
  const ariaStatus = formatMessage(messages[config.altText]);
  const ariaLabel = formatMessage(messages.progressStatusAria, { status: ariaStatus });

  return (
    <Icon
      src={config.icon}
      aria-label={ariaLabel}
      style={{
        color: `${config.color}`,
        height: '36px',
        width: '36px',
        zIndex: 2,
      }}
    />
  );
};

export default ProgressIndicator;
