import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DemoAccount } from './demo-accounts';
import { LoginForm } from './login-form';

const admin: DemoAccount = {
  label: 'Admin',
  hint: 'Full access',
  email: 'admin@northwind.test',
  password: 'Password123!',
  role: 'admin',
};

describe('LoginForm demo accounts', () => {
  it('fills the form from a demo account button', async () => {
    const user = userEvent.setup();
    render(<LoginForm next={undefined} demoAccounts={[admin]} />);

    await user.click(screen.getByRole('button', { name: /Admin/ }));

    expect(screen.getByLabelText('Email')).toHaveValue('admin@northwind.test');
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveValue('Password123!');
  });

  it('renders no demo section when none are provided (hosted builds)', () => {
    render(<LoginForm next={undefined} demoAccounts={[]} />);

    expect(screen.queryByRole('heading', { name: 'Demo accounts' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
