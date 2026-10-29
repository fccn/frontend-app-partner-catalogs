import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Card, Button, Chip, Icon,
  Stack,
} from '@openedx/paragon';
import {
  AccessTime,
  HowToReg,
  Calendar,
  Verified,
} from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { useToast } from '../hooks/useToast';
import messages from './message';
import { buildAssetUrl } from '../util/assetUrl';
import {
  usePrefetchCourseDetail, useEnrollCourse, useOrganizations,
  useCatalogCourses, useCourseCertificate,
} from './data/queries';
import { CERTIFICATE_STATUS } from './data/dataUtils';
import { buildCourseHomeUrl } from './utils';
import { useScreenSize } from '../hooks/useScreenSize';

/**
 * Error codes returned in `code` by the course enrollment endpoint
 * (POST /partner_catalog/api/v1/catalogs/{id}/courses/{course_id}/enroll/),
 * mirroring `default_code` in openedx-corporate `partner_catalog/exceptions.py`.
 */
export const COURSE_ENROLLMENT_API_ERROR = Object.freeze({
  COURSE_LIMIT_REACHED: 'course_limit_reached',
  NOT_ALLOWED_TO_ENROLL: 'not_allowed_to_enroll',
});

export const CourseCard = ({
  course,
  onClick,
  isEnrolledInLearningPath,
  orientationOverride,
  showFilters = false,
}) => {
  const { formatMessage, formatDate } = useIntl();
  const {
    name,
    org,
    courseImageAssetPath,
    startDate,
    status,
    isEnrolling,
  } = course;

  const dateDisplay = startDate
    ? formatDate(new Date(startDate), {
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

  // Administrators go straight to the course, so their cards do not need the certificate.
  const { administrator } = getAuthenticatedUser() || {};
  const { data: certificate } = useCourseCertificate(course.id, { enabled: !administrator });
  const isCertificateGenerating = certificate?.status === CERTIFICATE_STATUS.GENERATING;

  let courseButtonText = formatMessage(messages.startCourse);
  switch (status?.toLowerCase()) {
    case 'in progress':
      courseButtonText = formatMessage(messages.continueText);
      break;
    case 'completed':
      courseButtonText = formatMessage(certificate ? messages.reviewCourse : messages.continueText);
      break;
    default:
      break;
  }

  if (isEnrolling) {
    courseButtonText = formatMessage(messages.loadingText);
  }

  const disableStartButton = isEnrolling || isEnrolledInLearningPath === false;

  const courseButton = (
    <Button
      variant={certificate ? 'outline-primary' : 'primary'}
      size="sm"
      disabled={disableStartButton}
      className="flex-fill py-2"
      onClick={onClick}
    >
      {courseButtonText}
    </Button>
  );

  let certificateButton = null;
  if (isCertificateGenerating) {
    certificateButton = (
      <Button variant="primary" size="sm" className="flex-fill py-2" disabled>
        {formatMessage(messages.certificateGenerating)}
      </Button>
    );
  } else if (certificate) {
    certificateButton = (
      <Button
        as="a"
        variant="primary"
        size="sm"
        className="flex-fill py-2"
        href={certificate.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {formatMessage(messages.viewCertificate)}
      </Button>
    );
  }

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
        {/* A certificate being generated also counts as certified, as in openedx-corporate. */}
        {certificate && (
          <Chip iconBefore={Verified} className="status-chip status-accepted">
            {formatMessage(messages.certified)}
          </Chip>
        )}

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
        {/* With a certificate the two actions are stacked: side by side, their labels wrap in
            the narrow catalog columns. */}
        <Stack
          className="w-100"
          direction={isMedium || certificate ? 'vertical' : 'horizontal'}
          gap={2}
        >
          {certificateButton}
          {courseButton}
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
  isEnrolledInLearningPath: PropTypes.bool,
  showFilters: PropTypes.bool,
  orientationOverride: PropTypes.oneOf(['vertical', 'horizontal']),
};

export const CourseCardWithEnrollment = ({
  course, learningPathId, isEnrolledInLearningPath, orientationOverride,
}) => {
  const { formatMessage } = useIntl();
  const { data: catalogCourses } = useCatalogCourses(learningPathId);
  const enrollCourseMutation = useEnrollCourse(learningPathId);
  const { showToast } = useToast();

  const enrollmentsMap = useMemo(() => {
    if (!catalogCourses) { return new Map(); }

    return new Map(
      catalogCourses.map(({ courseRun, enrollments }) => [
        courseRun.id,
        enrollments,
      ]),
    );
  }, [catalogCourses]);

  const courseWithEnrollment = useMemo(() => ({
    ...course,
    enrollmentsQuantity: enrollmentsMap.get(course.id) ?? 0,
    isEnrolling: enrollCourseMutation.isPending,
  }), [course, enrollmentsMap, enrollCourseMutation.isPending]);

  const courseHomeUrl = buildCourseHomeUrl(course.id);

  const handleCourseAction = async () => {
    const { administrator } = getAuthenticatedUser();

    if (administrator) {
      window.location.href = courseHomeUrl;
      return;
    }

    enrollCourseMutation.mutate(course.id, {
      onSuccess: () => {
        // Full-page navigation discards the React Query cache, so the
        // invalidations in useEnrollCourse have no visible effect here: the
        // enrollment counts are refetched when the learner comes back. They
        // only take effect if this is changed to stay on the page.
        window.location.href = courseHomeUrl;
      },
      onError: ({ response }) => {
        switch (response?.data?.code) {
          case COURSE_ENROLLMENT_API_ERROR.COURSE_LIMIT_REACHED:
            showToast(formatMessage(messages.courseLimitReached));
            break;
          case COURSE_ENROLLMENT_API_ERROR.NOT_ALLOWED_TO_ENROLL:
            showToast(formatMessage(messages.notAllowedToEnroll));
            break;
          default:
            showToast(formatMessage(messages.genericErrorAction));
        }
      },
    });
  };

  return (
    <CourseCard
      course={courseWithEnrollment}
      onClick={handleCourseAction}
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
  orientationOverride: PropTypes.oneOf(['vertical', 'horizontal']),
};
