import { getConfig } from '@edx/frontend-platform';

import messages from './message';

/**
 * Builds a URL to the course home page in the learning MFE.
 * @param {string} courseId - The course id.
 * @returns {string} URL to the course home page.
 */
export const buildCourseHomeUrl = (courseId) => {
  const learningMfeBase = getConfig().LEARNING_BASE_URL;
  const trimmedBase = learningMfeBase.replace(/\/$/, '');
  const sanitizedBase = trimmedBase.endsWith('/learning')
    ? trimmedBase
    : `${trimmedBase}/learning`;
  return `${sanitizedBase}/course/${courseId}/home`;
};

export const buildMarketingSiteCourseUrl = (courseId) => {
  const marketingSiteBase = getConfig().MARKETING_SITE_BASE_URL;
  return `${marketingSiteBase}/${courseId}`;
};

export const buildCourseAboutUrl = (courseId) => {
  const lmsBaseUrl = getConfig().LMS_BASE_URL;
  const trimmedBase = lmsBaseUrl.replace(/\/$/, '');
  return `${trimmedBase}/courses/${courseId}/about`;
};

/**
 * Error codes returned in `code` by the catalog enrollment endpoint
 * (POST /partner_catalog/api/v1/catalogs/{id}/enroll/).
 *
 * They mirror `default_code` in openedx-corporate `partner_catalog/exceptions.py`.
 * Only this endpoint can return them: course enrollment and invitation decline
 * return different codes, so do not reuse this mapping for those calls.
 */
export const CATALOG_ENROLLMENT_API_ERROR = Object.freeze({
  USER_LIMIT_REACHED: 'user_limit_reached',
  CATALOG_UNAVAILABLE: 'catalog_unavailable',
});

/**
 * Translated toast text for a failed catalog enrollment.
 * @param {object|undefined} response - Axios error response (undefined on network errors).
 * @param {function} formatMessage - From `useIntl()`.
 * @returns {string}
 */
export const getCatalogEnrollmentErrorMessage = (response, formatMessage) => {
  switch (response?.data?.code) {
    case CATALOG_ENROLLMENT_API_ERROR.USER_LIMIT_REACHED:
      return formatMessage(messages.userLimitReached);
    case CATALOG_ENROLLMENT_API_ERROR.CATALOG_UNAVAILABLE:
      return formatMessage(messages.catalogUnavailable);
    default:
      return formatMessage(messages.genericErrorAction);
  }
};
