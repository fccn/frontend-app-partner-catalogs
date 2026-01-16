import React, {
  useState, useMemo, useEffect, useRef, useCallback,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Spinner, Col, Button, Pagination, Icon, IconButton, SearchField, Image, Bubble, Alert,
} from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform';
import { FilterAlt, FilterList, Search } from '@openedx/paragon/icons';
import { useLearningPaths, useLearnerDashboard, useOrganizations } from './data/queries';
import LearningPathCard from './LearningPathCard';
import FilterPanel from './FilterPanel';
import { useScreenSize } from '../hooks/useScreenSize';
import noResultsSVG from '../assets/no_results.svg';

const Dashboard = () => {
  const { isSmall } = useScreenSize();

  const {
    data: learningPaths,
    isLoading: isLoadingPaths,
    error: pathsError,
  } = useLearningPaths();

  const {
    data: learnerDashboardData,
    isLoading: isLoadingDashboard,
    error: dashboardError,
  } = useLearnerDashboard();

  const {
    data: organizations,
    isLoading: isLoadingOrgs,
  } = useOrganizations();

  const emailConfirmation = learnerDashboardData?.emailConfirmation;
  const enterpriseDashboard = learnerDashboardData?.enterpriseDashboard;

  const isLoading = isLoadingPaths || isLoadingDashboard || isLoadingOrgs;
  const error = pathsError || dashboardError;

  if (error) {
    console.error('Error loading data:', error);
  }

  const items = useMemo(() => {
    if (emailConfirmation?.isNeeded) {
      return [];
    }
    return learningPaths || [];
  }, [learningPaths, emailConfirmation]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const mobileSearchRef = useRef(null);

  const handleMobileSearchClick = () => {
    setShowMobileSearch(true);
    setTimeout(() => {
      if (mobileSearchRef.current) {
        const inputElement = mobileSearchRef.current.querySelector('input');
        if (inputElement) {
          inputElement.focus();
        }
      }
    }, 0);
  };

  const handleMobileSearchBlur = () => {
    if (isSmall && !searchQuery) {
      setShowMobileSearch(false);
    }
  };

  const showFiltersKey = 'lp_dashboard_showFilters';
  const selectedStatusesKey = 'lp_dashboard_selectedStatuses';
  const selectedDateStatusesKey = 'lp_dashboard_selectedDateStatuses';
  const selectedOrgsKey = 'lp_dashboard_selectedOrgs';

  const [showFilters, setShowFilters] = useState(
    () => localStorage.getItem(showFiltersKey) === 'true',
  );
  const [selectedStatuses, setSelectedStatuses] = useState(
    () => JSON.parse(localStorage.getItem(selectedStatusesKey)) || [],
  );
  const [selectedDateStatuses, setSelectedDateStatuses] = useState(
    () => JSON.parse(localStorage.getItem(selectedDateStatusesKey)) || [],
  );
  const [selectedOrgs, setSelectedOrgs] = useState(
    () => JSON.parse(localStorage.getItem(selectedOrgsKey)) || [],
  );

  useEffect(() => {
    localStorage.setItem(showFiltersKey, showFilters.toString());
  }, [showFilters]);
  useEffect(() => {
    localStorage.setItem(selectedStatusesKey, JSON.stringify(selectedStatuses));
  }, [selectedStatuses]);
  useEffect(() => {
    localStorage.setItem(selectedDateStatusesKey, JSON.stringify(selectedDateStatuses));
  }, [selectedDateStatuses]);
  useEffect(() => {
    localStorage.setItem(selectedOrgsKey, JSON.stringify(selectedOrgs));
  }, [selectedOrgs]);

  const handleStatusChange = (status, isChecked) => {
    setSelectedStatuses(prev => {
      if (isChecked) {
        return [...prev, status];
      }
      return prev.filter(s => s !== status);
    });
  };

  const handleDateStatusChange = (dateStatus, isChecked) => {
    setSelectedDateStatuses(prev => {
      if (isChecked) {
        return [...prev, dateStatus];
      }
      return prev.filter(s => s !== dateStatus);
    });
  };

  const handleOrgChange = (org, isChecked) => {
    setSelectedOrgs(prev => {
      if (isChecked) {
        return [...prev, org];
      }
      return prev.filter(s => s !== org);
    });
  };

  const handleClearFilters = () => {
    setSelectedStatuses([]);
    setSelectedDateStatuses([]);
    setSelectedOrgs([]);
  };

  const availableOrganizations = useMemo(() => {
    if (!organizations || !items.length) { return {}; }

    const availableOrgKeys = new Set();
    items.forEach(item => {
      if (item.partner?.slug) {
        availableOrgKeys.add(item.partner.slug);
      }
    });

    const filteredOrgs = {};
    availableOrgKeys.forEach(orgKey => {
      if (organizations[orgKey]) {
        filteredOrgs[orgKey] = organizations[orgKey];
      }
    });

    return filteredOrgs;
  }, [organizations, items]);

  const activeFiltersCount = useMemo(
    () => selectedStatuses.length + selectedDateStatuses.length + selectedOrgs.length,
    [selectedStatuses, selectedDateStatuses, selectedOrgs],
  );

  const getItemDates = (item) => ({
    startDate: item.minDate ? new Date(item.minDate) : null,
    endDate: item.maxDate ? new Date(item.maxDate) : null,
  });

  const getDateStatus = useCallback((item) => {
    const currentDate = new Date();
    const { startDate, endDate } = getItemDates(item);

    if (startDate && startDate > currentDate) {
      return 'Upcoming';
    }
    if (endDate && endDate < currentDate) {
      return 'Ended';
    }
    return 'Open';
  }, []);

  const getEffectiveStatus = useCallback((item) => {
    const rawStatus = item.status;
    const hasStatus = rawStatus !== null && rawStatus !== undefined && rawStatus !== '';
    if (hasStatus) {
      return rawStatus;
    }
    if (item.isSelfEnrollment) {
      return 'Self Enrollment';
    }
    return null;
  }, []);

  const filteredItems = useMemo(
    () => items.filter(item => {
      const effectiveStatus = getEffectiveStatus(item);

      const statusMatch = selectedStatuses.length === 0
        || (effectiveStatus && selectedStatuses.includes(effectiveStatus));

      const dateStatus = getDateStatus(item);
      const dateStatusMatch = selectedDateStatuses.length === 0
        || selectedDateStatuses.includes(dateStatus);

      const orgSlug = item.partner?.slug;
      const orgMatch = selectedOrgs.length === 0
        || (orgSlug && selectedOrgs.includes(orgSlug));

      const searchMatch = searchQuery === ''
        || (item.displayName && item.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
        || (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return statusMatch && dateStatusMatch && orgMatch && searchMatch;
    }),
    [items, selectedStatuses, selectedDateStatuses, selectedOrgs, searchQuery, getDateStatus, getEffectiveStatus],
  );

  const sortedItems = useMemo(() => {
    const statusOrder = {
      sent: 1,
      accepted: 2,
      completed: 3,
      'self enrollment': 4,
    };
    const dateStatusOrder = { Upcoming: 1, Open: 2, Ended: 3 };

    return [...filteredItems].sort((a, b) => {
      const dateStatusA = dateStatusOrder[getDateStatus(a)] || 999;
      const dateStatusB = dateStatusOrder[getDateStatus(b)] || 999;

      if (dateStatusA !== dateStatusB) {
        return dateStatusA - dateStatusB;
      }

      const effStatusA = getEffectiveStatus(a);
      const effStatusB = getEffectiveStatus(b);

      const statusA = effStatusA ? (statusOrder[effStatusA.toLowerCase()] || 999) : 999;
      const statusB = effStatusB ? (statusOrder[effStatusB.toLowerCase()] || 999) : 999;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      const nameA = (a.displayName || a.name || '').toLowerCase();
      const nameB = (b.displayName || b.name || '').toLowerCase();

      return nameA.localeCompare(nameB);
    });
  }, [filteredItems, getDateStatus, getEffectiveStatus]);

  const PAGE_SIZE = getConfig().DASHBOARD_PAGE_SIZE || 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(sortedItems.length / PAGE_SIZE);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedItems.slice(start, start + PAGE_SIZE);
  }, [sortedItems, currentPage, PAGE_SIZE]);

  const showingCount = Math.min(PAGE_SIZE, sortedItems.length - (currentPage - 1) * PAGE_SIZE);
  const totalCount = sortedItems.length;

  useEffect(() => {
    const id = setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
    return () => clearTimeout(id);
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatuses, selectedDateStatuses, selectedOrgs]);

  return (
    <>
      {emailConfirmation?.isNeeded && (
        <Alert className="account-activation m-0 p-2 rounded-0 text-center">
          Activate your account! Check your inbox for an account activation link from {getConfig().SITE_NAME}.
          If you need help, <Link to={`${getConfig().LMS_BASE_URL}/contact`} target="_blank" rel="noopener noreferrer">contact us</Link>.
        </Alert>
      )}
      {!emailConfirmation?.isNeeded && enterpriseDashboard?.isLearnerPortalEnabled && (
        <Alert className="enterprise-dashboard m-0 p-2 rounded-0 text-center">
          You have access to the <b>{enterpriseDashboard.label}</b> dashboard. To access the courses available to you through {enterpriseDashboard.label}, visit the{' '}
          <Link to={`${enterpriseDashboard.url}?utm_source=lms_dashboard_banner`}>
            {enterpriseDashboard.label} dashboard
          </Link>.
        </Alert>
      )}
      <div className="dashboard m-4.5">
        {isLoading ? (
          <div className="d-flex justify-content-center align-items-center vh-100">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <>
            {showFilters && (
              <div className={`filter-panel sidebar position-absolute open ${isSmall ? 'mobile' : ''}`}>
                <FilterPanel
                  selectedStatuses={selectedStatuses}
                  onChangeStatus={handleStatusChange}
                  selectedDateStatuses={selectedDateStatuses}
                  onChangeDateStatus={handleDateStatusChange}
                  selectedOrgs={selectedOrgs}
                  onChangeOrg={handleOrgChange}
                  organizations={availableOrganizations}
                  onClose={() => setShowFilters(false)}
                  isSmall={isSmall}
                  onClearAll={handleClearFilters}
                />
              </div>
            )}
            <div className={`dashboard-content ${showFilters ? 'shifted' : ''} ${showFilters && isSmall ? 'd-none' : ''}`}>
              <h2>My Catalogs</h2>

              <div className="d-flex align-items-center">
                {!isSmall ? (
                  <SearchField
                    onClear={() => setSearchQuery('')}
                    onChange={setSearchQuery}
                    onSubmit={() => {}}
                    value={searchQuery}
                    placeholder="Search"
                  />
                ) : (
                  <div>
                    <IconButton
                      src={Search}
                      iconAs={Icon}
                      variant="secondary"
                      alt="Search"
                      onClick={handleMobileSearchClick}
                    />
                    <div className="d-inline-block">
                      <IconButton
                        src={FilterList}
                        iconAs={Icon}
                        variant="secondary"
                        alt="Filter"
                        onClick={() => setShowFilters(true)}
                      />
                      {activeFiltersCount > 0 && (
                      <Bubble className="position-absolute mt-4 ml-n3.5">
                        {activeFiltersCount}
                      </Bubble>
                      )}
                    </div>
                  </div>
                )}

                {!showFilters && !isSmall && (
                  <Button
                    onClick={() => setShowFilters(true)}
                    variant="outline-primary"
                    className="filter-button"
                  >
                    <Icon src={FilterAlt} /> Filter
                  </Button>
                )}

              </div>

              {isSmall && showMobileSearch && (
                <div className="mobile-search" ref={mobileSearchRef}>
                  <SearchField
                    onClear={() => setSearchQuery('')}
                    onChange={setSearchQuery}
                    onSubmit={() => {}}
                    onBlur={handleMobileSearchBlur}
                    value={searchQuery}
                    placeholder="Search"
                  />
                </div>
              )}

              <div className="small text-muted">
                Showing <b>{showingCount}</b> of <b>{totalCount}</b>
              </div>

              {sortedItems.length === 0 ? (
                <div className="d-flex flex-column align-items-center justify-content-center text-center py-5">
                  <Image src={noResultsSVG} alt="No results" className="mb-4" />
                  <div>
                    <div className="h3 my-2">No matching results</div>
                    <div className="text-muted">Try another search or clear your filters</div>
                  </div>
                </div>
              ) : (
                <>
                  {paginatedItems.map(item => (
                    <Col
                      xs={12}
                      lg={11}
                      xl={10}
                      key={item.id || item.key}
                      className={`dashboard-item p-0 mb-4 ${showFilters ? '' : 'mr-auto mx-auto'}`}
                    >
                      <LearningPathCard
                        learningPath={item}
                        showFilters={showFilters}
                      />
                    </Col>
                  ))}
                  <Pagination
                    paginationLabel="learning items navigation"
                    variant={isSmall ? 'reduced' : 'default'}
                    pageCount={totalPages}
                    currentPage={currentPage}
                    onPageSelect={page => setCurrentPage(page)}
                    className="d-flex justify-content-center mt-4"
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Dashboard;
