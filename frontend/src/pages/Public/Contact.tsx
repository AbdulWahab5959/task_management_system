import { useState } from 'react';
import { api } from '../../services/api';
import { AxiosError } from 'axios';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export default function Contact() {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const response = await api.post('/contact', formData);
      setSuccessMessage(response.data.message);
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      const axiosError = err as AxiosError<{ errors: Record<string, string[]> }>;
      if (axiosError.response?.status === 422 && axiosError.response?.data?.errors) {
        const serverErrors: ValidationErrors = {};
        for (const [field, messages] of Object.entries(axiosError.response.data.errors)) {
          serverErrors[field as keyof ValidationErrors] = (messages as string[])[0];
        }
        setErrors(serverErrors);
      } else {
        setErrors({ name: 'Something went wrong. Please try again later.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <section className="px-6 pb-20 pt-24 sm:pb-28 sm:pt-32">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Message sent!</h1>
            <p className="mt-4 text-lg text-slate-300">
              {successMessage || 'Thank you for reaching out. We will get back to you as soon as possible.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setSuccessMessage('');
                setErrors({});
              }}
              className="mt-8 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-white"
            >
              Send another message
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="px-6 pb-12 pt-24 sm:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Contact us</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Have a question, feedback, or want to learn more? Send us a message and we will get back to you.
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor="contact-name">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
                className={`w-full rounded-xl border px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 ${
                  errors.name ? 'border-red-500' : 'border-white/10'
                } bg-slate-900`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@example.com"
                className={`w-full rounded-xl border px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 ${
                  errors.email ? 'border-red-500' : 'border-white/10'
                } bg-slate-900`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor="contact-subject">
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="How can we help?"
                className={`w-full rounded-xl border px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 ${
                  errors.subject ? 'border-red-500' : 'border-white/10'
                } bg-slate-900`}
              />
              {errors.subject && <p className="mt-1 text-sm text-red-400">{errors.subject}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor="contact-message">
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Tell us more about your inquiry..."
                className={`w-full resize-none rounded-xl border px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 ${
                  errors.message ? 'border-red-500' : 'border-white/10'
                } bg-slate-900`}
              />
              {errors.message && <p className="mt-1 text-sm text-red-400">{errors.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send message'
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}