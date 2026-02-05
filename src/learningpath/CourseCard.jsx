import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Card, Button, Icon,
} from '@openedx/paragon';
import {
  AccessTime,
  HowToReg,
  Calendar,
} from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import messages from './message';
import { buildAssetUrl } from '../util/assetUrl';
import {
  usePrefetchCourseDetail, useCourseEnrollmentStatus, useEnrollCourse, useOrganizations,
} from './data/queries';
import { buildCourseHomeUrl } from './utils';
import { useScreenSize } from '../hooks/useScreenSize';

export const CourseCard = ({
  course,
  onClick,
  onClickViewButton,
  isEnrolledInLearningPath,
  showFilters = false,
  orientationOverride,
}) => {
  const { formatMessage } = useIntl();
  const {
    name,
    org,
    courseImageAssetPath,
    startDate,
    status,
    checkingEnrollment,
  } = course;

  const dateDisplay = startDate
    ? new Date(startDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    : null;

  const { isSmall, isMedium } = useScreenSize();
  const orientation = orientationOverride || ((showFilters && (isSmall || isMedium)) || (!showFilters && isSmall)
    ? 'vertical'
    : 'horizontal');

  // Prefetch the course detail when the user hovers over the card.
  const prefetchCourseDetail = usePrefetchCourseDetail(course.id);
  const handleMouseEnter = () => {
    prefetchCourseDetail();
  };

  let buttonText = formatMessage(messages.startCourse);

  switch (status?.toLowerCase()) {
    case 'completed':
      buttonText = formatMessage(messages.viewCertificate);
      break;
    case 'not started':
      buttonText = formatMessage(messages.startCourse);
      break;
    case 'in progress':
      buttonText = formatMessage(messages.continueText);
      break;
    default:
      break;
  }

  if (checkingEnrollment) {
    buttonText = formatMessage(messages.loadingText);
  }

  const disableStartButton = checkingEnrollment || isEnrolledInLearningPath === false;

  const { data: organizations = {} } = useOrganizations();
  const orgData = useMemo(() => ({
    name: organizations[org]?.name || org,
    logo: organizations[org]?.logo,
  }), [organizations, org]);

  return (
    <Card
      orientation={orientation}
      className={`h-full hover:shadow-lg transition-shadow ${orientation} mb-4`}
      onMouseEnter={handleMouseEnter}
    >
      <Card.ImageCap
        src={buildAssetUrl(courseImageAssetPath)}
        srcAlt={`${name} course image`}
        logoSrc={orgData.logo}
        logoAlt={`${orgData.name} logo`}
      />

      <Card.Header title={name} subtitle={orgData.name} size="md" />

      <Card.Section>
        <div className="space-y-3">
          {/* Enrolled Count */}
          <div
            className="text-gray-600 d-flex align-items-center"
          >
            <Icon
              src={HowToReg}
              size="md"
              className="text-blue-600 flex-none mr-2"
            />
            <span className="text-sm">{formatMessage(messages.enrolledCount, { count: 10 })}</span>
          </div>

          {/* Duration */}
          <div
            className="text-gray-600 d-flex align-items-center"
          >
            <Icon
              src={AccessTime}
              size="md"
              className="text-blue-600 flex-none mr-2"
            />
            <span className="text-sm">{formatMessage(messages.hoursText, { hours: 20 })}</span>
          </div>

          {/* Start Date */}
          <div
            className="text-gray-600 d-flex align-items-center"
          >
            <Icon
              src={Calendar}
              size="md"
              className="text-blue-600 flex-none mr-2"
            />
            <span className="text-sm">{formatMessage(messages.startsOn, { date: dateDisplay })}</span>
          </div>
        </div>
      </Card.Section>

      <Card.Footer>
        <div className="d-flex flex-column flex-lg-row w-100">
          <Button
            variant="outline-primary"
            size="sm"
            className="flex-fill py-2 mr-2"
            onClick={onClickViewButton}
          >
            {formatMessage(messages.moreDetails)}
          </Button>

          {!disableStartButton && (
          <Button
            variant="primary"
            size="sm"
            className="flex-fill py-2"
            onClick={onClick}
          >
            { buttonText }
          </Button>
          )}
        </div>
      </Card.Footer>
    </Card>
  );
};

CourseCard.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    org: PropTypes.string.isRequired,
    courseImageAssetPath: PropTypes.string,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    status: PropTypes.string.isRequired,
    percent: PropTypes.number.isRequired,
    checkingEnrollment: PropTypes.bool,
  }).isRequired,
  onClick: PropTypes.func,
  onClickViewButton: PropTypes.func,
  isEnrolledInLearningPath: PropTypes.bool,
  showFilters: PropTypes.bool,
  orientationOverride: PropTypes.oneOf(['vertical', 'horizontal']),
};

export const CourseCardWithEnrollment = ({
  course, learningPathId, isEnrolledInLearningPath, onClick, orientationOverride,
}) => {
  const { data: enrollmentStatus, isLoading: checkingEnrollment } = useCourseEnrollmentStatus(course.id);
  const [enrolling, setEnrolling] = useState(false);
  const enrollCourseMutation = useEnrollCourse(learningPathId);

  const courseWithEnrollment = {
    ...course,
    isEnrolledInCourse: enrollmentStatus?.isEnrolled || false,
    checkingEnrollment: checkingEnrollment || enrolling,
  };

  const courseHomeUrl = buildCourseHomeUrl(course.id);

  const handleCourseAction = async () => {
    const { administrator } = getAuthenticatedUser();

    if (courseWithEnrollment.isEnrolledInCourse || administrator) {
      window.location.href = courseHomeUrl;
      return;
    }

    setEnrolling(true);
    try {
      const result = await enrollCourseMutation.mutateAsync(course.id);
      if (result.success) {
        window.location.href = courseHomeUrl;
      } else {
        // eslint-disable-next-line no-console
        console.error('Failed to enroll in the course:', result.data?.error || 'Unknown error');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to enroll in the course:', error);
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <CourseCard
      course={courseWithEnrollment}
      onClick={handleCourseAction}
      onClickViewButton={onClick}
      isEnrolledInLearningPath={isEnrolledInLearningPath}
      orientationOverride={orientationOverride}
      isEnrolledInCourse={courseWithEnrollment.isEnrolledInCourse}
    />
  );
};

CourseCardWithEnrollment.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  learningPathId: PropTypes.string.isRequired,
  isEnrolledInLearningPath: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  orientationOverride: PropTypes.oneOf(['vertical', 'horizontal']),
};
