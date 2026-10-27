import { buildCertificateUrl } from '../utils';

/**
 * Calculates the completion status based on completion percentage
 * @param {number} completion - Completion percentage (0-1)
 * @returns {Object} Object containing status and percent
 */
export const calculateCompletionStatus = (completion) => {
  const percent = completion || 0;
  let status = 'In progress';
  if (percent <= 0.0) {
    status = 'Not started';
  } else if (percent >= 1.0) {
    status = 'Completed';
  }
  return { status, percent };
};

/**
 * Adds completion status to a course
 * @param {Object} course - Course object
 * @param {Object} completionsMap - Map of course IDs to completion data
 * @param {string} courseId - Course ID
 * @returns {Object} Course object with completion status
 */
export const addCompletionStatus = (course, completionsMap, courseId) => {
  const completion = completionsMap[courseId]?.percent || 0;
  const { status, percent } = calculateCompletionStatus(completion);
  return {
    ...course,
    status,
    percent,
  };
};

/**
 * Creates a completions map from completions data
 * @param {Array} completions - Array of completion data
 * @returns {Object} Map of item keys to completion data
 */
export const createCompletionsMap = (completions) => {
  const completionsMap = {};
  completions?.forEach?.(item => {
    completionsMap[item.courseKey] = item.completion;
  });
  return completionsMap;
};

/**
 * Creates a map of course keys to learning path data
 * @param {Array} learningPaths - Array of learning path data
 * @returns {Object} Map of course keys to an array of learning path objects with name and key
 */
export const createCourseToLearningPathsMap = (learningPaths) => {
  const courseToLearningPathsMap = {};

  if (!learningPaths || !Array.isArray(learningPaths)) {
    return courseToLearningPathsMap;
  }

  learningPaths.forEach(path => {
    if (path.steps && Array.isArray(path.steps)) {
      path.steps.forEach(step => {
        if (!courseToLearningPathsMap[step.courseKey]) {
          courseToLearningPathsMap[step.courseKey] = [];
        }

        courseToLearningPathsMap[step.courseKey].push({
          name: path.displayName,
          key: path.key,
        });
      });
    }
  });

  return courseToLearningPathsMap;
};

/**
 * Adds learning path data to a course
 * @param {Object} course - Course object
 * @param {Object} courseToLearningPathMap - Map of course keys to an array of learning path objects with name and key
 * @returns {Object} Course object with learning path data
 */
export const addLearningPaths = (course, courseToLearningPathMap) => ({
  ...course,
  learningPaths: courseToLearningPathMap[course.id],
});

/**
 * Certificate statuses the LMS treats as passed (`CertificateStatuses.PASSED_STATUSES`),
 * the ones openedx-corporate counts as certified in `partner_catalog/services/certificates.py`.
 */
export const CERTIFICATE_STATUS = Object.freeze({
  DOWNLOADABLE: 'downloadable',
  GENERATING: 'generating',
});

/**
 * Finds the learner's certificate for a course in the certificates API response.
 * Course keys are compared case-insensitively, as MySQL does in the LMS, because a
 * certificate can keep a different casing than the catalog course key.
 * @param {Array} certificates - Certificates returned by the certificates API
 * @param {string} courseId - Course ID
 * @returns {Object|null} The certificate status and absolute URL, or null when there is
 * no certificate that is available or being generated
 */
export const findCourseCertificate = (certificates, courseId) => {
  if (!courseId || !Array.isArray(certificates)) {
    return null;
  }
  const courseKey = courseId.toLowerCase();
  const certificate = certificates.find(cert => cert.courseId?.toLowerCase() === courseKey);

  switch (certificate?.status) {
    case CERTIFICATE_STATUS.GENERATING:
      return { status: certificate.status, url: null };
    case CERTIFICATE_STATUS.DOWNLOADABLE: {
      // Without a usable URL there is nothing to open, so the card falls back to the course progress.
      const url = certificate.downloadUrl ? buildCertificateUrl(certificate.downloadUrl) : null;
      return url ? { status: certificate.status, url } : null;
    }
    default:
      return null;
  }
};
