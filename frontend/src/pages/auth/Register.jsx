
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import {
  UserPlus,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

export function Register() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    if (fieldErrors[e.target.name]) {
      setFieldErrors({
        ...fieldErrors,
        [e.target.name]: null
      });
    }
  };

  const validateFrontend = () => {
    const errs = {};

    if (!formData.first_name.trim()) {
      errs.first_name = 'First name is required.';
    }

    if (!formData.last_name.trim()) {
      errs.last_name = 'Last name is required.';
    }

    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please provide a valid email address.';
    }

    if (formData.password.length < 8) {
      errs.password =
        'Password must contain at least 8 characters.';
    } else if (
      !/[A-Za-z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password)
    ) {
      errs.password =
        'Password must contain both letters and numbers.';
    }

    if (formData.password !== formData.confirm_password) {
      errs.confirm_password = 'Passwords do not match.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    const frontendErrors = validateFrontend();

    if (Object.keys(frontendErrors).length > 0) {
      setFieldErrors(frontendErrors);
      return;
    }

    const res = await register(formData);

    if (res.success) {
      navigate('/login');
    } else {
      if (typeof res.error === 'object' && res.error !== null) {
        const mappedErrors = {};

        for (const key in res.error) {
          mappedErrors[key] = Array.isArray(res.error[key])
            ? res.error[key][0]
            : res.error[key];
        }

        setFieldErrors(mappedErrors);

        if (mappedErrors.non_field_errors) {
          setGeneralError(mappedErrors.non_field_errors);
        }
      } else {
        setGeneralError(res.error);
      }
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-900 mb-1 text-center">
        Citizen Self-Registration
      </h3>

      <p className="text-xs text-slate-500 mb-6 text-center">
        Register a public account to submit & track rural emergency reports
      </p>

      {generalError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            error={fieldErrors.first_name}
            required
          />

          <Input
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            error={fieldErrors.last_name}
            required
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
          required
          placeholder="e.g. priya.sharma@gmail.com"
        />

        <Input
          label="Phone Number"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          error={fieldErrors.phone_number}
          placeholder="+91-9988776655"
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            helperText="Minimum 8 characters with letters & numbers"
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          name="confirm_password"
          value={formData.confirm_password}
          onChange={handleChange}
          error={fieldErrors.confirm_password}
          required
        />

        <div className="p-3 bg-slate-50 border rounded-xl flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            Public accounts are registered under the{' '}
            <strong>CITIZEN</strong> role. Staff/Worker roles are
            provisioned by system admins.
          </span>
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          isLoading={loading}
          icon={UserPlus}
        >
          Register Citizen Account
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link
          to="/login"
          className="text-xs text-teal-600 font-semibold hover:underline"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}
