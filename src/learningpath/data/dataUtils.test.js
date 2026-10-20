import { findCourseCertificate } from './dataUtils';

const COURSE_ID = 'course-v1:NAU+C1+2026';

describe('findCourseCertificate', () => {
  it('returns the available certificate of the course', () => {
    const certificates = [
      { courseId: 'course-v1:NAU+C2+2026', status: 'downloadable', downloadUrl: '/certificates/c2' },
      { courseId: COURSE_ID, status: 'downloadable', downloadUrl: '/certificates/c1' },
    ];

    expect(findCourseCertificate(certificates, COURSE_ID)).toEqual({ status: 'downloadable', downloadUrl: '/certificates/c1' });
  });

  it('matches course keys regardless of their casing', () => {
    const certificates = [{ courseId: 'course-v1:nau+c1+2026', status: 'downloadable', downloadUrl: '/certificates/c1' }];

    expect(findCourseCertificate(certificates, COURSE_ID)).toEqual({ status: 'downloadable', downloadUrl: '/certificates/c1' });
  });

  it('returns a certificate being generated without a URL', () => {
    const certificates = [{ courseId: COURSE_ID, status: 'generating', downloadUrl: null }];

    expect(findCourseCertificate(certificates, COURSE_ID)).toEqual({ status: 'generating', downloadUrl: null });
  });

  it.each([
    ['a status that is not passed', [{ courseId: COURSE_ID, status: 'notpassing', downloadUrl: null }]],
    ['an available certificate without a URL', [{ courseId: COURSE_ID, status: 'downloadable', downloadUrl: '' }]],
    ['no certificate for the course', [{ courseId: 'course-v1:NAU+C2+2026', status: 'downloadable', downloadUrl: '/c2' }]],
    ['no certificates loaded', undefined],
  ])('returns null for %s', (_, certificates) => {
    expect(findCourseCertificate(certificates, COURSE_ID)).toBeNull();
  });
});
