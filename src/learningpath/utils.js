import { getConfig } from '@edx/frontend-platform';

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

/**
 * Builds the URL of a certificate. The LMS returns a relative path for web certificates
 * and an absolute URL for PDF certificates.
 * @param {string} downloadUrl - The certificate `download_url`.
 * @returns {string} Absolute URL to the certificate.
 */
export const buildCertificateUrl = (downloadUrl) => new URL(downloadUrl, getConfig().LMS_BASE_URL).href;

export const buildMarketingSiteCourseUrl = (courseId) => {
  const marketingSiteBase = getConfig().MARKETING_SITE_BASE_URL;
  return `${marketingSiteBase}/${courseId}`;
};
