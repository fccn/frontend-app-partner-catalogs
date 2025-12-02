import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Row, Spinner, Nav, Icon, ModalLayer, Button, Chip, Card, Collapsible, Container, Col,
} from '@openedx/paragon';
import {
  Person,
  Award,
  Calendar,
  FormatListBulleted,
  AccessTimeFilled,
  ChevronLeft,
  BookOpen,
  Check,
} from '@openedx/paragon/icons';
import {
  useLearningPathDetail, useCoursesByIds, useEnrollLearningPath, useOrganizations,
} from './data/queries';
import CourseDetailPage from './CourseDetails';
import { CoursesWithProgressList } from './progress';
import { useScreenSize } from '../hooks/useScreenSize';

const LearningPathDetailPage = () => {
  const { isSmall } = useScreenSize();
  const { org, key } = useParams();
  const [selectedCourseKey, setSelectedCourseKey] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [openCollapsible, setOpenCollapsible] = useState(null);

  const [activeTab, setActiveTab] = useState(null);
  const handleTabSelect = (selectedKey) => {
    setActiveTab(selectedKey);
  };

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
    setSelectedCourseKey(courseId);
  };

  const handleCloseCourseModal = () => {
    setSelectedCourseKey(null);
  };

  const handleEnrollClick = async () => {
    if (detail && !detail.enrollmentDate) {
      setEnrolling(true);
      try {
        await enrollMutation.mutateAsync(key);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Enrollment failed:', error);
      } finally {
        setActiveTab('courses');
        setEnrolling(false);
      }
    }
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

  const status = detail?.status?.toLowerCase() || 'Sent';
  let statusVariant = "pending";
  let statusAltText = "Without Invitation";

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
                        className="mr-2 mb-2"
                        variant="success"
                      >
                        {statusAltText}
                      </Chip>
                    )}

                    {detail?.courses != null && (
                      <Chip
                        iconBefore={BookOpen}
                        className="border-0 mb-2"
                      >
                        {detail.courses} courses
                      </Chip>
                    )}
                  </div>
                </Card.Section>
              </div>
              <div className="mt-3 mt-lg-0 d-flex w-100 w-lg-auto justify-content-stretch justify-content-lg-end">
                <Button
                  variant="primary"
                  size="md"
                  className="w-100 w-lg-auto text-nowrap d-flex align-items-center justify-content-center"
                  disabled={enrolling}
                >
                  {enrolling ? 'Accepting…' : 'Accept the invitation'}
                  <Icon src={Check} className="ml-2" />
                </Button>
              </div>
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
  )

  const heroSection = (
      <div className="hero px-4 px-md-6 pt-4">
        <div className="hero-inner mx-auto">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Link to="/" className="d-flex align-items-center back-link">
              <Icon src={ChevronLeft} />
              <span className="ml-1">Back to My Catalogs</span>
            </Link>
          </div>

          <div className="d-flex flex-column flex-md-row align-items-stretch">
            <Card
              orientation={isSmall ? 'vertical' : 'horizontal'}
              className="lp-hero-card flex-grow-1"
            >
              <Card.ImageCap
                src={image}
                srcAlt={`${name} learning path image`}
                logoSrc={orgData.logo}
                logoAlt={`${orgData.name} logo`}
              />

              <Card.Body className="px-4 px-md-5 py-4 py-md-5">
                <Card.Section className="pt-1 pb-2">
                  <h1 className="my-2 my-md-3">{name}</h1>
                  {/* Subtitle / organización */}
                  {/* eslint-disable-next-line react/no-danger */}
                  <div
                    className="text-muted mb-3"
                    dangerouslySetInnerHTML={{
                      __html: detail.partner.name || 'No subtitle available.',
                    }}
                  />
                  <Chip className={`status-chip status-${statusVariant}`}>
                    {statusAltText}
                  </Chip>
                  {detail?.courses !== undefined && detail?.courses !== null && ( 
                    <Chip iconBefore={BookOpen} className="border-0 p-0"> 
                      {detail?.courses} courses 
                    </Chip> 
                  )}
                </Card.Section>
                <Card.Section className="pt-1 pb-2">
                    <Button
                      variant={enrollmentDate ? 'secondary' : 'primary'}
                      style={{ minWidth: '220px' }}
                      size="sm"
                      onClick={handleEnrollClick}
                      disabled={enrolling || !!enrollmentDate}
                    >
                      {(() => {
                        if (enrolling) return 'Enrolling...';
                        if (enrollmentDate) return 'Enrolled';
                        if (status === 'sent') return 'Accept the invitation';
                        return 'Enroll';
                      })()}
                    </Button>
                </Card.Section>
              </Card.Body>
            </Card>
          </div>

          <Row className="my-4 mx-0 hero-info lp-hero-info flex-column flex-md-row align-items-start">
            {accessUntilDate && (
              <div className="d-flex">
                <Icon src={AccessTimeFilled} className="mr-4 mb-3.5" />
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
              </div>
            )}
            <div className="d-flex">
              <Icon src={Award} className="mr-4 mb-3.5" />
              <div>
                <p className="mb-0 font-weight-bold">Certificate</p>
                <p className="mb-0 text-muted">Courses include certification</p>
              </div>
            </div>
            <div className="d-flex">
              <Icon src={Calendar} className="mr-4 mb-3.5" />
              <div>
                <p className="mb-0 font-weight-bold">
                  {duration || 'Duration not available'}
                </p>
                <p className="mb-0 text-muted">
                  {timeCommitment || 'Duration'}
                </p>
              </div>
            </div>
            <div className="d-flex">
              <Icon src={Person} className="mr-4 mb-3.5" />
              <div>
                <p className="mb-0 font-weight-bold">Self-paced</p>
                <p className="mb-0 text-muted">Progress at your own speed</p>
              </div>
            </div>
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
                      enrollmentDateInLearningPath={enrollmentDate}
                      onCourseClick={handleCourseViewButton}
                    />
                  )}
                </section>
              </div>
            </div>
          )}
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
