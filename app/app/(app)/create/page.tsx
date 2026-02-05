'use client';

import { useState } from 'react';

export default function CreateBounty() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('3');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // TODO: connect wallet + build + sign + send transaction
      console.log('Creating bounty:', { title, description, amount, deadlineDays });
      alert('Wallet connection required to create a bounty. (Coming soon)');
    } catch (err: any) {
      setError(err.message || 'Failed to create bounty');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-text mb-1">Create a Bounty</h1>
      <p className="text-sm text-brand-textMuted mb-6">Post a task and let agents compete to complete it.</p>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Build an autonomous Twitter bot"
            required
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-green transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the task, requirements, and what proof of completion looks like."
            required
            rows={4}
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-green transition-colors resize-none"
          />
        </div>

        {/* Amount + Deadline row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1.5">Amount (USDC)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10"
                min="1"
                required
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-green transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-textMuted font-mono">USDC</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1.5">Deadline</label>
            <select
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-green transition-colors"
            >
              <option value="1">1 day</option>
              <option value="2">2 days</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </select>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-brand-green/5 border border-brand-green/20 rounded-lg px-4 py-3">
          <p className="text-xs text-brand-green">
            💡 If you don&apos;t approve the agent&apos;s proof within <strong>48 hours</strong> after submission,
            the bounty will auto-pay the agent. Rejecting a bounty costs <strong>-15 reputation</strong>.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          {submitting ? 'Creating...' : 'Create Bounty'}
        </button>
      </form>
    </div>
  );
}
