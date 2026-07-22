import { describe, expect, it } from "vitest";
import { fattoreConversione, unitaCompatibili } from "./unitaMisura";

describe("unitaCompatibili", () => {
  it("considera compatibili le unità di massa tra loro", () => {
    expect(unitaCompatibili("g", "Kg")).toBe(true);
    expect(unitaCompatibili("Kg", "g")).toBe(true);
  });

  it("considera compatibili le unità di volume tra loro", () => {
    expect(unitaCompatibili("mL", "Lt")).toBe(true);
    expect(unitaCompatibili("Lt", "mL")).toBe(true);
  });

  it("considera la stessa unità sempre compatibile", () => {
    expect(unitaCompatibili("Pz", "Pz")).toBe(true);
  });

  it("non considera compatibili massa e volume", () => {
    expect(unitaCompatibili("g", "Lt")).toBe(false);
    expect(unitaCompatibili("Kg", "mL")).toBe(false);
  });

  it("non considera compatibili Pz e Mt con nessun'altra unità", () => {
    expect(unitaCompatibili("Pz", "Kg")).toBe(false);
    expect(unitaCompatibili("Mt", "Lt")).toBe(false);
    expect(unitaCompatibili("Pz", "Mt")).toBe(false);
  });
});

describe("fattoreConversione", () => {
  it("converte correttamente da g a Kg", () => {
    expect(fattoreConversione("g", "Kg")).toBeCloseTo(0.001);
  });

  it("converte correttamente da Kg a g", () => {
    expect(fattoreConversione("Kg", "g")).toBeCloseTo(1000);
  });

  it("converte correttamente da mL a Lt", () => {
    expect(fattoreConversione("mL", "Lt")).toBeCloseTo(0.001);
  });

  it("converte correttamente da Lt a mL", () => {
    expect(fattoreConversione("Lt", "mL")).toBeCloseTo(1000);
  });
});
