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
 * @returns {string|null} Absolute http(s) URL to the certificate, or null when the value
 * cannot be parsed or uses another protocol (such as `javascript:`).
 */
export const buildCertificateUrl = (downloadUrl) => {
  try {
    const url = new URL(downloadUrl, getConfig().LMS_BASE_URL);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export const buildMarketingSiteCourseUrl = (courseId) => {
  const marketingSiteBase = getConfig().MARKETING_SITE_BASE_URL;
  return `${marketingSiteBase}/${courseId}`;
};
