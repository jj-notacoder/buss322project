"use client";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, Check, ChevronRight, Home, X, type LucideIcon } from "lucide-react";
import type { Member } from "@/domain/model";
import { useStore } from "./provider";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-symbol">
        <Home size={25} strokeWidth={1.7} />
        <span />
      </span>
      <span>
        family<span className="brand-space">space</span>
        <i />
      </span>
    </span>
  );
}
export function Avatar({
  person,
  size = "normal",
}: {
  person?: Member;
  size?: "small" | "normal" | "large";
}) {
  const image =
    person?.avatar ??
    (["Maya", "Daniel", "Nora"].includes(person?.name ?? "")
      ? `/images/${person!.name.toLowerCase()}.jpg`
      : undefined);
  return (
    <span
      role="img"
      className={`avatar avatar-${size} ${person?.color ?? "sage"}`}
      aria-label={person?.name ?? "Family"}
    >
      {image ? (
        <img src={image} alt="" width={64} height={64} />
      ) : (
        (person?.initials ?? "FS")
      )}
    </span>
  );
}
export function Button({
  children,
  icon: Icon,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {Icon && <Icon size={18} />}
      <span>{children}</span>
    </button>
  );
}
export function IconButton({
  label,
  icon: Icon,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      <Icon size={20} />
    </button>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  onKeyDown,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}) {
  const previous = useRef<HTMLElement | null>(null);
  const descriptionId = useId();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          className={`modal ${wide ? "modal-wide" : ""}`}
          aria-describedby={description ? descriptionId : undefined}
          onOpenAutoFocus={() => {
            previous.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            previous.current?.focus();
          }}
        >
          <div className="modal-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label="Close dialog" icon={X} />
            </Dialog.Close>
          </div>
          {description && (
            <Dialog.Description id={descriptionId} className="muted">
              {description}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  children,
  danger = false,
  label = "Confirm",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<unknown> | void;
  title: string;
  children: ReactNode;
  danger?: boolean;
  label?: string;
}) {
  const [working, setWorking] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p>{children}</p>
      <div className="dialog-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          disabled={working}
          onClick={async () => {
            setWorking(true);
            try {
              await onConfirm();
              onClose();
            } catch {
            } finally {
              setWorking(false);
            }
          }}
        >
          {working ? "Saving…" : label}
        </Button>
      </div>
    </Modal>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Back({
  href = "/app/feed",
  label = "Back to feed",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link href={href} className="back-link">
      <ArrowLeft size={17} />
      {label}
    </Link>
  );
}
export function Empty({
  icon: Icon = Home,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={28} strokeWidth={1.5} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-row ${disabled ? "disabled" : ""}`}>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "teal" | "amber";
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
export function PersonPicker({
  selected,
  onChange,
  exclude = [],
  allowed,
  legend = "Share with",
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  exclude?: string[];
  allowed?: string[];
  legend?: string;
}) {
  const { state } = useStore();
  return (
    <fieldset className="people-picker">
      <legend>{legend}</legend>
      {state?.members
        .filter(
          (m) =>
            m.active && !exclude.includes(m.id) && (!allowed || allowed.includes(m.id)),
        )
        .map((m) => (
          <label key={m.id} className={selected.includes(m.id) ? "chosen" : ""}>
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, m.id]
                    : selected.filter((id) => id !== m.id),
                )
              }
            />
            <Avatar person={m} size="small" />
            <span>
              {m.name}
              <small>{m.label}</small>
            </span>
            <span className="check-indicator">
              {selected.includes(m.id) && <Check size={15} />}
            </span>
          </label>
        ))}
    </fieldset>
  );
}
export function PhotoView({
  url,
  blobId,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  url: string;
  blobId?: string;
  alt: string;
}) {
  const { repository } = useStore();
  const [src, setSrc] = useState(blobId ? "" : url);
  useEffect(() => {
    if (!blobId) return;
    let object = "";
    let alive = true;
    void repository.getPhoto(blobId).then((blob) => {
      if (blob && alive) {
        object = URL.createObjectURL(blob);
        setSrc(object);
      }
    });
    return () => {
      alive = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [blobId, repository]);
  return src ? (
    <img src={src} alt={alt} {...props} />
  ) : (
    <div className="photo-loading">Loading photo…</div>
  );
}
export function RowLink({
  href,
  icon: Icon,
  title,
  description,
  children,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Link className="row-link" href={href}>
      <span className="row-icon">
        <Icon size={20} />
      </span>
      <span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      {children}
      <ChevronRight size={18} />
    </Link>
  );
}
