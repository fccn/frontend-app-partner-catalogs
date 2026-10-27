import '@testing-library/jest-dom';
import {
  act, render, screen, waitFor, within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getAuthenticatedHttpClient, getAuthenticatedUser } from '@edx/frontend-platform/auth';

import { ToastProvider } from '../../hooks/useToast';
import { CERTIFICATE_GENERATING_MAX_REFETCHES, CERTIFICATE_GENERATING_REFETCH_INTERVAL } from '../data/queries';
import CoursesWithProgressList from './CoursesWithProgressList';

jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedHttpClient: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}));

mergeConfig({
  LMS_BASE_URL: 'http://local.openedx.io',
  LEARNING_BASE_URL: 'http://apps.local.openedx.io/learning',
});

const CERTIFICATES_URL = 'http://local.openedx.io/api/certificates/v0/certificates/learner/';

const buildCourse = (id, status, percent) => ({
  id,
  name: id,
  org: 'NAU',
  courseImageAssetPath: '/asset-v1:NAU+C1+2026+type@asset+block@image.png',
  status,
  percent,
});

const courses = [
  buildCourse('course-v1:NAU+C1+2026', 'In progress', 0.7),
  buildCourse('course-v1:NAU+C2+2026', 'In progress', 0.4),
  buildCourse('course-v1:NAU+C3+2026', 'Not started', 0),
];

const certificate = (courseId, status, downloadUrl = null) => ({
  username: 'learner',
  course_id: courseId,
  status,
  download_url: downloadUrl,
});

const mockGet = jest.fn();

// Answers the certificates request with the given responses, in order, and every other
// request (organizations, catalog courses) with an empty list.
const mockCertificatesResponses = (...responses) => {
  const pending = [...responses];
  mockGet.mockImplementation((url) => {
    if (url !== CERTIFICATES_URL) {
      return Promise.resolve({ data: { results: [] } });
    }
    const response = pending.length > 1 ? pending.shift() : pending[0];
    return response instanceof Error ? Promise.reject(response) : Promise.resolve({ data: response });
  });
};

const certificatesRequests = () => mockGet.mock.calls.filter(([url]) => url === CERTIFICATES_URL);

const renderList = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <IntlProvider locale="en">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CoursesWithProgressList courses={courses} learningPathId="catalog-1" isEnrolledInLearningPath />
        </ToastProvider>
      </QueryClientProvider>
    </IntlProvider>,
  );
};

const card = (courseId) => screen.getByText(courseId).closest('.pgn__card');

beforeEach(() => {
  jest.clearAllMocks();
  getAuthenticatedUser.mockReturnValue({ username: 'learner', administrator: false });
  getAuthenticatedHttpClient.mockReturnValue({ get: mockGet, post: jest.fn() });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CoursesWithProgressList certificates', () => {
  it('issues a single certificates request and matches each certificate to its course', async () => {
    mockCertificatesResponses([
      certificate('course-v1:NAU+OTHER+2026', 'downloadable', '/certificates/other'),
      // A certificate can keep a different casing than the catalog course key.
      certificate('course-v1:nau+c2+2026', 'downloadable', '/certificates/c2'),
      certificate('course-v1:NAU+C3+2026', 'notpassing'),
    ]);
    renderList();

    const link = await within(card('course-v1:NAU+C2+2026')).findByRole('link', { name: 'View Certificate' });
    expect(link).toHaveAttribute('href', 'http://local.openedx.io/certificates/c2');
    expect(within(card('course-v1:NAU+C2+2026')).getByText('Certified')).toBeInTheDocument();

    expect(within(card('course-v1:NAU+C1+2026')).getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(within(card('course-v1:NAU+C3+2026')).getByRole('button', { name: 'Start Course' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View Certificate' })).toHaveLength(1);
    expect(screen.getAllByText('Certified')).toHaveLength(1);

    expect(certificatesRequests()).toHaveLength(1);
  });

  it('enables the certificate once it has been generated, without a reload', async () => {
    jest.useFakeTimers();
    mockCertificatesResponses(
      [certificate('course-v1:NAU+C1+2026', 'generating')],
      [certificate('course-v1:NAU+C1+2026', 'downloadable', '/certificates/c1')],
    );
    renderList();

    expect(await within(card('course-v1:NAU+C1+2026')).findByRole('button', { name: 'Generating Certificate...' })).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(CERTIFICATE_GENERATING_REFETCH_INTERVAL);
    });

    expect(await within(card('course-v1:NAU+C1+2026')).findByRole('link', { name: 'View Certificate' }))
      .toHaveAttribute('href', 'http://local.openedx.io/certificates/c1');
    // The cards share one refetch, not one per course.
    expect(certificatesRequests()).toHaveLength(2);

    await act(async () => {
      jest.advanceTimersByTime(CERTIFICATE_GENERATING_REFETCH_INTERVAL * 3);
    });
    // No certificate is being generated anymore, so it stops refetching.
    expect(certificatesRequests()).toHaveLength(2);
  });

  it('does not refetch for a certificate being generated in a course that is not on the page', async () => {
    jest.useFakeTimers();
    mockCertificatesResponses([certificate('course-v1:NAU+OTHER+2026', 'generating')]);
    renderList();

    await waitFor(() => expect(certificatesRequests()).toHaveLength(1));
    await act(async () => {
      jest.advanceTimersByTime(CERTIFICATE_GENERATING_REFETCH_INTERVAL * 3);
    });

    expect(certificatesRequests()).toHaveLength(1);
  });

  it('stops refetching a certificate that stays in generation', async () => {
    jest.useFakeTimers();
    mockCertificatesResponses([certificate('course-v1:NAU+C1+2026', 'generating')]);
    renderList();

    await waitFor(() => expect(certificatesRequests()).toHaveLength(1));
    for (let i = 0; i < CERTIFICATE_GENERATING_MAX_REFETCHES + 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        jest.advanceTimersByTime(CERTIFICATE_GENERATING_REFETCH_INTERVAL);
      });
    }

    expect(certificatesRequests()).toHaveLength(1 + CERTIFICATE_GENERATING_MAX_REFETCHES);
    expect(within(card('course-v1:NAU+C1+2026')).getByRole('button', { name: 'Generating Certificate...' })).toBeDisabled();
  });

  it('falls back to the progress buttons when the certificates cannot be loaded', async () => {
    mockCertificatesResponses(new Error('Network Error'));
    renderList();

    await waitFor(() => expect(certificatesRequests()).toHaveLength(1));

    expect(within(card('course-v1:NAU+C1+2026')).getByRole('button', { name: 'Continue' })).toBeEnabled();
    expect(within(card('course-v1:NAU+C3+2026')).getByRole('button', { name: 'Start Course' })).toBeEnabled();
    expect(screen.queryByText('View Certificate')).not.toBeInTheDocument();
  });
});
