import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Card, Button, Chip, Icon } from '@openedx/paragon';
import {
  LmsCompletionSolid,
  CheckCircle,
  Timelapse,
  AccessTime,
  BookOpen,
  Check,
  ArrowForward,
  Settings,
  RemoveRedEye,
} from '@openedx/paragon/icons';
import { useOrganizations, usePrefetchLearningPathDetail } from './data/queries';
import { useScreenSize } from '../hooks/useScreenSize';

const LearningPathCard = ({ learningPath, showFilters = false }) => {
  const {
    key,
    image,
    displayName,
    subtitle,
    duration,
    numCourses,
    status,
    minDate,
    maxDate,
    org,
    isManager,
  } = learningPath;

  const { isSmall, isMedium } = useScreenSize();
  const orientation =
    (showFilters && (isSmall || isMedium)) || (!showFilters && isSmall)
      ? 'vertical'
      : 'horizontal';

  const prefetchLearningPathDetail = usePrefetchLearningPathDetail();
  const handleMouseEnter = () => prefetchLearningPathDetail(key);

  let statusVariant = null;
  let statusIcon = 'fa-circle';
  let buttonText = 'View';
  let buttonIcon = Check;
  let statusAltText = null;

  switch (status?.toLowerCase()) {
    case 'sent':
      statusVariant = 'pending';
      buttonText = 'View Catalog Info';
      buttonIcon = RemoveRedEye
      statusAltText = "Pending Invitation"
      break;
    case 'accepted':
      statusVariant = 'accepted';
      buttonText = 'Go to the catalog';
      buttonIcon = ArrowForward
      statusAltText = "Active"
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
        Access starts on <b>{d}</b>
      </>
    );
    buttonText = 'View';
  } else if (maxDate) {
    const d = maxDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (now > maxDate) {
      accessText = (
        <>
          Access ended on <b>{d}</b>
        </>
      );
      buttonText = 'View';
      if (status.toLowerCase() !== 'completed') statusVariant = '';
    } else {
      accessText = (
        <>
          Access until <b>{d}</b>
        </>
      );
    }
  }

  const subtitleLine =
    subtitle && duration
      ? `${subtitle} • ${duration} days`
      : subtitle || duration || '';

  const { data: organizations = {} } = useOrganizations();
  const orgData = useMemo(
    () => ({
      name: organizations[org]?.name || org,
      logo: organizations[org]?.logo,
    }),
    [organizations, org],
  );

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
        logoSrc={orgData.logo}
        logoAlt={`${orgData.name} logo`}
        className={orientation}
      />

      {/* Keep balanced padding and center vertically */}
      <Card.Body className="px-4 py-4 d-flex align-items-center">
        {/* Single horizontal flex row: left info + right actions */}
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
                <Chip
                  className={`status-chip status-${statusVariant}`}
                >
                  {statusAltText ?? status.toUpperCase()}
                </Chip>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 mb-2">
              {isManager && (
                <Chip>
                  Manager
                </Chip>
              )}
            </div>

            {subtitleLine && (
              <div className="text-muted mb-2">{subtitleLine}</div>
            )}

            <div className="d-flex flex-wrap gap-3 align-items-center">
              {numCourses !== undefined && numCourses !== null && (
                <Chip iconBefore={BookOpen} className="border-0 p-0">
                  {numCourses} courses
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
          <div
            className={`d-flex ${
              isSmall ? 'mt-3' : 'ml-auto'
            } flex-column justify-content-center align-items-end`}
          >
            {isManager && (
              <Link to={`/learningpath/${key}`}>
                <Button
                  variant="dark"
                  className="w-100"
                  style={{ minWidth: '180px' }}
                  size="sm"
                >
                  Manage 
                  <Icon src={Settings} />
                </Button>
              </Link>
            )}
            <Link to={`/learningpath/${org}/${key}`}>
              <Button
                variant="outline-primary"
                className="w-100"
                style={{ minWidth: '180px' }}
                size="sm"
              >
                {buttonText}
                <Icon src={buttonIcon} />
              </Button>
            </Link>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

LearningPathCard.propTypes = {
  learningPath: PropTypes.shape({
    key: PropTypes.string.isRequired,
    image: PropTypes.string,
    displayName: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    duration: PropTypes.string,
    numCourses: PropTypes.number,
    status: PropTypes.string.isRequired,
    minDate: PropTypes.instanceOf(Date),
    maxDate: PropTypes.instanceOf(Date),
    org: PropTypes.string,
  }).isRequired,
  showFilters: PropTypes.bool,
};

export default LearningPathCard;
