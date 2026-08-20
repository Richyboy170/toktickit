import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ApiError,
  CreateTicketInput,
  ReferenceItem,
  RequestedPriority,
  Ticket,
  createTicket,
  getCategories,
  getRelatedSystems,
  uploadAttachment,
} from "../api.js";
import { validateSelectedFiles } from "../attachment-validation.js";
import { useRequester } from "../requester-context.js";

interface FormValues {
  categoryId: string;
  relatedSystemId: string;
  summary: string;
  requestedPriority: RequestedPriority | "";
  description: string;
}

const EMPTY_FORM: FormValues = { categoryId: "", relatedSystemId: "", summary: "", requestedPriority: "", description: "" };

function newSubmissionToken(): string {
  return globalThis.crypto.randomUUID();
}

export function CreateTicket() {
  const { requester } = useRequester();
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [systems, setSystems] = useState<ReferenceItem[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [created, setCreated] = useState<Ticket | null>(null);
  const [failedUploads, setFailedUploads] = useState<string[]>([]);
  const [submissionToken, setSubmissionToken] = useState(newSubmissionToken);

  async function loadReferences() {
    setLoadState("loading");
    try {
      const [nextCategories, nextSystems] = await Promise.all([getCategories(), getRelatedSystems()]);
      setCategories(nextCategories);
      setSystems(nextSystems);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => { void loadReferences(); }, []);

  const canSubmit = useMemo(() => loadState === "ready" && !submitting, [loadState, submitting]);

  function update(name: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  }

  function validateForm(): Record<string, string> {
    const errors: Record<string, string> = {};
    const summary = values.summary.trim();
    const description = values.description.trim();
    if (!values.categoryId) errors.categoryId = "Select a Category.";
    if (!values.relatedSystemId) errors.relatedSystemId = "Select a Related System.";
    if (summary.length < 5 || summary.length > 120) errors.summary = "Summary must be 5-120 characters.";
    if (!values.requestedPriority) errors.requestedPriority = "Select a Requested Priority.";
    if (description.length < 10 || description.length > 5000) errors.description = "Description must be 10-5000 characters.";
    return errors;
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const checked = validateSelectedFiles(selected, files.length);
    setFiles((current) => [...current, ...checked.valid]);
    setFileErrors(checked.errors);
    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!requester) return;
    const errors = validateForm();
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setFailedUploads([]);
    try {
      const input: CreateTicketInput = {
        categoryId: Number(values.categoryId),
        relatedSystemId: Number(values.relatedSystemId),
        summary: values.summary.trim(),
        requestedPriority: values.requestedPriority as RequestedPriority,
        description: values.description.trim(),
        submissionToken,
      };
      const result = await createTicket(requester.id, input);
      setCreated(result.ticket);

      const failed: string[] = [];
      for (const file of files) {
        try { await uploadAttachment(requester.id, result.ticket.id, file); }
        catch { failed.push(file.name); }
      }
      setFailedUploads(failed);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fields ?? {});
      } else setFormError("Unable to create the Ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function clearForm() {
    if ((Object.values(values).some(Boolean) || files.length > 0) && !window.confirm("Clear all entered Ticket information?")) return;
    setValues(EMPTY_FORM);
    setFiles([]);
    setFileErrors([]);
    setFieldErrors({});
    setFormError("");
    setCreated(null);
    setSubmissionToken(newSubmissionToken());
  }

  if (created) {
    return (
      <section className="page-card success-panel" aria-labelledby="create-success-title">
        <p className="eyebrow">Ticket created</p>
        <h1 id="create-success-title">{created.ticketNumber}</h1>
        <p>Your Ticket was saved with status <strong>New</strong>.</p>
        {failedUploads.length > 0 && (
          <div className="notice notice--warning" role="alert">
            The Ticket was created, but these files did not upload: {failedUploads.join(", ")}. Open the Ticket to retry.
          </div>
        )}
        <div className="action-row">
          <Link className="button button--primary button-link" to={`/tickets/${created.id}`}>View Ticket</Link>
          <button className="button button--secondary" type="button" onClick={clearForm}>Create Another</button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-card" aria-labelledby="create-ticket-title">
      <div className="page-heading"><div><p className="eyebrow">Requester workspace</p><h1 id="create-ticket-title">Create Ticket</h1><p className="muted">Describe the problem and provide supporting evidence.</p></div></div>
      {loadState === "loading" && <p role="status" className="state-message">Loading Categories and Related Systems…</p>}
      {loadState === "error" && <div role="alert" className="state-message state-message--error"><p>Unable to load Ticket reference data.</p><button type="button" className="button button--secondary" onClick={loadReferences}>Retry</button></div>}
      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={!canSubmit}>
          <legend className="sr-only">Ticket information</legend>
          <div className="form-grid form-grid--three">
            <ReadOnlyField label="Ticket Number" value="Generated after submission" />
            <ReadOnlyField label="Ticket Date" value="Set after submission" />
            <ReadOnlyField label="Requester" value={requester?.name ?? ""} />
          </div>
          <div className="form-grid form-grid--three section-gap">
            <SelectField label="Category" name="categoryId" value={values.categoryId} error={fieldErrors.categoryId} onChange={update} options={categories} />
            <SelectField label="Related System" name="relatedSystemId" value={values.relatedSystemId} error={fieldErrors.relatedSystemId} onChange={update} options={systems} />
            <div className="field"><RequiredLabel htmlFor="requestedPriority">Requested Priority</RequiredLabel><select id="requestedPriority" value={values.requestedPriority} onChange={(e) => update("requestedPriority", e.target.value)} aria-invalid={!!fieldErrors.requestedPriority} aria-describedby={fieldErrors.requestedPriority ? "requestedPriority-error" : undefined}><option value="">Select priority</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select><FieldError id="requestedPriority-error" message={fieldErrors.requestedPriority} /></div>
          </div>
          <div className="field section-gap"><RequiredLabel htmlFor="summary">Ticket Summary</RequiredLabel><input id="summary" value={values.summary} maxLength={120} onChange={(e) => update("summary", e.target.value)} aria-invalid={!!fieldErrors.summary} aria-describedby={fieldErrors.summary ? "summary-error" : "summary-help"} /><small id="summary-help" className="muted">5-120 characters</small><FieldError id="summary-error" message={fieldErrors.summary} /></div>
          <div className="field section-gap"><RequiredLabel htmlFor="description">Description</RequiredLabel><textarea id="description" value={values.description} maxLength={5000} onChange={(e) => update("description", e.target.value)} aria-invalid={!!fieldErrors.description} aria-describedby={fieldErrors.description ? "description-error" : "description-help"} /><small id="description-help" className="muted">10-5000 characters</small><FieldError id="description-error" message={fieldErrors.description} /></div>
          <div className="attachment-picker section-gap"><label htmlFor="attachments">Attachments <span className="optional">Optional</span></label><p className="muted" id="attachment-help">JPG, PNG, WEBP, or PDF; 5 MB each; maximum five.</p><input id="attachments" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple onChange={handleFiles} aria-describedby="attachment-help" />
            {fileErrors.length > 0 && <ul className="file-errors" role="alert">{fileErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
            {files.length > 0 && <ul className="selected-files">{files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name} <small>({Math.ceil(file.size / 1024)} KB)</small></span><button type="button" className="button button--tertiary button--compact" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove {file.name}</button></li>)}</ul>}
          </div>
        </fieldset>
        {formError && <div className="state-message state-message--error section-gap" role="alert">{formError}</div>}
        <div className="action-row section-gap"><button className="button button--primary" type="submit" disabled={!canSubmit}>{submitting ? "Submitting ticket…" : "Submit Ticket"}</button><button className="button button--secondary" type="button" onClick={clearForm} disabled={submitting}>Clear Form</button></div>
      </form>
    </section>
  );
}

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: string }) { return <label htmlFor={htmlFor}>{children} <span className="required" aria-hidden="true">*</span><span className="sr-only"> required</span></label>; }
function FieldError({ id, message }: { id: string; message?: string }) { return message ? <p className="field-error" id={id}>{message}</p> : null; }
function ReadOnlyField({ label, value }: { label: string; value: string }) { return <div className="field"><label>{label}</label><div className="readonly-field" aria-readonly="true">{value}</div></div>; }
function SelectField({ label, name, value, error, onChange, options }: { label: string; name: "categoryId" | "relatedSystemId"; value: string; error?: string; onChange: (name: keyof FormValues, value: string) => void; options: ReferenceItem[] }) { return <div className="field"><RequiredLabel htmlFor={name}>{label}</RequiredLabel><select id={name} value={value} onChange={(e) => onChange(name, e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined}><option value="">Select {label}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select><FieldError id={`${name}-error`} message={error} /></div>; }
