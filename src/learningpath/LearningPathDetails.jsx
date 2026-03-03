import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Row, Spinner, Nav, Icon, ModalLayer, Button, Chip, Card, Collapsible, Col,
} from '@openedx/paragon';
import {
  Person,
  Award,
  Calendar,
  ChevronLeft,
  BookOpen,
  Check,
} from '@openedx/paragon/icons';
import {
  useLearningPathDetail, useCoursesByIds, useEnrollLearningPath, useOrganizations,
} from './data/queries';
import CourseDetailPage from './CourseDetails';
import DataSharingAuthorizationModal from './DataSharingAuthorizationModal';
import { CoursesWithProgressList } from './progress';
import { useScreenSize } from '../hooks/useScreenSize';
import { buildCourseAboutUrl } from './utils';  

const LearningPathDetailPage = () => {
  const { isSmall } = useScreenSize();
  const { org, key } = useParams();
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

  const handleDoNotShare = () => {
    setIsModalOpen(false);
  };

  const handleAllowAndContinue = async () => {
    if (detail && !detail.enrollmentDate) {
      setEnrolling(true);
      setIsModalOpen(false);
      try {
        await enrollMutation.mutateAsync(key);
        setLocalStatus('accepted');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Enrollment failed:', error);
      } finally {
        setActiveTab('courses');
        setEnrolling(false);
      }
    }
  };

  const courseIds = useMemo(() => (detail && detail.steps ? detail.steps.map(step => step.courseKey) : []), [detail]);

  const {
    data: coursesForPath,
    isLoading: loadingCourses,
    error: coursesError,
  } = useCoursesByIds(courseIds);

  const enrollMutation = useEnrollLearningPath();

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

  // TODO: Retrieve this from the backend.
  const { data: organizations = {} } = useOrganizations();

  const orgData = useMemo(
    () => ({
      name: organizations[org]?.name || org,
      logo: organizations[org]?.logo,
    }),
    [organizations, org],
  );

  const status = (localStatus || detail?.status || 'self enrollment').toLowerCase();
  const isEnrolledInLearningPath = status === 'accepted';
  let statusVariant = "pending";
  let statusAltText = "Self Enrollment";

  switch (status) {
    case 'sent':
      statusVariant = 'pending';
      statusAltText = "Pending Invitation";
      break;
    case 'accepted':
      statusVariant = 'accepted';
      statusAltText = "Active";
      break;
    default:
      break;
  }

  let content;
  if (loadingDetail || loadingCourses) {
    content = (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  } else if (detailError || !detail) {
    content = (
      <div className="p-4">
        <p>Failed to load detail</p>
        <Link to="/">
          <Icon src={ChevronLeft} />
          <span>Back to My Catalogs</span>
        </Link>
      </div>
    );
  } else {
    const {
      name,
      image,
      subtitle,
      duration,
      timeCommitment,
      requiredSkills,
      description,
      enrollmentDate,
    } = detail;

  const detailSection = (
    <div className="hero px-4 px-md-6 pt-4">
      <div className="hero-inner mx-auto">
        <div className="mb-4">
          <Link
            to="/"
            className="d-flex align-items-center text-decoration-none"
          >
            <Icon src={ChevronLeft} className="mr-2" />
            <span className="font-weight-bold">
              Back to My Catalogs
            </span>
          </Link>
        </div>

        <Card
          orientation={isSmall ? 'vertical' : 'horizontal'}
          className="w-100"
        >
          <Card.ImageCap
            src={image}
            srcAlt={`${name} catalog image`}
            logoSrc={orgData?.logo}
            logoAlt={`${orgData?.name} logo`}
          />

          <Card.Body className="px-4 px-md-5 py-4 py-md-5">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center">
              <div className="flex-grow-1 mr-lg-4">
                <Card.Section className="pt-1 pb-2">
                  <h1 className="mb-2">
                    {name}
                  </h1>
                  <div
                    className="text-muted mb-3"
                    dangerouslySetInnerHTML={{
                      __html: detail?.partner?.name || orgData?.name || '',
                    }}
                  />
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
                        className="border-0 mb-2"
                      >
                        {detail.courses} courses
                      </Chip>
                    )}
                  </div>
                </Card.Section>
              </div>

              {status !== 'accepted' && (
                <div className="mt-3 mt-lg-0 d-flex w-100 w-lg-auto justify-content-stretch justify-content-lg-end">
                  <Button
                    size="md"
                    className="w-100 w-lg-auto text-nowrap d-flex align-items-center justify-content-center"
                    onClick={handleEnrollClick}
                    disabled={enrolling}
                  >
                    {(() => {
                        if (enrolling) return 'Enrolling...';
                        if (enrollmentDate) return 'Enrolled';
                        if (status === 'sent') return 'Accept the invitation';
                        return "Self Enrollment"
                      })()}
                    <Icon src={Check} className="ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>

        <Row className="my-4 mx-0 hero-info lp-hero-info gy-3">
          {accessUntilDate && (
            <Col xs={12} sm={6} md="auto" className="d-flex">
              <Icon src={AccessTimeFilled} className="mr-3 mt-1" />
              <div>
                <p className="mb-0 font-weight-bold">
                  {accessUntilDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="mb-0 text-muted">Access ends</p>
              </div>
            </Col>
          )}

          <Col xs={12} sm={6} md="auto" className="d-flex">
            <Icon src={Award} className="mr-3 mt-1" />
            <div>
              <p className="mb-0 font-weight-bold">Certificate</p>
              <p className="mb-0 text-muted">
                Courses include certification
              </p>
            </div>
          </Col>

          <Col xs={12} sm={6} md="auto" className="d-flex">
            <Icon src={Calendar} className="mr-3 mt-1" />
            <div>
              <p className="mb-0 font-weight-bold">
                {duration || 'Duration not available'}
              </p>
              <p className="mb-0 text-muted">
                {timeCommitment || 'Duration'}
              </p>
            </div>
          </Col>

          <Col xs={12} sm={6} md="auto" className="d-flex">
            <Icon src={Person} className="mr-3 mt-1" />
            <div>
              <p className="mb-0 font-weight-bold">Self-paced</p>
              <p className="mb-0 text-muted">
                Progress at your own speed
              </p>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );

    content = (
      <div className="detail-page learning-path-detail-page">
        {detailSection}
        <div className="py-3 lp-info">
          {isSmall ? (
            <div className="mobile-content px-3">
              <Collapsible
                title="Courses"
                open={openCollapsible === 'courses'}
                onToggle={() => handleCollapsibleToggle('courses')}
                className="mb-2"
              >
                <section id="courses">
                  {!loadingCourses && !coursesError && (!coursesForPath || coursesForPath.length === 0) && (
                    <p>No sub-courses found in this learning path.</p>
                  )}
                  {!loadingCourses && !coursesError && coursesForPath && coursesForPath.length > 0 && (
                    <CoursesWithProgressList
                      courses={coursesForPath}
                      learningPathSteps={detail?.steps}
                      learningPathId={key}
                      enrollmentDateInLearningPath={enrollmentDate}
                      onCourseClick={handleCourseViewButton}
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
                    <p>No sub-courses found in this learning path.</p>
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
