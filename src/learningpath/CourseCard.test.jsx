import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';

import { ToastProvider } from '../hooks/useToast';
import { useEnrollCourse } from './data/queries';
import { CourseCardWithEnrollment } from './CourseCard';

jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('./data/queries', () => ({
  usePrefetchCourseDetail: () => jest.fn(),
  useEnrollCourse: jest.fn(),
  useOrganizations: () => ({ data: {} }),
  useCatalogCourses: () => ({ data: [] }),
  useCourseCertificate: () => ({ data: undefined }),
}));

mergeConfig({ LEARNING_BASE_URL: 'http://apps.local.openedx.io/learning' });

const mockMutate = jest.fn();

const course = {
  id: 'course-v1:NAU+C1+2026',
  name: 'Course 1',
  org: 'NAU',
  status: 'not started',
  courseImageAssetPath: '/asset-v1:NAU+C1+2026+type@asset+block@image.png',
};

const renderCard = () => render(
  <IntlProvider locale="en">
    <ToastProvider>
      <CourseCardWithEnrollment course={course} learningPathId="catalog-1" isEnrolledInLearningPath />
    </ToastProvider>
  </IntlProvider>,
);

// Makes the enroll request fail the way axios does, with the given error body.
const failEnrollmentWith = (response) => {
  mockMutate.mockImplementation((_courseId, { onError }) => onError({ response }));
};

describe('CourseCardWithEnrollment enrollment errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAuthenticatedUser.mockReturnValue({ administrator: false });
    useEnrollCourse.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

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
