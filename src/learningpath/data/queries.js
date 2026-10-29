import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import * as api from './api';
import {
  addCompletionStatus,
  addLearningPaths,
  CERTIFICATE_STATUS,
  createCompletionsMap,
  createCourseToLearningPathsMap,
  findCourseCertificate,
} from './dataUtils';

// Query keys
export const QUERY_KEYS = {
  ALL_LEARNING_PATHS: ['learningPaths'],
  LEARNING_PATH_DETAIL: (key) => ['learningPath', key],
  LEARNING_PATH_PROGRESS: (key) => ['learningPathProgress', key],
  LEARNER_DASHBOARD: ['learnerDashboard'],
  COURSE_DETAILS: (courseId) => ['course', courseId],
  COURSE_COMPLETIONS: ['courseCompletions'],
  COURSE_COMPLETION: (courseId) => ['courseCompletion', courseId],
  COURSE_ENROLLMENT_STATUS: (courseId) => ['courseEnrollmentStatus', courseId],
  COURSE_ENROLLMENTS: (courseId) => ['courseEnrollments', courseId],
  ORGANIZATIONS: ['organizations'],
  CERTIFICATES: ['certificates'],
  CATALOG_COURSES: (key) => ['catalogCourses', key],
};

// Stale time configurations
export const STALE_TIMES = {
  LEARNING_PATHS: 5 * 60 * 1000, // 5 minutes
  LEARNING_PATH_DETAIL: 5 * 60 * 1000, // 5 minutes

  COURSES: 5 * 60 * 1000, // 5 minutes
  COURSE_DETAIL: 5 * 60 * 1000, // 5 minutes
  COURSE_ENROLLMENTS: 60 * 1000, // 1 minute
  CATALOG_COURSES: 60 * 1000, // 1 minute

  COMPLETIONS: 60 * 1000, // 1 minute

  ORGANIZATIONS: 60 * 60 * 1000, // 1 hour

  CERTIFICATES: 60 * 1000, // 1 minute
};

// How often the certificates are refetched while one of them is being generated.
export const CERTIFICATE_GENERATING_REFETCH_INTERVAL = 10 * 1000; // 10 seconds
// Refetches after which a card stops waiting for a certificate that is still being generated
// (about 5 minutes), so a certificate stuck in that state does not keep an open page polling.
export const CERTIFICATE_GENERATING_MAX_REFETCHES = 30;
const CERTIFICATE_GENERATING_MAX_WAIT = CERTIFICATE_GENERATING_MAX_REFETCHES * CERTIFICATE_GENERATING_REFETCH_INTERVAL;

// Learning Paths Queries
export const useLearningPaths = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: QUERY_KEYS.ALL_LEARNING_PATHS,
    queryFn: async () => {
      await queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.COURSE_COMPLETIONS,
        queryFn: api.fetchAllCourseCompletions,
      });

      const learningPathList = await api.fetchLearningPaths();

      return learningPathList.map(lp => {
        // Calculate progress based on course completions
        const totalCourses = lp.courses;

        if (totalCourses === 0) {
          return {
            ...lp,
            numCourses: 0,
            maxDate: null,
            percent: 0,
            type: 'learning_path',
          };
        }

        const totalCompletion = 0;

        const progress = totalCompletion / totalCourses;
        const requiredCompletion = lp.requiredCompletion || 0;

        let percent = 0;
        if (requiredCompletion > 0) {
          percent = Math.round((progress / requiredCompletion) * 100);
        } else {
          percent = Math.round(progress * 100);
        }

        return {
          ...lp,
          key: lp.id,
          displayName: lp.name,
          numCourses: totalCourses,
          minDate: null,
          maxDate: null,
          percent,
          type: 'learning_path',
          org: lp.org,
          enrollmentDate: lp.enrollmentDate ? new Date(lp.enrollmentDate) : null,
        };
      });
    },
  });
};

export const useLearningPathDetail = (key) => useQuery({
  queryKey: QUERY_KEYS.LEARNING_PATH_DETAIL(key),
  queryFn: () => api.fetchLearningPathDetail(key),
  enabled: !!key,
});

// Hook for prefetching learning path details and all related data
export const usePrefetchLearningPathDetail = () => {
  const queryClient = useQueryClient();

  return (key) => {
    if (!key) {
      return;
    }

    queryClient.fetchQuery({
      queryKey: QUERY_KEYS.LEARNING_PATH_DETAIL(key),
      queryFn: () => api.fetchLearningPathDetail(key),
      staleTime: STALE_TIMES.LEARNING_PATH_DETAIL,
    })
      .then(learningPathData => {
        if (!learningPathData?.steps || learningPathData.steps.length === 0) {
          return;
        }

        const courseIds = learningPathData.steps.map(step => step.courseKey);

        queryClient.fetchQuery({
          queryKey: QUERY_KEYS.COURSE_COMPLETIONS,
          queryFn: api.fetchAllCourseCompletions,
          staleTime: STALE_TIMES.COMPLETIONS,
        })
          .then(completionsData => {
            const completionsMap = {};
            completionsData?.forEach?.(item => {
              completionsMap[item.courseKey] = item.completion;
            });

            courseIds.forEach(courseId => {
              queryClient.fetchQuery({
                queryKey: QUERY_KEYS.COURSE_DETAILS(courseId),
                queryFn: () => api.fetchCourseDetails(courseId),
                staleTime: STALE_TIMES.COURSE_DETAIL,
              });
            });
          })
          .catch(error => {
            // eslint-disable-next-line no-console
            console.error('Error prefetching course completions:', error);
          });
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        console.error('Error prefetching learning path:', error);
      });
  };
};

// Course Queries
export const useLearnerDashboard = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: QUERY_KEYS.LEARNER_DASHBOARD,
    queryFn: async () => {
      await queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.COURSE_COMPLETIONS,
        queryFn: api.fetchAllCourseCompletions,
      });

      const learningPaths = queryClient.getQueryData(QUERY_KEYS.ALL_LEARNING_PATHS)
        || await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.ALL_LEARNING_PATHS,
          queryFn: api.fetchLearningPaths,
        });

      const completions = queryClient.getQueryData(QUERY_KEYS.COURSE_COMPLETIONS) || {};
      const completionsMap = createCompletionsMap(completions);

      const courseToLearningPathMap = createCourseToLearningPathsMap(learningPaths);

      const dashboardData = await api.fetchLearnerDashboard();
      const processedCourses = dashboardData.courses.map(course => {
        const courseWithCompletion = addCompletionStatus(course, completionsMap, course.id);
        const courseWithLearningPaths = addLearningPaths(courseWithCompletion, courseToLearningPathMap);
        return {
          ...courseWithLearningPaths,
          type: 'course',
          org: course.id ? course.id.match(/course-v1:([^+]+)/)?.[1] : null,
          enrollmentDate: course.enrollmentDate ? new Date(course.enrollmentDate) : null,
        };
      });

      return {
        courses: processedCourses,
        emailConfirmation: dashboardData.emailConfirmation,
        enterpriseDashboard: dashboardData.enterpriseDashboard,
      };
    },
  });
};

export const useCourseCompletions = () => useQuery({
  queryKey: QUERY_KEYS.COURSE_COMPLETIONS,
  queryFn: api.fetchAllCourseCompletions,
  staleTime: STALE_TIMES.COMPLETIONS,
});

export const useCoursesByIds = (courseIds) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['coursesByIds', ...(courseIds || [])],
    queryFn: async () => {
      let completionsData = queryClient.getQueryData(QUERY_KEYS.COURSE_COMPLETIONS);
      if (!completionsData) {
        completionsData = await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.COURSE_COMPLETIONS,
          queryFn: api.fetchAllCourseCompletions,
        });
      }

      const completionsMap = createCompletionsMap(completionsData);

      const results = await Promise.all(
        courseIds.map(async (courseId) => {
          const cachedCourseDetail = queryClient.getQueryData(QUERY_KEYS.COURSE_DETAILS(courseId));
          if (cachedCourseDetail) {
            return {
              ...cachedCourseDetail,
              ...addCompletionStatus(cachedCourseDetail, completionsMap, courseId),
              type: 'course',
              org: courseId ? courseId.match(/course-v1:([^+]+)/)?.[1] : null,
            };
          }

          const detail = await api.fetchCourseDetails(courseId);
          queryClient.setQueryData(QUERY_KEYS.COURSE_DETAILS(courseId), {
            ...detail,
            type: 'course',
            org: courseId ? courseId.match(/course-v1:([^+]+)/)?.[1] : null,
          });
          return {
            ...addCompletionStatus(detail, completionsMap, courseId),
            type: 'course',
            org: courseId ? courseId.match(/course-v1:([^+]+)/)?.[1] : null,
          };
        }),
      );
      return results;
    },
    enabled: courseIds && courseIds.length > 0,
  });
};

export const useCourseDetail = (courseKey) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: QUERY_KEYS.COURSE_DETAILS(courseKey),
    queryFn: async () => {
      await queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.COURSE_COMPLETIONS,
        queryFn: api.fetchAllCourseCompletions,
      });

      const completions = queryClient.getQueryData(QUERY_KEYS.COURSE_COMPLETIONS) || {};
      const completionsMap = createCompletionsMap(completions);

      const detail = await api.fetchCourseDetails(courseKey);
      return {
        ...addCompletionStatus(detail, completionsMap, courseKey),
        type: 'course',
        org: courseKey ? courseKey.match(/course-v1:([^+]+)/)?.[1] : null,
      };
    },
    enabled: !!courseKey,
  });
};

// Hook to prefetch course details when hovering
export const usePrefetchCourseDetail = (courseId) => {
  const queryClient = useQueryClient();

  const prefetchCourse = useCallback(() => {
    if (courseId) {
      try {
        queryClient.fetchQuery({
          queryKey: QUERY_KEYS.COURSE_DETAILS(courseId),
          queryFn: () => api.fetchCourseDetails(courseId),
          staleTime: STALE_TIMES.COURSE_DETAIL,
        });

        queryClient.fetchQuery({
          queryKey: QUERY_KEYS.COURSE_COMPLETION(courseId),
          queryFn: () => api.fetchCourseCompletion(courseId),
          staleTime: STALE_TIMES.COMPLETIONS,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error prefetching course data:', error);
      }
    }
  }, [courseId, queryClient]);

  return prefetchCourse;
};

export const useCourseEnrollmentStatus = (courseId) => useQuery({
  queryKey: QUERY_KEYS.COURSE_ENROLLMENT_STATUS(courseId),
  queryFn: () => api.fetchCourseEnrollmentStatus(courseId),
  enabled: !!courseId,
  staleTime: STALE_TIMES.COURSE_ENROLLMENTS,
  refetchOnWindowFocus: false,
});

export const useCatalogCourses = (learningPathId) => useQuery({
  queryKey: QUERY_KEYS.CATALOG_COURSES(learningPathId),
  queryFn: () => api.fetchCatalogCourses(learningPathId),
  enabled: !!learningPathId,
  staleTime: STALE_TIMES.CATALOG_COURSES,
  refetchOnWindowFocus: false,
});

export const useEnrollLearningPath = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.enrollInLearningPath,
    onSuccess: (_, learningPathId) => {
      queryClient.setQueryData(
        QUERY_KEYS.LEARNING_PATH_DETAIL(learningPathId),
        (oldData) => {
          if (oldData) {
            return {
              ...oldData,
              enrollmentDate: Date.now(),
            };
          }
          return oldData;
        },
      );

      queryClient.setQueryData(
        QUERY_KEYS.ALL_LEARNING_PATHS,
        (oldData) => {
          if (!oldData) { return oldData; }
          return oldData.map(path => (path.key === learningPathId
            ? { ...path, enrollmentDate: Date.now() }
            : path));
        },
      );
    },
  });
};

export const useDeclineInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.declineInvitation,
    onSuccess: (_, learningPathId) => {
      queryClient.invalidateQueries(
        QUERY_KEYS.LEARNING_PATH_DETAIL(learningPathId),
      );
    },
  });
};

export const useEnrollCourse = (learningPathId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId) => api.enrollInCourse(learningPathId, courseId),
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COURSE_ENROLLMENT_STATUS(courseId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATALOG_COURSES(learningPathId) });
    },
  });
};

export const useOrganizations = () => useQuery({
  queryKey: QUERY_KEYS.ORGANIZATIONS,
  queryFn: async () => {
    const organizations = await api.fetchOrganizations();

    const organizationsMap = {};
    organizations.forEach(org => {
      organizationsMap[org.shortName] = org;
    });

    return organizationsMap;
  },
  staleTime: STALE_TIMES.ORGANIZATIONS,
});

// Every course card reads its certificate from the same cached list, so a page issues a
// single certificates request whatever the number of courses.
export const useCourseCertificate = (courseId, { enabled = true } = {}) => {
  // When this card first saw its certificate being generated. The wait is measured from here,
  // not with the query's dataUpdateCount, which every fetch of the shared list increments.
  const generatingSince = useRef(null);

  return useQuery({
    queryKey: QUERY_KEYS.CERTIFICATES,
    queryFn: api.fetchCertificates,
    enabled: !!courseId && enabled,
    staleTime: STALE_TIMES.CERTIFICATES,
    select: (certificates) => findCourseCertificate(certificates, courseId),
    // Keep refetching while this card's certificate is being generated, so the card enables
    // without a reload. Cards on the page share the request, and other courses do not trigger it.
    refetchInterval: (query) => {
      const certificate = findCourseCertificate(query.state.data, courseId);
      if (certificate?.status !== CERTIFICATE_STATUS.GENERATING) {
        generatingSince.current = null;
        return false;
      }
      if (generatingSince.current === null) {
        generatingSince.current = Date.now();
      }
      return Date.now() - generatingSince.current < CERTIFICATE_GENERATING_MAX_WAIT
        ? CERTIFICATE_GENERATING_REFETCH_INTERVAL
        : false;
    },
  });
};
