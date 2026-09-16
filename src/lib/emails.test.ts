import { describe, it, expect, vi, afterEach } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { sendEmail } from "./emails";

afterEach(() => {
  vi.unstubAllEnvs();
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "test-id" }, error: null });
});
import { escapeHtml, reservationApprovedEmail, reservationCreatedEmail } from "./emails";

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

describe("sendEmail remitente", () => {
  it("usa RESEND_FROM_EMAIL cuando está configurado", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "Condominio <hola@midominio.com>");
    await sendEmail({ to: "a@b.com", subject: "s", html: "<p>h</p>" });
    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock.mock.calls[0][0].from).toBe("Condominio <hola@midominio.com>");
  });

  it("cae a onboarding@resend.dev sin RESEND_FROM_EMAIL", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    await sendEmail({ to: "a@b.com", subject: "s", html: "<p>h</p>" });
    expect(sendMock.mock.calls[0][0].from).toContain("onboarding@resend.dev");
  });

  it("sin API key no intenta enviar y retorna error controlado", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendEmail({ to: "a@b.com", subject: "s", html: "<p>h</p>" });
    expect(sendMock).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
