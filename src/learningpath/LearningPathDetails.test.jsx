import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { ToastProvider } from '../hooks/useToast';
import {
  useCoursesByIds, useDeclineInvitation, useEnrollLearningPath, useLearningPathDetail,
} from './data/queries';
import LearningPathDetailPage from './LearningPathDetails';

jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('./data/queries', () => ({
  useLearningPaths: () => ({ data: [{ id: 'catalog-1', slug: 'catalog-slug' }], isLoading: false }),
  useLearningPathDetail: jest.fn(),
  useCoursesByIds: jest.fn(),
  useOrganizations: () => ({ data: {} }),
  useEnrollLearningPath: jest.fn(),
  useDeclineInvitation: jest.fn(),
}));

// Renders the names of the courses it receives, so the tests can see which cards the page shows.
jest.mock('./progress', () => ({
  CoursesWithProgressList: ({ courses }) => `Course cards: ${courses.map((course) => course.name).join(', ')}`,
}));

const mockEnroll = jest.fn();
const mockDecline = jest.fn();

const catalogDetail = (overrides = {}) => ({
  name: 'Catalog 1',
  status: 'sent',
  enrollmentDate: null,
  partner: { name: 'Partner 1' },
  steps: [],
  courses: 0,
  isManager: false,
  ...overrides,
});

beforeEach(() => {
  getAuthenticatedUser.mockReturnValue({ username: 'learner', administrator: false });
  useLearningPathDetail.mockReturnValue({ data: catalogDetail(), isLoading: false });
  useCoursesByIds.mockReturnValue({ data: undefined, isLoading: false });
});

const renderPage = () => render(
  <IntlProvider locale="en">
    <ToastProvider>
      <MemoryRouter initialEntries={['/NAU/catalog/catalog-slug/']}>
        <Routes>
          <Route path="/:org/catalog/:key/*" element={<LearningPathDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  </IntlProvider>,
);

const acceptInvitation = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Accept the invitation' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Allow and Continue' }));
};

describe('LearningPathDetailPage enrollment errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnrollLearningPath.mockReturnValue({ mutate: mockEnroll });
    useDeclineInvitation.mockReturnValue({ mutate: mockDecline });
  });

  it.each([
    ['user_limit_reached', 'This catalog has no seats available at the moment. Contact your training manager to request access.'],
    ['catalog_unavailable', 'This catalog is not currently available. It can only be accessed within its configured availability period.'],
    ['catalog_enrollment_error', 'We could not perform this action. Please try again later.'],
  ])('shows the translated message for %s when joining the catalog fails', async (code, message) => {
    mockEnroll.mockImplementation((_id, { onError }) => onError({ response: { data: { code, detail: 'Untranslated backend text' } } }));
    renderPage();

    await acceptInvitation();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText('Untranslated backend text')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept the invitation' })).toBeEnabled();
  });

  it('shows the generic action message when joining fails without a response', async () => {
    mockEnroll.mockImplementation((_id, { onError }) => onError({}));
    renderPage();

    await acceptInvitation();

    expect(await screen.findByText('We could not perform this action. Please try again later.')).toBeInTheDocument();
  });

  it('shows the generic action message when declining the invitation fails', async () => {
    mockDecline.mockImplementation((_id, { onError }) => onError({ response: { data: { detail: 'Untranslated backend text' } } }));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Accept the invitation' }));
    fireEvent.click(await screen.findByRole('button', { name: /do not share/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('We could not perform this action. Please try again later.')).toBeInTheDocument();
    expect(screen.queryByText('Untranslated backend text')).not.toBeInTheDocument();
  });
});

describe('LearningPathDetailPage courses that cannot be loaded', () => {
  const courseA = { id: 'course-v1:org+a+run', name: 'Course A', endDate: '2027-01-31T00:00:00Z' };
  const courseB = { id: 'course-v1:org+b+run', name: 'Course B', endDate: '2027-03-31T00:00:00Z' };
  const hiddenCourseKey = 'course-v1:org+hidden+run';
  const otherHiddenCourseKey = 'course-v1:org+hidden2+run';

  const renderCatalog = ({
    courses = [], failures = [], isManager = false, administrator = false, error = null,
  }) => {
    const courseKeys = [...courses.map((course) => course.id), ...failures.map((failure) => failure.courseKey)];
    getAuthenticatedUser.mockReturnValue({ username: 'someone', administrator });
    useLearningPathDetail.mockReturnValue({
      data: catalogDetail({
        status: 'accepted',
        isManager,
        steps: courseKeys.map((courseKey, index) => ({ order: index, courseKey })),
        courses: courseKeys.length,
      }),
      isLoading: false,
    });
    useCoursesByIds.mockReturnValue({
      data: courseKeys.length && !error ? { courses, failures } : undefined,
      isLoading: false,
      error,
    });
    renderPage();
  };

  const notShownMessage = /courses? of this catalog cannot be shown/;
  const allFailedMessage = 'The courses of this catalog could not be loaded.';

  it('asks for the courses with the catalog id, to report the failures', () => {
    renderCatalog({ courses: [courseA], failures: [{ courseKey: hiddenCourseKey, status: 404 }] });

    expect(useCoursesByIds).toHaveBeenLastCalledWith([courseA.id, hiddenCourseKey], 'catalog-1');
  });

  it('shows a learner the courses that loaded, with no message about the one that did not', () => {
    renderCatalog({ courses: [courseA, courseB], failures: [{ courseKey: hiddenCourseKey, status: 404 }] });

    expect(screen.getByText('Course cards: Course A, Course B')).toBeInTheDocument();
    expect(screen.queryByText(notShownMessage)).not.toBeInTheDocument();
    expect(screen.queryByText(hiddenCourseKey)).not.toBeInTheDocument();
    expect(screen.queryByText(allFailedMessage)).not.toBeInTheDocument();
  });

  it.each([
    ['a catalog manager', { isManager: true }],
    ['an administrator', { administrator: true }],
  ])('tells %s which course cannot be shown', (_who, role) => {
    renderCatalog({ courses: [courseA, courseB], failures: [{ courseKey: hiddenCourseKey, status: 404 }], ...role });

    expect(screen.getByText('Course cards: Course A, Course B')).toBeInTheDocument();
    expect(screen.getByText('1 course of this catalog cannot be shown:')).toBeInTheDocument();
    expect(screen.getByText(hiddenCourseKey)).toBeInTheDocument();
    expect(screen.getByText('Learners do not see these courses or this message.')).toBeInTheDocument();
  });

  it('shows everyone a small error, and no retry, when no course loads', () => {
    renderCatalog({
      failures: [{ courseKey: hiddenCourseKey, status: 404 }, { courseKey: otherHiddenCourseKey, status: null }],
    });

    expect(screen.getByText(allFailedMessage)).toBeInTheDocument();
    expect(screen.queryByText(/Course cards/)).not.toBeInTheDocument();
    expect(screen.queryByText('No sub-courses found in this learning path.')).not.toBeInTheDocument();
    expect(screen.queryByText(notShownMessage)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|try again/i })).not.toBeInTheDocument();
  });

  it('also lists the failed courses to a manager when no course loads', () => {
    renderCatalog({
      failures: [{ courseKey: hiddenCourseKey, status: 404 }, { courseKey: otherHiddenCourseKey, status: null }],
      isManager: true,
    });

    expect(screen.getByText(allFailedMessage)).toBeInTheDocument();
    expect(screen.getByText('2 courses of this catalog cannot be shown:')).toBeInTheDocument();
    expect(screen.getByText(hiddenCourseKey)).toBeInTheDocument();
    expect(screen.getByText(otherHiddenCourseKey)).toBeInTheDocument();
  });

  it('shows the small error instead of an empty section when the course list fails as a whole', () => {
    renderCatalog({ courses: [courseA], error: new Error('Network Error') });

    expect(screen.getByText(allFailedMessage)).toBeInTheDocument();
    expect(screen.queryByText('No sub-courses found in this learning path.')).not.toBeInTheDocument();
  });

  it('shows the "no courses" message for a catalog with no courses', () => {
    renderCatalog({});

    expect(screen.getByText('No sub-courses found in this learning path.')).toBeInTheDocument();
    expect(screen.queryByText(allFailedMessage)).not.toBeInTheDocument();
  });

  it('shows every course, no message and the access end date when every course loads', () => {
    renderCatalog({ courses: [courseA, courseB], isManager: true });

    expect(screen.getByText('Course cards: Course A, Course B')).toBeInTheDocument();
    expect(screen.queryByText(notShownMessage)).not.toBeInTheDocument();
    expect(screen.queryByText(allFailedMessage)).not.toBeInTheDocument();
    expect(screen.getByText('Access ends')).toBeInTheDocument();
  });

  it('hides the access end date while a course is missing, as it comes from the courses', () => {
    renderCatalog({ courses: [courseA, courseB], failures: [{ courseKey: hiddenCourseKey, status: 404 }] });

    expect(screen.queryByText('Access ends')).not.toBeInTheDocument();
  });
});
