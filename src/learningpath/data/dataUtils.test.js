import { mergeConfig } from '@edx/frontend-platform';

import { findCourseCertificate } from './dataUtils';

mergeConfig({ LMS_BASE_URL: 'http://local.openedx.io' });

const COURSE_ID = 'course-v1:NAU+C1+2026';

const downloadable = (downloadUrl, courseId = COURSE_ID) => [{ courseId, status: 'downloadable', downloadUrl }];

describe('findCourseCertificate', () => {
  it('returns the available certificate of the course with an absolute URL', () => {
    const certificates = [
      ...downloadable('/certificates/c2', 'course-v1:NAU+C2+2026'),
      ...downloadable('/certificates/c1'),
    ];

    expect(findCourseCertificate(certificates, COURSE_ID))
      .toEqual({ status: 'downloadable', url: 'http://local.openedx.io/certificates/c1' });
  });

  it('keeps an absolute certificate URL as is', () => {
    expect(findCourseCertificate(downloadable('https://cdn.example.com/cert.pdf'), COURSE_ID))
      .toEqual({ status: 'downloadable', url: 'https://cdn.example.com/cert.pdf' });
  });

  it('matches course keys regardless of their casing', () => {
    expect(findCourseCertificate(downloadable('/certificates/c1', 'course-v1:nau+c1+2026'), COURSE_ID))
      .toEqual({ status: 'downloadable', url: 'http://local.openedx.io/certificates/c1' });
  });

  it('returns a certificate being generated without a URL', () => {
    const certificates = [{ courseId: COURSE_ID, status: 'generating', downloadUrl: null }];

    expect(findCourseCertificate(certificates, COURSE_ID)).toEqual({ status: 'generating', url: null });
  });

  it.each([
    ['a status that is not passed', [{ courseId: COURSE_ID, status: 'notpassing', downloadUrl: null }]],
    ['an available certificate without a URL', downloadable('')],
    ['a javascript: URL', downloadable('javascript:alert(1)')], // eslint-disable-line no-script-url
    ['a data: URL', downloadable('data:text/html,<script>alert(1)</script>')],
    ['a malformed absolute URL', downloadable('http://')],
    ['no certificate for the course', downloadable('/c2', 'course-v1:NAU+C2+2026')],
    ['no certificates loaded', undefined],
  ])('returns null for %s', (_, certificates) => {
    expect(findCourseCertificate(certificates, COURSE_ID)).toBeNull();
  });
});
