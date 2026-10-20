import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import { ToastProvider } from '../hooks/useToast';
import { useCourseCertificate, useEnrollCourse } from './data/queries';
import { CourseCardWithEnrollment } from './CourseCard';

jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('./data/queries', () => ({
  usePrefetchCourseDetail: () => jest.fn(),
  useEnrollCourse: jest.fn(),
  useOrganizations: () => ({ data: {} }),
  useCatalogCourses: () => ({ data: [] }),
  useCourseCertificate: jest.fn(),
}));

mergeConfig({
  LMS_BASE_URL: 'http://local.openedx.io',
  LEARNING_BASE_URL: 'http://apps.local.openedx.io/learning',
});

const mockMutate = jest.fn();

const course = {
  id: 'course-v1:NAU+C1+2026',
  name: 'Course 1',
  org: 'NAU',
  status: 'not started',
  courseImageAssetPath: '/asset-v1:NAU+C1+2026+type@asset+block@image.png',
};

const renderCard = (overrides = {}) => render(
  <IntlProvider locale="en">
    <ToastProvider>
      <CourseCardWithEnrollment course={{ ...course, ...overrides }} learningPathId="catalog-1" isEnrolledInLearningPath />
    </ToastProvider>
  </IntlProvider>,
);

const availableCertificate = { status: 'downloadable', downloadUrl: '/certificates/abc123' };
const generatingCertificate = { status: 'generating', downloadUrl: null };

// Makes the enroll request fail the way axios does, with the given error body.
const failEnrollmentWith = (response) => {
  mockMutate.mockImplementation((_courseId, { onError }) => onError({ response }));
};

beforeEach(() => {
  jest.clearAllMocks();
  getAuthenticatedUser.mockReturnValue({ administrator: false });
  useEnrollCourse.mockReturnValue({ mutate: mockMutate, isPending: false });
  useCourseCertificate.mockReturnValue({ data: null });
});

describe('CourseCardWithEnrollment enrollment errors', () => {
  it.each([
    ['course_limit_reached', 'There are no seats left for this course in this catalog. Contact your training manager to request access.'],
    ['not_allowed_to_enroll', 'You cannot enroll in this course because you do not have active access to its catalog. Contact your training manager to request access.'],
    ['unsupported_enrollment_mode', 'We could not perform this action. Please try again later.'],
  ])('shows the translated message for %s instead of the backend detail', async (code, message) => {
    failEnrollmentWith({ status: 409, data: { code, detail: 'Untranslated backend text' } });
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'Start Course' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText('Untranslated backend text')).not.toBeInTheDocument();
  });

  it('shows the generic action message when the request never got a response', async () => {
    failEnrollmentWith(undefined);
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'Start Course' }));

    expect(await screen.findByText('We could not perform this action. Please try again later.')).toBeInTheDocument();
  });
});

describe('CourseCard certificate', () => {
  it.each([
    ['in progress', 0.7],
    ['not started', 0],
  ])('shows View Certificate in a new tab when the course is %s', (status, percent) => {
    useCourseCertificate.mockReturnValue({ data: availableCertificate });
    renderCard({ status, percent });

    const link = screen.getByRole('link', { name: 'View Certificate' });
    expect(link).toHaveAttribute('href', 'http://local.openedx.io/certificates/abc123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('opens an absolute certificate URL as is', () => {
    useCourseCertificate.mockReturnValue({ data: { status: 'downloadable', downloadUrl: 'https://cdn.example.com/cert.pdf' } });
    renderCard({ status: 'in progress', percent: 0.7 });

    expect(screen.getByRole('link', { name: 'View Certificate' })).toHaveAttribute('href', 'https://cdn.example.com/cert.pdf');
  });

  it('shows a disabled button while the certificate is being generated', () => {
    useCourseCertificate.mockReturnValue({ data: generatingCertificate });
    renderCard({ status: 'in progress', percent: 0.7 });

    expect(screen.getByRole('button', { name: 'Generating Certificate...' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'View Certificate' })).not.toBeInTheDocument();
  });

  it.each([
    ['in progress', 0.7, 'Continue'],
    ['completed', 1, 'Review Course'],
  ])('shows the Certified state and a way back to the course when the course is %s', (status, percent, courseButton) => {
    useCourseCertificate.mockReturnValue({ data: availableCertificate });
    renderCard({ status, percent });

    expect(screen.getByText('Certified')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: courseButton }));
    expect(mockMutate).toHaveBeenCalledWith(course.id, expect.any(Object));
  });

  it.each([
    ['not started', 0, 'Start Course'],
    ['in progress', 0.7, 'Continue'],
    ['completed', 1, 'Continue'],
  ])('keeps the progress button when there is no certificate and the course is %s', (status, percent, courseButton) => {
    renderCard({ status, percent });

    expect(screen.getByRole('button', { name: courseButton })).toBeEnabled();
    expect(screen.queryByText('View Certificate')).not.toBeInTheDocument();
    expect(screen.queryByText('Certified')).not.toBeInTheDocument();
  });

  it('does not look up the certificate for administrators and sends them to the course', () => {
    const { location } = window;
    delete window.location;
    window.location = { href: '' };
    getAuthenticatedUser.mockReturnValue({ administrator: true });
    renderCard({ status: 'in progress', percent: 0.7 });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(useCourseCertificate).toHaveBeenCalledWith(course.id, { enabled: false });
    expect(window.location.href).toBe('http://apps.local.openedx.io/learning/course/course-v1:NAU+C1+2026/home');
    expect(mockMutate).not.toHaveBeenCalled();
    window.location = location;
  });
});
