import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Spinner,
  Card,
  Row,
  Col,
  Icon,
  ModalCloseButton,
  Button,
  Alert,
  Chip,
} from '@openedx/paragon';
import {
  LmsBook,
  AccessTimeFilled,
  Award,
  Calendar,
  Person,
  Close,
  ChevronLeft,
} from '@openedx/paragon/icons';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useCourseDetail, useOrganizations } from './data/queries';
import { buildAssetUrl, replaceStaticAssetReferences } from '../util/assetUrl';
import { buildCourseHomeUrl } from './utils';
import { useScreenSize } from '../hooks/useScreenSize';
import messages from './message';

const CourseDetailContent = ({
  course,
  isModalView = false,
  onClose,
  learningPathTitle,
}) => {
  const { formatMessage } = useIntl();
  const {
    name,
    shortDescription,
    endDate,
    duration,
    selfPaced,
    courseImageAssetPath,
    description,
    org,
  } = course;

  const dateDisplay = endDate
    ? new Date(endDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    : null;

  const { isSmall } = useScreenSize();
  const navigate = useNavigate();
  const paceText = selfPaced
    ? formatMessage(messages.selfPaced)
    : formatMessage(messages.instructorPaced);
  const aboutHtml = replaceStaticAssetReferences(
    description || shortDescription || formatMessage(messages.noDescription),
    course.id,
  );
  const scheduleText = selfPaced
    ? formatMessage(messages.progressAtYourOwnSpeed)
    : formatMessage(messages.followCourseSchedule);
  const handleClose = onClose || (() => navigate(-1));
  const { courseKey: urlCourseKey } = useParams();
  const activeCourseKey = course.id || urlCourseKey;
  const handleViewClick = () => {
    window.location.href = buildCourseHomeUrl(activeCourseKey);
  };

  const { data: organizations = {} } = useOrganizations();
  const orgData = useMemo(() => ({
    name: organizations[org]?.name || org,
    logo: organizations[org]?.logo,
  }), [organizations, org]);

  return (
    <>
      <div className="hero">
        {isModalView && (
          <Row className="p-0 m-0 d-flex align-items-center modal-header">
            <Col xs={10}>
              <h4 className="mb-0 pl-4 text-muted font-weight-normal text-truncate">
                <b>{formatMessage(messages.learningPathLabel)}</b> {learningPathTitle}
              </h4>
            </Col>
            <ModalCloseButton variant="tertiary" onClick={handleClose} className="mr-2 rounded-circle">
              <Icon src={Close} />
            </ModalCloseButton>
          </Row>
        )}
        <Card orientation={isSmall ? 'vertical' : 'horizontal'}>
          {isSmall && (
            <Card.ImageCap
              src={buildAssetUrl(courseImageAssetPath)}
              srcAlt={`${name} course image`}
              logoSrc={orgData.logo}
              logoAlt={`${orgData.name} logo`}
              className="mb-4"
            />
          )}
          <Card.Body>
            {!isModalView && (
            <Card.Section>
              <Link to="/" className="d-flex align-items-center back-link pl-4">
                <Icon src={ChevronLeft} />
                <span>{formatMessage(messages.goBack)}</span>
              </Link>
            </Card.Section>
            )}
            <Card.Section className="pl-5 pr-6">
              <Chip iconBefore={LmsBook} className="course-chip">{formatMessage(messages.courseChip)}</Chip>
              <h1 className={`my-3 mt-4.5${isSmall ? ' h2' : ''}`}>{name}</h1>
              {/* eslint-disable-next-line react/no-danger */}
              <div className="text-muted" dangerouslySetInnerHTML={{ __html: shortDescription || formatMessage(messages.noDescription) }} />
            </Card.Section>
          </Card.Body>
          {!isSmall && (
            <Card.ImageCap
              src={buildAssetUrl(courseImageAssetPath)}
              srcAlt={`${name} course image`}
              logoSrc={orgData.logo}
              logoAlt={`${orgData.name} logo`}
            />
          )}
        </Card>
        <Row className="my-4 mx-0 px-5 px-md-6 flex-column flex-md-row align-items-start hero-info course-hero-info">
          {dateDisplay && (
            <div className="d-flex align-items-center">
              <Icon src={AccessTimeFilled} className="mr-4 mb-3.5" />
              <div>
                <p className="mb-0 font-weight-bold">{dateDisplay}</p>
                <p className="mb-0 text-muted">{formatMessage(messages.accessEnds)}</p>
              </div>
            </div>
          )}
          <div className="d-flex align-items-center">
            <Icon src={Award} className="mr-4 mb-3.5" />
            <div>
              <p className="mb-0 font-weight-bold">{formatMessage(messages.certificate)}</p>
              <p className="mb-0 text-muted">{formatMessage(messages.earnCertificate)}</p>
            </div>
          </div>
          {duration && (
            <div className="d-flex align-items-center">
              <Icon src={Calendar} className="mr-4 mb-3.5" />
              <div>
                <p className="mb-0 font-weight-bold">{duration}</p>
                <p className="mb-0 text-muted">{formatMessage(messages.approxDuration)}</p>
              </div>
            </div>
          )}
          <div className="d-flex align-items-center">
            <Icon src={Person} className="mr-4 mb-3.5" />
            <div>
              <p className="mb-0 font-weight-bold">{paceText}</p>
              <p className="mb-0 text-muted">{scheduleText}</p>
            </div>
          </div>
        </Row>
      </div>

      {!isModalView && (
        <div className="tabs d-flex align-items-center pl-5.5 pr-0">
          <Button
            variant="primary"
            className="ml-auto rounded-0 py-3 px-5.5 "
            onClick={handleViewClick}
          >
            {formatMessage(messages.view)}
          </Button>
        </div>
      )}

      <div className="py-3">
        <section id="about">
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: aboutHtml }} />
        </section>
      </div>
    </>
  );
};

CourseDetailContent.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string.isRequired,
    shortDescription: PropTypes.string,
    endDate: PropTypes.string,
    duration: PropTypes.string,
    selfPaced: PropTypes.bool,
    courseImageAssetPath: PropTypes.string,
    description: PropTypes.string,
    org: PropTypes.string,
  }).isRequired,
  isModalView: PropTypes.bool,
  onClose: PropTypes.func,
  learningPathTitle: PropTypes.string,
};

const CourseDetailPage = ({
  isModalView = false,
  onClose,
  courseKey: propCourseKey,
  learningPathTitle,
}) => {
  const { formatMessage } = useIntl();
  const { courseKey: urlCourseKey } = useParams();
  const courseKey = propCourseKey || urlCourseKey;

  const {
    data: course,
    isLoading,
    error,
  } = useCourseDetail(courseKey);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>{formatMessage(messages.errorLoadingCourse)}</Alert.Heading>
        <p>{error.message}</p>
        <Link to="/">{formatMessage(messages.returnToDashboard)}</Link>
      </Alert>
    );
  }

  if (!course) {
    return (
      <Alert variant="info">
        <Alert.Heading>{formatMessage(messages.courseNotFound)}</Alert.Heading>
        <p>{formatMessage(messages.couldNotFindCourse)}</p>
        <Link to="/">{formatMessage(messages.returnToDashboard)}</Link>
      </Alert>
    );
  }

  const courseWithFallbacks = {
    ...course,
    shortDescription: course.shortDescription || '',
    description: course.description || course.shortDescription || '',
    duration: course.duration || '',
  };

  return (
    <div className="detail-page course-detail-page">
      <CourseDetailContent
        course={courseWithFallbacks}
        isModalView={isModalView}
        onClose={onClose}
        learningPathTitle={learningPathTitle}
      />
    </div>
  );
};

CourseDetailPage.propTypes = {
  isModalView: PropTypes.bool,
  onClose: PropTypes.func,
  courseKey: PropTypes.string,
  learningPathTitle: PropTypes.string,
};

export default CourseDetailPage;
