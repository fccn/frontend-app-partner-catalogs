import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import {
  useCatalogCourses,
  useCoursesByIds,
  useEnrollCourse,
  QUERY_KEYS,
} from './queries';

jest.mock('@edx/frontend-platform/auth', () => ({
  getAuthenticatedHttpClient: jest.fn(),
  getAuthenticatedUser: jest.fn(() => ({ username: 'testuser', administrator: false })),
}));

jest.mock('@edx/frontend-platform', () => ({
  getConfig: jest.fn(() => ({ LMS_BASE_URL: 'http://localhost:8000' })),
  camelCaseObject: jest.fn((obj) => obj),
}));

const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // eslint-disable-next-line react/prop-types
  const Wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
};

beforeEach(() => {
  jest.clearAllMocks();
  getAuthenticatedHttpClient.mockReturnValue(mockHttpClient);
});

describe('useCatalogCourses', () => {
  it('uses CATALOG_COURSES query key, not COURSE_ENROLLMENT_STATUS', async () => {
    const learningPathId = '42';
    const mockCourses = [
      { courseRun: { id: 'course-v1:org+c1+run' }, enrollments: 5 },
      { courseRun: { id: 'course-v1:org+c2+run' }, enrollments: 3 },
    ];
    mockHttpClient.get.mockResolvedValue({ data: { results: mockCourses } });

    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useCatalogCourses(learningPathId), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Data should be stored under CATALOG_COURSES key
    const cachedByCorrectKey = queryClient.getQueryData(QUERY_KEYS.CATALOG_COURSES(learningPathId));
    expect(cachedByCorrectKey).toEqual(mockCourses);

    // Data must NOT be stored under the old wrong key (COURSE_ENROLLMENT_STATUS)
    const cachedByWrongKey = queryClient.getQueryData(QUERY_KEYS.COURSE_ENROLLMENT_STATUS(learningPathId));
    expect(cachedByWrongKey).toBeUndefined();
  });

  it('fetches catalog courses from the correct API endpoint', async () => {
    const learningPathId = '7';
    mockHttpClient.get.mockResolvedValue({ data: { results: [] } });

    const { Wrapper } = createWrapper();
    renderHook(() => useCatalogCourses(learningPathId), { wrapper: Wrapper });

    await waitFor(() => expect(mockHttpClient.get).toHaveBeenCalledTimes(1));

    const calledUrl = mockHttpClient.get.mock.calls[0][0].toString();
    expect(calledUrl).toContain(`/partner_catalog/api/v1/catalogs/${learningPathId}/courses/`);
  });

  it('is disabled when learningPathId is falsy', () => {
    mockHttpClient.get.mockResolvedValue({ data: { results: [] } });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCatalogCourses(null), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });
});

describe('useEnrollCourse', () => {
  it('invalidates both COURSE_ENROLLMENT_STATUS and CATALOG_COURSES after successful enrollment', async () => {
    const learningPathId = '42';
    const courseId = 'course-v1:org+c1+run';

    mockHttpClient.post.mockResolvedValue({ data: {} });

    const { Wrapper, queryClient } = createWrapper();

    // Pre-populate both caches so we can verify invalidation
    queryClient.setQueryData(QUERY_KEYS.COURSE_ENROLLMENT_STATUS(courseId), { isEnrolled: false });
    queryClient.setQueryData(QUERY_KEYS.CATALOG_COURSES(learningPathId), [
      { courseRun: { id: courseId }, enrollments: 0 },
    ]);
    queryClient.setQueryData(QUERY_KEYS.CATALOG_COURSES('other-catalog'), []);

    const { result } = renderHook(() => useEnrollCourse(learningPathId), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(courseId);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Both queries should be invalidated (marked stale) after enrollment
    const enrollmentStatusState = queryClient.getQueryState(
      QUERY_KEYS.COURSE_ENROLLMENT_STATUS(courseId),
    );
    const catalogCoursesState = queryClient.getQueryState(
      QUERY_KEYS.CATALOG_COURSES(learningPathId),
    );

    expect(enrollmentStatusState?.isInvalidated).toBe(true);
    expect(catalogCoursesState?.isInvalidated).toBe(true);
    // Only the targeted keys are invalidated, not the whole cache
    expect(
      queryClient.getQueryState(QUERY_KEYS.CATALOG_COURSES('other-catalog'))?.isInvalidated,
    ).toBe(false);
  });

  it('posts to the correct enrollment endpoint', async () => {
    const learningPathId = '42';
    const courseId = 'course-v1:org+c1+run';
    mockHttpClient.post.mockResolvedValue({ data: {} });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useEnrollCourse(learningPathId), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(courseId);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = mockHttpClient.post.mock.calls[0][0].toString();
    expect(calledUrl).toContain(
      `/partner_catalog/api/v1/catalogs/${learningPathId}/courses/${courseId}/enroll/`,
    );
  });
});

describe('useCoursesByIds', () => {
  const learningPathId = 'catalog-uuid';
  const courseA = 'course-v1:org+a+run';
  const courseB = 'course-v1:org+b+run';
  const hiddenCourse = 'course-v1:org+hidden+run';
  const reportUrl = `http://localhost:8000/partner_catalog/api/v1/catalogs/${learningPathId}/course-load-failures/`;

  const notFound = () => Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } });
  const noResponse = () => new Error('Network Error');

  // Answers the completions request and each course request; `failing` maps a course key to the error
  // its request fails with.
  const mockCourseRequests = (failing = {}) => {
    mockHttpClient.get.mockImplementation(async (url) => {
      if (url.includes('/completion-aggregator/')) {
        return { data: { results: [], pagination: {} } };
      }
      const courseKey = decodeURIComponent(url.split('/api/courses/v1/courses/')[1].replace(/\/$/, ''));
      if (failing[courseKey]) {
        throw failing[courseKey];
      }
      return {
        data: {
          course_id: courseKey,
          id: courseKey,
          name: `Name of ${courseKey}`,
          media: { course_image: { uri: '/image.png' } },
        },
      };
    });
  };

  const courseRequests = (courseKey) => mockHttpClient.get.mock.calls
    .filter(([url]) => url.includes(encodeURIComponent(courseKey)));

  // Same retry as the app's query client, to show that a failing course is not requested again.
  const renderCourses = (courseIds) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 0 } } });
    // eslint-disable-next-line react/prop-types
    const Wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(() => useCoursesByIds(courseIds, learningPathId), { wrapper: Wrapper });
  };

  beforeEach(() => {
    mockHttpClient.post.mockResolvedValue({ status: 204 });
  });

  it('returns the courses that load and reports the one that fails, once', async () => {
    mockCourseRequests({ [hiddenCourse]: notFound() });

    const { result } = renderCourses([courseA, hiddenCourse, courseB]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.courses.map((course) => course.id)).toEqual([courseA, courseB]);
    expect(result.current.data.failures).toEqual([{ courseKey: hiddenCourse, status: 404 }]);
    expect(courseRequests(hiddenCourse)).toHaveLength(1);
    expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    expect(mockHttpClient.post).toHaveBeenCalledWith(reportUrl, {
      failures: [{ course_key: hiddenCourse, status: 404 }],
    });
  });

  it('reports every course, with a null status when there was no response, when none loads', async () => {
    mockCourseRequests({ [courseA]: notFound(), [courseB]: noResponse() });

    const { result } = renderCourses([courseA, courseB]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.courses).toEqual([]);
    expect(result.current.data.failures).toEqual([
      { courseKey: courseA, status: 404 },
      { courseKey: courseB, status: null },
    ]);
    expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    expect(mockHttpClient.post).toHaveBeenCalledWith(reportUrl, {
      failures: [{ course_key: courseA, status: 404 }, { course_key: courseB, status: null }],
    });
  });

  it('reports nothing when every course loads', async () => {
    mockCourseRequests();

    const { result } = renderCourses([courseA, courseB]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.courses.map((course) => course.id)).toEqual([courseA, courseB]);
    expect(result.current.data.failures).toEqual([]);
    expect(mockHttpClient.post).not.toHaveBeenCalled();
  });

  it('keeps the courses when the report itself fails', async () => {
    mockCourseRequests({ [hiddenCourse]: notFound() });
    mockHttpClient.post.mockRejectedValue(new Error('Request failed with status code 429'));

    const { result } = renderCourses([courseA, hiddenCourse]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.courses.map((course) => course.id)).toEqual([courseA]);
    expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
  });
});
