import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Card, Button, Icon,
  Stack,
} from '@openedx/paragon';
import {
  AccessTime,
  HowToReg,
  Calendar,
} from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import { useToast } from '../hooks/useToast';
import messages from './message';
import { buildAssetUrl } from '../util/assetUrl';
import {
  usePrefetchCourseDetail, useCourseEnrollmentStatus, useEnrollCourse, useOrganizations,
  useCourseEnrollments, useCourseCertificate,
} from './data/queries';
import { buildCourseHomeUrl } from './utils';
import { useScreenSize } from '../hooks/useScreenSize';

export const CourseCard = ({
  course,
  onClick,
  onClickViewButton,
  isEnrolledInLearningPath,
  orientationOverride,
  showFilters = false,
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
  let handleClick = onClick;
  let anchorProps;

  const { data: courseCertificate } = useCourseCertificate(course.id, status?.toLowerCase());
  const certificateURL = courseCertificate?.downloadUrl;

  switch (status?.toLowerCase()) {
    case 'completed':
      buttonText = formatMessage(messages.viewCertificate);
      handleClick = null;
      anchorProps = {
        as: 'a',
        href: `${getConfig().LMS_BASE_URL}${certificateURL ?? ''}`,
        target: '_blank',
        disabled: !certificateURL,
      };
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

      <Card.Section className="space-y-3 flex-fill">
        {/* Enrolled Count */}
        <div
          className="text-gray-600 d-flex align-items-center"
        >
          <Icon
            src={HowToReg}
            size="md"
            className="text-blue-600 flex-none mr-2"
          />
          <span className="text-sm">{formatMessage(messages.enrolledCount, { count: course.enrollmentsQuantity ?? 0 })}</span>
        </div>

        {/* Duration */}
        {!!course.duration && (
          <div
            className="text-gray-600 d-flex align-items-center"
          >
            <Icon
              src={AccessTime}
              size="md"
              className="text-blue-600 flex-none mr-2"
            />
            <span className="text-sm">{formatMessage(messages.hoursText, { hours: course.duration })}</span>
          </div>
        )}

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
      </Card.Section>

      <Card.Footer>
        <Stack className="w-100" direction={isMedium ? 'vertical' : 'horizontal'} gap={2}>
          <Button
            variant="outline-primary"
            size="sm"
            className="flex-fill py-2"
            onClick={onClickViewButton}
          >
            {formatMessage(messages.moreDetails)}
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={disableStartButton}
            className="flex-fill py-2"
            onClick={handleClick}
            {...anchorProps}
          >
            { buttonText }
          </Button>
        </Stack>
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
    enrollmentsQuantity: PropTypes.number.isRequired,
    duration: PropTypes.string,
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
  const { data: enrollments } = useCourseEnrollments(course.id);
  const [enrolling, setEnrolling] = useState(false);
  const enrollCourseMutation = useEnrollCourse(learningPathId);
  const { showToast } = useToast();

  const courseWithEnrollment = {
    ...course,
    enrollmentsQuantity: enrollments?.count ?? 0,
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
    enrollCourseMutation.mutate(course.id, {
      onSuccess: () => {
        window.location.href = courseHomeUrl;
        setEnrolling(false);
      },
      onError: ({ response }) => {
        showToast(response.data.detail);
        setEnrolling(false);
      },
    });
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
