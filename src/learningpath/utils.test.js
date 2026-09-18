import { CATALOG_ENROLLMENT_API_ERROR, getCatalogEnrollmentErrorMessage } from './utils';
import messages from './message';

// Returning the message id makes it clear which message was chosen.
const formatMessage = (message) => message.id;

describe('getCatalogEnrollmentErrorMessage', () => {
  it('translates user_limit_reached', () => {
    const response = { data: { code: CATALOG_ENROLLMENT_API_ERROR.USER_LIMIT_REACHED, detail: 'No seats' } };

    expect(getCatalogEnrollmentErrorMessage(response, formatMessage)).toBe(messages.userLimitReached.id);
  });

  it('translates catalog_unavailable', () => {
    const response = { data: { code: CATALOG_ENROLLMENT_API_ERROR.CATALOG_UNAVAILABLE, detail: 'Inactive' } };

    expect(getCatalogEnrollmentErrorMessage(response, formatMessage)).toBe(messages.catalogUnavailable.id);
  });

  it('falls back to the generic action message for an unknown code, ignoring the untranslated detail', () => {
    const response = { data: { code: 'invalid', detail: 'Some backend text' } };

    expect(getCatalogEnrollmentErrorMessage(response, formatMessage)).toBe(messages.genericErrorAction.id);
  });

  it('falls back to the generic action message when there is no code', () => {
    const response = { data: { detail: 'Some backend text' } };

    expect(getCatalogEnrollmentErrorMessage(response, formatMessage)).toBe(messages.genericErrorAction.id);
  });

  it.each([undefined, null, {}])('falls back to the generic action message when response is %p (network error)', (response) => {
    expect(getCatalogEnrollmentErrorMessage(response, formatMessage)).toBe(messages.genericErrorAction.id);
  });

  it('keeps the codes in sync with the backend default_code values', () => {
    expect(CATALOG_ENROLLMENT_API_ERROR).toEqual({
      USER_LIMIT_REACHED: 'user_limit_reached',
      CATALOG_UNAVAILABLE: 'catalog_unavailable',
    });
  });
});
