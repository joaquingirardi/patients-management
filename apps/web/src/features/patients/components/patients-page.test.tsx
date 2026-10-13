import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { db, unavailable } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { currentUrl } from '@/test/next-navigation';
import { renderWithProviders } from '@/test/render';

import { PatientsPage } from './patients-page';

// jsdom applies no CSS, so both the table (md+) and the card list (phones) are in the DOM.
// Interactions are scoped to the table; the card list has its own test below.
const table = () => screen.getByRole('table');
const rowFor = (name: RegExp) => within(table()).getByRole('row', { name });
const openActions = (user: { click: (el: Element) => Promise<void> }, name: string) =>
  user.click(within(table()).getByRole('button', { name: `Actions for ${name}` }));

describe('PatientsPage', () => {
  it('shows a skeleton, then the first page sorted by last name', async () => {
    renderWithProviders(<PatientsPage />);
    expect(screen.getAllByRole('status', { name: 'Loading patients' }).length).toBeGreaterThan(0);

    const rows = await within(await screen.findByRole('table')).findAllByRole('row');
    expect(rows).toHaveLength(11); // header + 10
    expect(rows[1]).toHaveTextContent('Allen, Frances');
    expect(screen.getAllByText('1–10 of 12').length).toBeGreaterThan(0);
  });

  describe('role-based UI', () => {
    it('gives admins create, edit and delete', async () => {
      const { user } = renderWithProviders(<PatientsPage />, { role: 'admin' });
      expect(await screen.findByRole('button', { name: 'New patient' })).toBeInTheDocument();
      await screen.findByRole('table');
      await openActions(user, 'Frances Allen');
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
    });

    it('renders a read-only experience for users', async () => {
      const { user } = renderWithProviders(<PatientsPage />, { role: 'user' });
      await screen.findByRole('table');
      expect(screen.queryByRole('button', { name: 'New patient' })).not.toBeInTheDocument();
      expect(screen.getByText('View only')).toBeInTheDocument();
      await openActions(user, 'Frances Allen');
      expect(screen.getByRole('menuitem', { name: 'View details' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
    });
  });

  it('renders a stacked card list for phones with the same data', async () => {
    renderWithProviders(<PatientsPage />);
    const cards = await screen.findByRole('list', { name: 'Patients' });
    expect(within(cards).getAllByRole('listitem')).toHaveLength(10);
    expect(within(cards).getByRole('link', { name: 'Frances Allen' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/patients\//),
    );
  });

  it('syncs search to the URL (debounced) and shows the empty state', async () => {
    const { user } = renderWithProviders(<PatientsPage />);
    await screen.findByRole('table');
    await user.type(screen.getByRole('searchbox'), 'zzz');

    expect(await screen.findByText('No matching patients')).toBeInTheDocument();
    expect(currentUrl().searchParams.get('search')).toBe('zzz');

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('keeps what the user is typing when its own debounced URL update lands', async () => {
    const { user } = renderWithProviders(<PatientsPage />);
    await screen.findByRole('table');
    const search = screen.getByRole('searchbox');
    await user.type(search, 'Allen ');
    await waitFor(() => expect(currentUrl().searchParams.get('search')).toBe('Allen'));
    expect(search).toHaveValue('Allen '); // the trailing space survives
    await user.type(search, 'F');
    expect(search).toHaveValue('Allen F');
  });

  it('sorts via column headers and exposes the state with aria-sort', async () => {
    const { user } = renderWithProviders(<PatientsPage />);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: /Date of birth/ }));

    await waitFor(() => expect(currentUrl().searchParams.get('sortBy')).toBe('dob'));
    expect(screen.getByRole('columnheader', { name: /Date of birth/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('shows an error state with a support reference, and recovers on retry', async () => {
    server.use(http.get('*/api/proxy/patients', unavailable, { once: true }));
    const { user } = renderWithProviders(<PatientsPage />);

    expect(await screen.findByText("Couldn't load patients")).toBeInTheDocument();
    expect(screen.getByText('req-test-123')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  describe('optimistic updates', () => {
    it('removes a deleted row immediately and rolls back when the server fails', async () => {
      server.use(http.delete('*/api/proxy/patients/:id', unavailable));
      const { user } = renderWithProviders(<PatientsPage />);
      await screen.findByRole('table');

      await openActions(user, 'Frances Allen');
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete patient' }));

      // Rolled back: the row is back and the user is told why, with a retry action.
      expect(await screen.findByText("Couldn't delete Frances Allen")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      expect(rowFor(/Allen, Frances/)).toBeInTheDocument();
      expect(db.patients).toHaveLength(12);
    });

    it('deletes for real when the server agrees', async () => {
      const { user } = renderWithProviders(<PatientsPage />);
      await screen.findByRole('table');

      await openActions(user, 'Frances Allen');
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete patient' }));

      expect(await screen.findByText('Frances Allen was deleted')).toBeInTheDocument();
      expect(
        within(table()).queryByRole('row', { name: /Allen, Frances/ }),
      ).not.toBeInTheDocument();
      expect(db.patients).toHaveLength(11);
    });

    it('shows a created patient instantly as "Saving...", then the confirmed row', async () => {
      let release: () => void = () => undefined;
      server.use(
        http.post(
          '*/api/proxy/patients',
          async () => {
            await new Promise<void>((resolve) => (release = resolve));
          },
          { once: true },
        ),
      );
      const { user } = renderWithProviders(<PatientsPage />);
      await screen.findByRole('table');

      await user.click(screen.getByRole('button', { name: 'New patient' }));
      const dialog = await screen.findByRole('dialog');
      await user.type(within(dialog).getByLabelText('First name'), 'Hedy');
      await user.type(within(dialog).getByLabelText('Last name'), 'Aaronson');
      await user.type(within(dialog).getByLabelText('Email'), 'hedy@example.com');
      await user.type(within(dialog).getByLabelText('Phone number'), '+43 1 234 5678');
      await user.type(within(dialog).getByLabelText('Date of birth'), '1914-11-09');
      await user.click(within(dialog).getByRole('button', { name: 'Create patient' }));

      // The dialog closes and the row is there before the server has answered.
      expect(await within(table()).findByText('Saving…')).toBeInTheDocument();
      expect(rowFor(/Aaronson, Hedy/)).toHaveAttribute('aria-busy', 'true');

      server.resetHandlers();
      release();
    });

    it('rolls back an edit and explains a version conflict', async () => {
      const { user } = renderWithProviders(<PatientsPage />);
      await screen.findByRole('table');
      // Someone else edits Frances Allen in the meantime.
      const target = db.patients.find((p) => p.lastName === 'Allen');
      if (target) target.version = 2;

      await openActions(user, 'Frances Allen');
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
      const dialog = await screen.findByRole('dialog');
      const lastName = within(dialog).getByLabelText('Last name');
      await user.clear(lastName);
      await user.type(lastName, 'Allen-Smith');
      await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

      expect(await screen.findByText('Someone else updated this patient')).toBeInTheDocument();
      expect(rowFor(/Allen, Frances/)).toBeInTheDocument();
      expect(screen.queryByText('Allen-Smith, Frances')).not.toBeInTheDocument();

      // "Review" must load the latest version, so resubmitting now succeeds instead of 409-ing again.
      await user.click(screen.getByRole('button', { name: 'Review' }));
      const review = await screen.findByRole('dialog');
      const reviewLastName = within(review).getByLabelText('Last name');
      await user.clear(reviewLastName);
      await user.type(reviewLastName, 'Allen-Smith');
      await user.click(within(review).getByRole('button', { name: 'Save changes' }));
      expect(await screen.findByText('Changes saved')).toBeInTheDocument();
      expect(db.patients.find((p) => p.id === target?.id)).toMatchObject({
        lastName: 'Allen-Smith',
        version: 3,
      });
    });

    it('rolls back only the failed row when several deletes are in flight', async () => {
      let releaseB: () => void = () => undefined;
      server.use(
        http.delete('*/api/proxy/patients/:id', async ({ params }) => {
          const target = db.patients.find((p) => p.id === params['id']);
          if (target?.lastName === 'Allen') return unavailable();
          await new Promise<void>((resolve) => (releaseB = resolve));
          return HttpResponse.json({ ok: true });
        }),
      );
      const { user } = renderWithProviders(<PatientsPage />);
      await screen.findByRole('table');

      // B (Dijkstra) is pending; then A (Allen) fails.
      await openActions(user, 'Edsger Dijkstra');
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete patient' }));
      await openActions(user, 'Frances Allen');
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete patient' }));

      expect(await screen.findByText("Couldn't delete Frances Allen")).toBeInTheDocument();
      expect(rowFor(/Allen, Frances/)).toBeInTheDocument();
      // A whole-cache snapshot restore would have resurrected B here.
      expect(
        within(table()).queryByRole('row', { name: /Dijkstra, Edsger/ }),
      ).not.toBeInTheDocument();
      releaseB();
    });
  });
});
