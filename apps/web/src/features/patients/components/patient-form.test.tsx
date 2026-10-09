import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

import { PatientForm } from './patient-form';

function setup() {
  const onSubmit = vi.fn();
  render(
    <Dialog open>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Form</DialogTitle>
        <PatientForm submitLabel="Create patient" onSubmit={onSubmit} onCancel={vi.fn()} />
      </DialogContent>
    </Dialog>,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe('PatientForm', () => {
  it('shows an accessible error for every invalid field and does not submit', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Create patient' }));

    for (const label of ['First name', 'Last name', 'Email', 'Phone number', 'Date of birth']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    }
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Email is required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates formats with the shared contract rules', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Phone number'), '555-0132');
    await user.click(screen.getByRole('button', { name: 'Create patient' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText(/Use international format/)).toBeInTheDocument();
  });

  it('submits normalised values', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('First name'), '  Ada ');
    await user.type(screen.getByLabelText('Last name'), 'Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ADA@Example.com');
    await user.type(screen.getByLabelText('Phone number'), '+1 (415) 555-0132');
    await user.type(screen.getByLabelText('Date of birth'), '1990-03-04');
    await user.click(screen.getByRole('button', { name: 'Create patient' }));

    expect(onSubmit).toHaveBeenCalledWith(
      {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phoneNumber: '+14155550132',
        dob: '1990-03-04',
      },
      expect.anything(),
    );
  });
});
