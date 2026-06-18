// @vitest-environment happy-dom
/**
 * Reproducción + regresión del bug "el precio rebajado se pone a 0 al guardar".
 *
 * Replica el patrón del ProductEditor: react-hook-form + Radix Tabs + useFieldArray
 * para tallas + el input salePrice con `setValueAs`. Al añadir una talla (re-render
 * del field array) RHF vuelve a pasar el valor del campo numérico por `setValueAs`;
 * si ese valor es `null` (producto sin rebaja) y la guarda solo cubre "",
 * Number(null) === 0 → el precio rebajado se guardaba como 0.
 *
 * El fix es `parseNullableNumber` (cubre "" y null/undefined).
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import * as React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useFieldArray } from "react-hook-form";
import * as Tabs from "@radix-ui/react-tabs";
import { parseNullableNumber } from "@/lib/forms/number";

afterEach(cleanup);

type Values = { salePrice: number | null; sizes: { size: string }[] };

// La guarda VIEJA (con el bug): solo cubre "".
const buggySetValueAs = (v: unknown) => (v === "" ? null : Number(v));

function Editor({
  initialSalePrice,
  onSave,
  setValueAs,
}: {
  initialSalePrice: number | null;
  onSave: (v: Values) => void;
  setValueAs: (v: unknown) => number | null;
}) {
  const { register, handleSubmit, control, watch } = useForm<Values>({
    defaultValues: { salePrice: initialSalePrice, sizes: [{ size: "M" }] },
    mode: "onBlur",
  });
  const sizesArr = useFieldArray({ control, name: "sizes" });
  watch();

  return (
    <form onSubmit={handleSubmit(onSave)}>
      <Tabs.Root defaultValue="precios">
        <Tabs.List>
          <Tabs.Trigger value="general">General</Tabs.Trigger>
          <Tabs.Trigger value="precios">Precios</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="precios">
          <input
            aria-label="salePrice"
            type="number"
            step="0.01"
            {...register("salePrice", { setValueAs })}
          />
          <button type="button" onClick={() => sizesArr.append({ size: "L" })}>
            add size
          </button>
        </Tabs.Content>
      </Tabs.Root>
      <button type="submit">save</button>
    </form>
  );
}

describe("repro: producto SIN rebaja, añadir talla y guardar", () => {
  it("guarda VIEJA => REGRESIÓN: el precio rebajado sale 0", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Editor initialSalePrice={null} onSave={onSave} setValueAs={buggySetValueAs} />);
    await user.click(screen.getByText("add size"));
    await user.click(screen.getByText("save"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0].salePrice).toBe(0); // <- el bug
  });

  it("parseNullableNumber (fix) => el precio rebajado queda null", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Editor initialSalePrice={null} onSave={onSave} setValueAs={parseNullableNumber} />);
    await user.click(screen.getByText("add size"));
    await user.click(screen.getByText("save"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0].salePrice).toBe(null); // <- corregido
  });
});

describe("parseNullableNumber", () => {
  it("vacío y nulos => null", () => {
    expect(parseNullableNumber("")).toBe(null);
    expect(parseNullableNumber(null)).toBe(null);
    expect(parseNullableNumber(undefined)).toBe(null);
  });
  it("preserva números (es lo que se rompía al añadir talla)", () => {
    expect(parseNullableNumber("19.99")).toBe(19.99);
    expect(parseNullableNumber(25)).toBe(25);
    expect(parseNullableNumber("0")).toBe(0);
  });
  it("entrada no numérica => null (no NaN)", () => {
    expect(parseNullableNumber("abc")).toBe(null);
  });
});
