import { describe, expect, it } from "vitest";
import { ROUTES, canViewModule, canWriteModule } from "./appRoutes";

describe("MODULE_POLICY", () => {
  it("lets CONTABILIDAD view movements and blocks write", () => {
    expect(canViewModule("CONTABILIDAD", ROUTES.MOVEMENTS)).toBe(true);
    expect(canWriteModule("CONTABILIDAD", ROUTES.MOVEMENTS)).toBe(false);
  });

  it("lets ADMIN and TI write movements", () => {
    expect(canWriteModule("ADMIN", ROUTES.MOVEMENTS)).toBe(true);
    expect(canWriteModule("TI", ROUTES.MOVEMENTS)).toBe(true);
  });

  it("blocks AUDITOR from IT", () => {
    expect(canViewModule("AUDITOR", ROUTES.IT)).toBe(false);
  });

  it("lets all staff view dashboard", () => {
    expect(canViewModule("AUDITOR", ROUTES.DASHBOARD)).toBe(true);
    expect(canViewModule("CONTABILIDAD", ROUTES.DASHBOARD)).toBe(true);
  });
});
