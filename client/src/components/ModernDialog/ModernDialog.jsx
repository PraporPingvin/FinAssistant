import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import "./ModernDialog.css";

const iconMap = {
  danger: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

function ModernDialog({
  open,
  title,
  description,
  eyebrow = "Подтверждение",
  variant = "info",
  confirmText = "Продолжить",
  cancelText = "Отмена",
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  onClose,
  loading = false,
  children,
}) {
  const handleClose = onClose || onCancel;
  const Icon = iconMap[variant] || iconMap.info;

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !loading) handleClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, handleClose]);

  if (!open) return null;

  return createPortal(
    <div className="modernDialogOverlay" onMouseDown={() => !loading && handleClose?.()}>
      <div
        className={`modernDialogCard ${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modern-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modernDialogClose" type="button" onClick={handleClose} disabled={loading} aria-label="Закрыть">
          <X size={18} />
        </button>

        <div className="modernDialogGlow" />
        <div className="modernDialogIcon">
          <Icon size={24} />
        </div>

        <span className="modernDialogEyebrow">{eyebrow}</span>
        <h2 id="modern-dialog-title">{title}</h2>
        {description && <p>{description}</p>}
        {children && <div className="modernDialogBody">{children}</div>}

        <div className="modernDialogActions">
          {onCancel && (
            <button className="modernDialogButton secondary" type="button" onClick={onCancel} disabled={loading}>
              {cancelLabel || cancelText}
            </button>
          )}
          {onConfirm && (
            <button className={`modernDialogButton primary ${variant}`} type="button" onClick={onConfirm} disabled={loading}>
              {loading ? "Подождите..." : confirmLabel || confirmText}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ModernDialog;
