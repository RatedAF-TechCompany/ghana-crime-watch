'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'textarea' | 'url';
  required?: boolean;
  min?: number;
  max: number;
  placeholder?: string;
  /** Prefill from a query-string parameter */
  fromQuery?: string;
};

type Table = 'contact_messages' | 'tips' | 'correction_requests';

export function SubmissionForm({ table, fields, submitLabel, successText }: { table: Table; fields: FieldDef[]; submitLabel: string; successText: string }) {
  const params = useSearchParams();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, (f.fromQuery && params?.get(f.fromQuery)) || ''])),
  );
  const [honeypot, setHoneypot] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    for (const f of fields) {
      const v = values[f.name].trim();
      if (f.required && !v) return setError(`${f.label} is required.`);
      if (v && f.min && v.length < f.min) return setError(`${f.label} must be at least ${f.min} characters.`);
      if (v.length > f.max) return setError(`${f.label} must be under ${f.max} characters.`);
      if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError('Please enter a valid email address.');
    }
    setError(null);
    setState('sending');
    const payload = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim() || null]));
    const { error: err } = await (supabase as any).from(table).insert(payload);
    if (err) {
      setState('error');
      setError('Sorry, we could not send this. Please try again.');
      return;
    }
    setState('done');
  };

  if (state === 'done') {
    return <div className="rounded-md border-l-4 border-primary bg-muted p-5 font-sans text-sm">{successText}</div>;
  }

  return (
    <form onSubmit={submit} className="space-y-4 font-sans" noValidate>
      <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" aria-hidden="true" />
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={f.name}>
            {f.label}
            {!f.required && <span className="ml-1 text-muted-fg">(optional)</span>}
          </Label>
          {f.type === 'textarea' ? (
            <Textarea id={f.name} rows={6} maxLength={f.max} placeholder={f.placeholder} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          ) : (
            <Input id={f.name} type={f.type === 'email' ? 'email' : 'text'} maxLength={f.max} placeholder={f.placeholder} value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
          )}
        </div>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending...' : submitLabel}</Button>
    </form>
  );
}
