import React, { useMemo } from 'react';
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
  usePrefetchCourseDetail, useEnrollCourse, useOrganizations,
  useCatalogCourses, useCourseCertificate,
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
    isEnrolling,
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

  if (isEnrolling) {
    buttonText = formatMessage(messages.loadingText);
  }

  const disableStartButton = isEnrolling || isEnrolledInLearningPath === false;

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
    isEnrolling: PropTypes.bool,
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
  const { data: catalogCourses } = useCatalogCourses(learningPathId);
  const enrollCourseMutation = useEnrollCourse(learningPathId);
  const { showToast } = useToast();

  const courseWithEnrollment = {
    ...course,
    enrollmentsQuantity: catalogCourses?.find(
      (catalogCourse) => catalogCourse.courseRun.id === course.id,
    )?.enrollments ?? 0,
    isEnrolling: enrollCourseMutation.isPending,
  };

  const courseHomeUrl = buildCourseHomeUrl(course.id);

  const handleCourseAction = async () => {
    const { administrator } = getAuthenticatedUser();

    if (administrator) {
      window.location.href = courseHomeUrl;
      return;
    }

    enrollCourseMutation.mutate(course.id, {
      onSuccess: () => {
        window.location.href = courseHomeUrl;
      },
      onError: ({ response }) => {
        showToast(response.data.detail);
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
