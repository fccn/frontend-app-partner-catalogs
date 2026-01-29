import React, { useMemo } from 'react';
import { getConfig } from '@edx/frontend-platform/config';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  Card, Button, Chip, Icon,
  Stack,
} from '@openedx/paragon';
import {
  BookOpen,
  AccessTime,
  Check,
  ArrowForward,
  Settings,
  RemoveRedEye,
} from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { usePrefetchLearningPathDetail } from './data/queries';
import messages from './message';
import { useScreenSize } from '../hooks/useScreenSize';

const statusActions = {
  pending: ['pending'],
  accepted: ['accepted'],
  sent: ['sent', 'pending'],
  upcoming: ['upcoming'],
};

const cardButtons = {
  pending: {
    buttonMessageKey: 'viewCatalogInfo',
    buttonIcon: RemoveRedEye,
  },
  accepted: {
    buttonMessageKey: 'goToCatalog',
    buttonIcon: ArrowForward,
  },
  sent: {
    buttonMessageKey: 'acceptInvitationBtn',
    buttonIcon: Check,
    query: '?open=true',
  },
  upcoming: {
    buttonMessageKey: 'view',
    buttonIcon: ArrowForward,
  },
};

const LearningPathCard = ({ learningPath, showFilters = false }) => {
  const { formatMessage } = useIntl();
  const {
    id,
    image,
    displayName,
    subtitle,
    duration,
    numCourses,
    status,
    minDate,
    maxDate,
    partner,
    isManager,
    slug: learningPathSlug,
  } = learningPath;

  const learningPathStatus = status?.toLowerCase();
  const { isSmall, isMedium } = useScreenSize();
  const orientation = (showFilters && (isSmall || isMedium)) || (!showFilters && isSmall)
    ? 'vertical'
    : 'horizontal';

  const prefetchLearningPathDetail = usePrefetchLearningPathDetail();
  const handleMouseEnter = () => prefetchLearningPathDetail(id);

  let statusVariant = 'pending';
  let statusAltText = formatMessage(messages.selfEnrollment);

  switch (learningPathStatus) {
    case 'sent':
      statusVariant = 'sent';
      statusAltText = formatMessage(messages.pendingInvitation);
      break;
    case 'accepted':
      statusVariant = 'accepted';
      statusAltText = formatMessage(messages.activeStatus);
      break;
    default:
      break;
  }

  const now = new Date();
  let accessText = '';
  if (minDate && minDate > now) {
    const d = minDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    accessText = (
      <>
        {formatMessage(messages.accessStartsOnPrefix)} <b>{d}</b>
      </>
    );
    statusVariant = 'upcoming';
  } else if (maxDate) {
    const d = maxDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (now > maxDate) {
      accessText = (
        <>
          {formatMessage(messages.accessEndedOnPrefix)} <b>{d}</b>
        </>
      );
      statusVariant = 'upcoming';
      if (status.toLowerCase() !== 'completed') { statusVariant = ''; }
    } else {
      accessText = (
        <>
          {formatMessage(messages.accessUntilPrefix)} <b>{d}</b>
        </>
      );
    }
  }

  const subtitleLine = subtitle && duration
    ? `${subtitle} • ${duration} days`
    : subtitle || duration || '';

  const { partnerName, partnerLogo, partnerSlug } = useMemo(() => ({
    partnerName: partner?.name || partner?.slug || '',
    partnerLogo: partner?.logo,
    partnerSlug: partner?.slug,
  }), [partner]);

  const learningPathUrl = partnerSlug
    ? `/catalog/${partnerSlug}/${learningPathSlug}`
    : `/catalog/${learningPathSlug}`;

  const corporateManagerUrl = getConfig().CORPORATE_MANAGER_MFE_BASE_URL
    ? `${getConfig().CORPORATE_MANAGER_MFE_BASE_URL}/${partnerSlug}/catalogs/${learningPathSlug}/courses/`
    : '#';

  return (
    <Card
      orientation={orientation}
      className={`lp-card ${orientation}`}
      onMouseEnter={handleMouseEnter}
      style={{ minHeight: '180px' }}
    >
      <Card.ImageCap
        src={image}
        srcAlt={`${displayName} catalog image`}
        logoSrc={partnerLogo}
        logoAlt={partnerName ? `${partnerName} logo` : 'Partner logo'}
        className={orientation}
      />

      <Card.Body className="px-4 py-4 d-flex align-items-center">
        <div
          className={`d-flex ${
            isSmall ? 'flex-column' : 'flex-row align-items-center justify-content-between'
          } w-100`}
        >
          {/* Left section */}
          <div className="flex-grow-1 pr-4">
            <div className="d-flex align-items-center mb-2">
              <h3 className="m-0">{displayName}</h3>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-2">
              {!!statusVariant && (
                <Chip className={`status-chip status-${statusVariant}`}>
                  {statusAltText ?? status.toUpperCase()}
                </Chip>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 mb-2">
              {isManager && (
                <Chip className="chip-manager">
                  {formatMessage(messages.catalogManager)}
                </Chip>
              )}
            </div>

            {subtitleLine && (
              <div className="text-muted mb-2">{subtitleLine}</div>
            )}

            <div className="d-flex flex-wrap gap-3 align-items-center">
              {numCourses !== undefined && numCourses !== null && (
                <Chip iconBefore={BookOpen} className="courses-counter border-0 p-0">
                  {formatMessage(messages.coursesCount, { count: numCourses })}
                </Chip>
              )}
              {accessText && (
                <Chip iconBefore={AccessTime} className="border-0 p-0">
                  {accessText}
                </Chip>
              )}
            </div>
          </div>

          {/* Right section (actions) */}

          <Stack
            gap={3}
            className={`justify-content-center align-items-end ${
              isSmall ? 'mt-3' : 'ml-auto'
            }`}
          >
            {isManager && (
              <Link to={corporateManagerUrl} target="_blank">
                <Button
                  variant="primary"
                  className="long-button light-icon"
                  size="sm"
                >
                  <Stack direction="horizontal" gap={2} className="align-items-center">
                    {formatMessage(messages.manage)}
                    <Icon src={Settings} />
                  </Stack>
                </Button>
              </Link>
            )}
            {statusActions[statusVariant].map((s) => (
              <Link key={s} to={`${learningPathUrl}${cardButtons[s].query || ''}`}>
                <Button
                  variant="outline-dark"
                  className="long-button dark-icon"
                  size="sm"
                >
                  <Stack direction="horizontal" gap={2} className="align-items-center">
                    {formatMessage(messages[cardButtons[s].buttonMessageKey])}
                    <Icon src={cardButtons[s].buttonIcon} className="pl-1" />
                  </Stack>
                </Button>
              </Link>
            ))}
          </Stack>
        </div>
      </Card.Body>
    </Card>
  );
};

LearningPathCard.propTypes = {
  learningPath: PropTypes.shape({
    id: PropTypes.string.isRequired,
    image: PropTypes.string,
    displayName: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    duration: PropTypes.string,
    numCourses: PropTypes.number,
    status: PropTypes.string.isRequired,
    minDate: PropTypes.instanceOf(Date),
    maxDate: PropTypes.instanceOf(Date),
    partner: PropTypes.shape({
      id: PropTypes.number,
      slug: PropTypes.string.isRequired,
      name: PropTypes.string,
      homepageUrl: PropTypes.string,
      logo: PropTypes.string,
    }).isRequired,
    isManager: PropTypes.bool,
    slug: PropTypes.string,
  }).isRequired,
  showFilters: PropTypes.bool,
};

export default LearningPathCard;
