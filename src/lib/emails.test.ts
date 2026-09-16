import { describe, it, expect, vi, afterEach } from "vitest";

const resendSendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSendMock };
  },
}));

const smtpSendMock = vi.fn();
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: smtpSendMock }) },
}));

import { escapeHtml, reservationApprovedEmail, reservationCreatedEmail } from "./emails";
import { getEmailProvider, getEmailFrom, sendEmail } from "./emails";

afterEach(() => {
  vi.unstubAllEnvs();
  resendSendMock.mockReset();
  smtpSendMock.mockReset();
  resendSendMock.mockResolvedValue({ data: { id: "test-id" }, error: null });
  smtpSendMock.mockResolvedValue({ messageId: "smtp-id" });
});

describe("escapeHtml", () => {
  it("escapa < > & \" '", () => {
    expect(escapeHtml(`<script>alert("x&y")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });
  it("escapa & primero (sin doble escape)", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("templates", () => {
  it("approved: adminNotes con XSS llega escapado", () => {
    const html = reservationApprovedEmail({
      userName: "Ana",
      areaName: "Salón",
      startTime: "hoy",
      endTime: "10:00",
      adminNotes: `<img src=x onerror=alert(1)>`,
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
  it("created: userName/areaName llegan escapados", () => {
    const html = reservationCreatedEmail({
      userName: "<b>Ana</b>",
      areaName: "<i>Salón</i>",
      startTime: "hoy",
      endTime: "10:00",
      reservationId: "abc123",
    });
    expect(html).not.toContain("<b>Ana</b>");
    expect(html).toContain("&lt;b&gt;Ana&lt;/b&gt;");
  });
});

describe("proveedor de email", () => {
  it("smtp gana si hay SMTP_* aunque exista Resend", () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
    vi.stubEnv("SMTP_USER", "a@gmail.com");
    vi.stubEnv("SMTP_PASS", "xxxx");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    expect(getEmailProvider()).toBe("smtp");
  });

  it("resend si no hay SMTP pero sí API key", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    expect(getEmailProvider()).toBe("resend");
  });

  it("none sin credenciales", () => {
    expect(getEmailProvider()).toBe("none");
  });

  it("from usa SMTP_FROM o el usuario SMTP", () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
    vi.stubEnv("SMTP_USER", "a@gmail.com");
    vi.stubEnv("SMTP_PASS", "xxxx");
    expect(getEmailFrom()).toBe("Reservas Condominio <a@gmail.com>");
    vi.stubEnv("SMTP_FROM", "condominio@gmail.com");
    expect(getEmailFrom()).toBe("Reservas Condominio <condominio@gmail.com>");
  });

  it("from usa RESEND_FROM_EMAIL o fallback de pruebas", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    expect(getEmailFrom()).toContain("onboarding@resend.dev");
    vi.stubEnv("RESEND_FROM_EMAIL", "Condominio <hola@midominio.com>");
    expect(getEmailFrom()).toBe("Condominio <hola@midominio.com>");
  });

  it("smtp envía por nodemailer y no toca Resend", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
    vi.stubEnv("SMTP_USER", "a@gmail.com");
    vi.stubEnv("SMTP_PASS", "xxxx");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const result = await sendEmail({ to: "b@c.com", subject: "s", html: "<p>h</p>" });
    expect(result.success).toBe(true);
    expect(smtpSendMock).toHaveBeenCalledOnce();
    expect(smtpSendMock.mock.calls[0][0].from).toContain("a@gmail.com");
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("resend usa el remitente configurado", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "Condominio <hola@midominio.com>");
    await sendEmail({ to: "b@c.com", subject: "s", html: "<p>h</p>" });
    expect(resendSendMock.mock.calls[0][0].from).toBe("Condominio <hola@midominio.com>");
    expect(smtpSendMock).not.toHaveBeenCalled();
  });

  it("sin proveedor retorna error controlado sin enviar", async () => {
    const result = await sendEmail({ to: "b@c.com", subject: "s", html: "<p>h</p>" });
    expect(result.success).toBe(false);
    expect(smtpSendMock).not.toHaveBeenCalled();
    expect(resendSendMock).not.toHaveBeenCalled();
  });
});
