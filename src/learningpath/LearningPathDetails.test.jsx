import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { ToastProvider } from '../hooks/useToast';
import { useDeclineInvitation, useEnrollLearningPath } from './data/queries';
import LearningPathDetailPage from './LearningPathDetails';

jest.mock('./data/queries', () => ({
  useLearningPaths: () => ({ data: [{ id: 'catalog-1', slug: 'catalog-slug' }], isLoading: false }),
  useLearningPathDetail: () => ({
    data: {
      name: 'Catalog 1',
      status: 'sent',
      enrollmentDate: null,
      partner: { name: 'Partner 1' },
      steps: [],
      courses: 0,
    },
    isLoading: false,
  }),
  useCoursesByIds: () => ({ data: [], isLoading: false }),
  useOrganizations: () => ({ data: {} }),
  useEnrollLearningPath: jest.fn(),
  useDeclineInvitation: jest.fn(),
}));

jest.mock('./progress', () => ({ CoursesWithProgressList: () => null }));

const mockEnroll = jest.fn();
const mockDecline = jest.fn();

const renderPage = () => render(
  <IntlProvider locale="en">
    <ToastProvider>
      <MemoryRouter initialEntries={['/NAU/catalog/catalog-slug/']}>
        <Routes>
          <Route path="/:org/catalog/:key/*" element={<LearningPathDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  </IntlProvider>,
);

const acceptInvitation = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Accept the invitation' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Allow and Continue' }));
};

describe('LearningPathDetailPage enrollment errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEnrollLearningPath.mockReturnValue({ mutate: mockEnroll });
    useDeclineInvitation.mockReturnValue({ mutate: mockDecline });
  });

  it.each([
    ['user_limit_reached', 'This catalog has no seats available at the moment. Contact your training manager to request access.'],
    ['catalog_unavailable', 'This catalog is not currently available. It can only be accessed within its configured availability period.'],
    ['catalog_enrollment_error', 'We could not perform this action. Please try again later.'],
  ])('shows the translated message for %s when joining the catalog fails', async (code, message) => {
    mockEnroll.mockImplementation((_id, { onError }) => onError({ response: { data: { code, detail: 'Untranslated backend text' } } }));
    renderPage();

    await acceptInvitation();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText('Untranslated backend text')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept the invitation' })).toBeEnabled();
  });

  it('shows the generic action message when joining fails without a response', async () => {
    mockEnroll.mockImplementation((_id, { onError }) => onError({}));
    renderPage();

    await acceptInvitation();

    expect(await screen.findByText('We could not perform this action. Please try again later.')).toBeInTheDocument();
  });

  it('shows the generic action message when declining the invitation fails', async () => {
    mockDecline.mockImplementation((_id, { onError }) => onError({ response: { data: { detail: 'Untranslated backend text' } } }));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Accept the invitation' }));
    fireEvent.click(await screen.findByRole('button', { name: /do not share/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('We could not perform this action. Please try again later.')).toBeInTheDocument();
    expect(screen.queryByText('Untranslated backend text')).not.toBeInTheDocument();
  });
});
