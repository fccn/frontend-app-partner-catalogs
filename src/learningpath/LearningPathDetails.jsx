import React, { useMemo, useState, useEffect } from 'react';
import {
  useParams, Link, useSearchParams, useNavigate,
} from 'react-router-dom';
import {
  Row, Spinner, Icon, ModalLayer, Button, Chip, Card, Collapsible, Col,
  Stack,
  AlertModal,
  ActionRow,
} from '@openedx/paragon';
import {
  Person,
  Award,
  Calendar,
  ChevronLeft,
  BookOpen,
  Check,
  AccessTimeFilled,
} from '@openedx/paragon/icons';
import { useIntl, FormattedDate } from '@edx/frontend-platform/i18n';
import {
  useLearningPathDetail, useCoursesByIds, useEnrollLearningPath, useOrganizations,
  useLearningPaths,
  useDeclineInvitation,
} from './data/queries';
import CourseDetailPage from './CourseDetails';
import DataSharingAuthorizationModal from './DataSharingAuthorizationModal';
import { CoursesWithProgressList } from './progress';
import { useScreenSize } from '../hooks/useScreenSize';
import { buildCourseAboutUrl } from './utils';
import messages from './message';
import { useToast } from '../hooks/useToast';

const LearningPathDetailPage = () => {
  const { formatMessage } = useIntl();
  const { isMedium, isLarge } = useScreenSize();
  const { org, key: catalogId } = useParams();
  const navigate = useNavigate();
  const [queryParams, setQueryParams] = useSearchParams();
  const [selectedCourseKey, setSelectedCourseKey] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [openCollapsible, setOpenCollapsible] = useState(null);
  const [localStatus, setLocalStatus] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  const handleCollapsibleToggle = (collapsibleId) => {
    setOpenCollapsible(openCollapsible === collapsibleId ? null : collapsibleId);
  };

  // Scroll to the top when the component mounts.
  useEffect(() => {
    // Add a timeout to ensure DOM updates are complete.
    const id = setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 10);
    return () => clearTimeout(id);
  }, []);

  const { data: learningPaths, isLoading: loadingLearningPaths } = useLearningPaths();

  const key = learningPaths?.find((lp) => lp.slug === catalogId)?.id;

  const {
    data: detail,
    isLoading: loadingDetail,
    error: detailError,
  } = useLearningPathDetail(key);

  useEffect(() => {
    if (detail && activeTab === null) {
      setActiveTab(detail.enrollmentDate ? 'courses' : 'about');
    }
  }, [detail, activeTab]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpenConfirmationModal, setIsOpenConfirmationModal] = useState(false);

  const enrollMutation = useEnrollLearningPath();
  const { showToast } = useToast();
  const declineInvitationMutation = useDeclineInvitation();

  const handleCloseConfirmationModal = () => setIsOpenConfirmationModal(false);
  const handleCloseGDPRModal = () => setIsModalOpen(false);

  const handleDeclineInvitation = () => {
    declineInvitationMutation.mutate(key, {
      onSuccess: () => {
        handleCloseGDPRModal();
        navigate('/');
      },
      onError: ({ response }) => {
        showToast(response.data.detail);
      },

    });
  };

  const handleDoNotShare = (decline = false) => {
    if (decline) {
      setIsOpenConfirmationModal(true);
    } else {
      handleCloseGDPRModal();
    }
  };

  const handleAllowAndContinue = () => {
    if (detail && !detail.enrollmentDate) {
      setEnrolling(true);
      handleCloseGDPRModal();
      enrollMutation.mutate(key, {
        onSuccess: () => {
          setLocalStatus('accepted');
          setEnrolling(false);
          setActiveTab('courses');
        },
        onError: ({ response }) => {
          showToast(response.data.detail);
          setEnrolling(false);
        },
      });
    }
  };

  const courseIds = useMemo(() => (detail && detail.steps ? detail.steps.map(step => step.courseKey) : []), [detail]);

  const {
    data: coursesForPath,
    isLoading: loadingCourses,
    error: coursesError,
  } = useCoursesByIds(courseIds);

  const accessUntilDate = useMemo(() => {
    if (!coursesForPath) {
      return null;
    }

    let maxDate = null;
    for (const c of coursesForPath) {
      if (c.endDate) {
        const endDateObj = new Date(c.endDate);
        if (!maxDate || endDateObj > maxDate) {
          maxDate = endDateObj;
        }
      }
    }
    return maxDate;
  }, [coursesForPath]);

  // In the details view, open the course details modal.
  const handleCourseViewButton = (courseId) => {
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
    window.open(buildCourseAboutUrl(courseId), '_blank', 'noopener,noreferrer');
  };

  const handleCloseCourseModal = () => {
    setSelectedCourseKey(null);
  };

  const handleEnrollClick = async () => {
    setIsModalOpen(true);
  };
  const status = (localStatus || detail?.status || 'self enrollment').toLowerCase();
  const isEnrolledInLearningPath = status === 'accepted';
  const openParam = queryParams.get('open');

  useEffect(() => {
    if (openParam === 'true' && !isEnrolledInLearningPath) {
      setIsModalOpen(true);
      return;
    }

    handleCloseGDPRModal();

    const params = new URLSearchParams(queryParams);
    params.delete('open');
    setQueryParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openParam, isEnrolledInLearningPath]);

  // TODO: Retrieve this from the backend.
  const { data: organizations = {} } = useOrganizations();

  const orgData = useMemo(
    () => ({
      name: organizations[org]?.name || org,
      logo: organizations[org]?.logo,
    }),
    [organizations, org],
  );

  let statusVariant = 'pending';
  let statusAltText = formatMessage(messages.selfEnrollment);

  switch (status) {
    case 'sent':
      statusVariant = 'pending';
      statusAltText = formatMessage(messages.pendingInvitation);
      break;
    case 'accepted':
      statusVariant = 'accepted';
      statusAltText = formatMessage(messages.activeStatus);
      break;
    default:
      break;
  }

  let content;
  if (loadingDetail || loadingCourses || loadingLearningPaths) {
    content = (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  } else if (detailError || !detail) {
    content = (
      <div className="p-4">
        <p className="text-center">{formatMessage(messages.failedToLoadDetail)}</p>
        <Link to="/">
          <Stack direction="horizontal">
            <Icon src={ChevronLeft} />
            <span>{formatMessage(messages.backToMyCatalogs)}</span>
          </Stack>
        </Link>
      </div>
    );
  } else {
    const {
      name,
      image,
      availableEndDate,
      userLimit,
    } = detail;

    const detailSection = (
      <div className="hero px-4 px-md-6 py-4 bg-light-200">
        <div className="mb-4">
          <Link
            to="/"
            className="d-flex align-items-center text-decoration-none"
          >
            <Icon src={ChevronLeft} className="mr-2" />
            <span>
              {formatMessage(messages.backToMyCatalogs)}
            </span>
          </Link>
        </div>

        <Card
          orientation={isMedium ? 'vertical' : 'horizontal'}
          className="w-100"
        >
          <Card.ImageCap
            src={image}
            srcAlt={`${name} catalog image`}
            logoSrc={orgData?.logo}
            logoAlt={`${orgData?.name} logo`}
          />

          <Card.Body className="px-4 px-md-5 py-2 bg-light-200">
            <Stack direction={isLarge ? 'vertical' : 'horizontal'} gap={4} className="justify-content-between">

              <Card.Section className="pt-1 pb-2">
                <h1 className="mb-2">
                  {name}
                </h1>
                <p className="text-muted mb-3">
                  {detail?.partner?.name || orgData?.name || ''}
                </p>
                <div className="d-flex align-items-center flex-wrap">
                  {statusAltText && (
                  <Chip
                    className={`status-chip status-${statusVariant} mr-2 mb-2 px-4`}
                  >
                    {statusAltText}
                  </Chip>
                  )}

                  {detail?.courses != null && (
                  <Chip
                    iconBefore={BookOpen}
                    variant="light"
                    className="courses-counter border-0 mb-2 bg-gray-100"
                  >
                    {formatMessage(messages.coursesCount, { count: detail.courses })}
                  </Chip>
                  )}
                </div>
              </Card.Section>

              {status !== 'accepted' && (
              <div className="mt-3 mt-lg-0 d-flex w-100 w-lg-auto justify-content-stretch justify-content-lg-end">
                <Button
                  size="md"
                  className="w-100 w-lg-auto text-nowrap d-flex align-items-center justify-content-center"
                  onClick={handleEnrollClick}
                  disabled={enrolling}
                >
                  {(() => {
                    if (enrolling) { return formatMessage(messages.enrolling); }
                    if (status === 'sent') { return formatMessage(messages.acceptInvitationText); }
                    return formatMessage(messages.selfEnrollment);
                  })()}
                  <Icon src={Check} className="ml-2" />
                </Button>
              </div>
              )}
            </Stack>

          </Card.Body>
        </Card>
      </div>
    );

    content = (
      <div className="detail-page learning-path-detail-page">
        {detailSection}

        <Row className="py-5 mx-0 hero-info lp-hero-info gy-3 border-bottom border-gray-100 bg-white">
          {accessUntilDate && (
          <Col xs={12} sm={6} md="auto" className="d-flex">
            <Icon src={AccessTimeFilled} className="mr-3 mt-1" />
            <div>
              <p className="mb-0 font-weight-bold">
                <FormattedDate value={accessUntilDate} dateStyle="medium" />
              </p>
              <p className="mb-0">{formatMessage(messages.accessEnds)}</p>
            </div>
          </Col>
          )}

          <Col xs={12} sm={6} md="auto" className="d-flex align-items-center">
            <Icon src={Award} size="lg" className="mr-3 mt-1" />
            <div>
              <p className="mb-0 font-weight-bold">{formatMessage(messages.certificate)}</p>
              <p className="mb-0">
                {formatMessage(messages.coursesIncludeCertification)}
              </p>
            </div>
          </Col>

          <Col xs={12} sm={6} md="auto" className="d-flex align-items-center">
            <Icon src={Calendar} size="lg" className="mr-3 mt-1" />
            <div>
              <p className="mb-0 font-weight-bold">
                {availableEndDate
                  ? <FormattedDate value={availableEndDate} dateStyle="medium" />
                  : formatMessage(messages.noEndDate)}
              </p>
              <p className="mb-0">
                {formatMessage(messages.enrollmentEndDate)}
              </p>
            </div>
          </Col>

          <Col xs={12} sm={6} md="auto" className="d-flex align-items-center">
            <Icon src={Person} size="lg" className="mr-3 mt-1" />
            <div>
              <p className="mb-0 font-weight-bold">{formatMessage(messages.users, { count: userLimit })}</p>
              <p className="mb-0">
                {formatMessage(messages.maxEnrolledUsers)}
              </p>
            </div>
          </Col>
        </Row>

        <div className="py-3 lp-info">
          {isMedium ? (
            <div className="mobile-content px-3">
              <Collapsible
                title={formatMessage(messages.coursesTitle)}
                open={openCollapsible === 'courses'}
                onToggle={() => handleCollapsibleToggle('courses')}
                className="mb-2"
              >
                <section id="courses">
                  {!loadingCourses && !coursesError && (!coursesForPath || coursesForPath.length === 0) && (
                    <p>{formatMessage(messages.noSubCourses)}</p>
                  )}
                  {!loadingCourses && !coursesError && coursesForPath && coursesForPath.length > 0 && (
                    <CoursesWithProgressList
                      courses={coursesForPath}
                      learningPathSteps={detail?.steps}
                      learningPathId={key}
                      onCourseClick={handleCourseViewButton}
                      isEnrolledInLearningPath={isEnrolledInLearningPath}
                    />
                  )}
                </section>
              </Collapsible>
            </div>
          ) : (
            <div className="desktop-content">
              <div id="courses-section-wrapper">
                <section id="courses">
                  {!loadingCourses && !coursesError && (!coursesForPath || coursesForPath.length === 0) && (
                    <p>{formatMessage(messages.noSubCourses)}</p>
                  )}
                  {!loadingCourses && !coursesError && coursesForPath && coursesForPath.length > 0 && (
                    <CoursesWithProgressList
                      courses={coursesForPath}
                      learningPathSteps={detail?.steps}
                      learningPathId={key}
                      isEnrolledInLearningPath={isEnrolledInLearningPath}
                      onCourseClick={handleCourseViewButton}
                    />
                  )}
                </section>
              </div>
            </div>
          )}

          <DataSharingAuthorizationModal
            isOpen={isModalOpen}
            onClose={handleDoNotShare}
            onAllow={handleAllowAndContinue}
            partnerName={detail.partner.name}
            additionalMessage={detail.authorizationMessage}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertModal
        title={formatMessage(messages.headsUp)}
        isOpen={isOpenConfirmationModal}
        onClose={handleCloseConfirmationModal}
        footerNode={(
          <ActionRow>
            <Button variant="tertiary" onClick={handleCloseConfirmationModal}>
              {formatMessage(messages.cancel)}
            </Button>
            <Button variant="danger" onClick={handleDeclineInvitation}>{formatMessage(messages.confirm)}</Button>
          </ActionRow>
        )}
      >
        <p>
          {formatMessage(messages.declineConfirmationMessage)}
        </p>
      </AlertModal>

      {content}

      {selectedCourseKey && (
        <ModalLayer
          isOpen
          onClose={handleCloseCourseModal}
          className="lp-course-modal-layer"
        >
          <CourseDetailPage
            isModalView
            courseKey={selectedCourseKey}
            onClose={handleCloseCourseModal}
            learningPathTitle={detail?.name}
          />
        </ModalLayer>
      )}
    </>
  );
};

export default LearningPathDetailPage;
